import { Project, SourceFile, FunctionDeclaration, ArrowFunction, FunctionExpression } from 'ts-morph';
import { parseFile, resetIdCounter, analyzePropsUsage, extractEnhancedContextUsage, buildScopeMap, ParsedComponent, JsxChildInfo, JsxPropBundleInfo } from './file-parser.js';
import type {
  ParseOptions,
  ParseResult,
  StateFlowGraph,
  ComponentNode,
  StateNode,
  StateFlowEdge,
  ContextBoundary,
  PropDrillingPath,
  ParseError,
  ParseWarning,
  ComponentPropMetrics,
  PropUsage,
  ComponentRole,
  PropBundle,
  ContextLeak,
  ContextLeakSeverity,
  PropChain,
  PropRename,
} from '../types.js';
import * as path from 'node:path';
import * as fs from 'node:fs';

interface ParsedComponentData {
  component: ComponentNode;
  stateNodes: StateNode[];
  jsxChildren: JsxChildInfo[];
  functionNode: FunctionDeclaration | ArrowFunction | FunctionExpression;
}

export class ReactParser {
  private project: Project;
  private options: ParseOptions;
  private errors: ParseError[] = [];
  private warnings: ParseWarning[] = [];

  constructor(options: ParseOptions) {
    this.options = {
      drillingThreshold: 3,
      ...options,
    };

    this.project = new Project({
      tsConfigFilePath: this.findTsConfig(),
      skipAddingFilesFromTsConfig: true,
    });
  }

  private findTsConfig(): string | undefined {
    const candidates = [
      path.join(this.options.rootDir, 'tsconfig.json'),
      path.join(this.options.rootDir, 'jsconfig.json'),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }

    return undefined;
  }

  parse(): ParseResult {
    resetIdCounter();
    this.errors = [];
    this.warnings = [];

    const sourceFiles = this.loadSourceFiles();
    const parsedData = this.parseAllFiles(sourceFiles);
    const graph = this.buildGraph(parsedData);

    return {
      graph,
      errors: this.errors,
      warnings: this.warnings,
    };
  }

  private loadSourceFiles(): SourceFile[] {
    const include = this.options.include || ['**/*.tsx', '**/*.jsx', '**/*.ts', '**/*.js'];
    const exclude = this.options.exclude || ['**/node_modules/**', '**/dist/**', '**/*.test.*', '**/*.spec.*'];

    const globs = include.map(pattern => path.join(this.options.rootDir, pattern));

    this.project.addSourceFilesAtPaths(globs);

    const excludePatterns = exclude.map(pattern => {
      // Escape special regex characters except * which we handle specially
      const escaped = pattern
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*\*/g, '{{GLOBSTAR}}')
        .replace(/\*/g, '[^/]*')
        .replace(/\{\{GLOBSTAR\}\}/g, '.*');
      return new RegExp(escaped);
    });

    return this.project.getSourceFiles().filter(sf => {
      const filePath = sf.getFilePath();
      return !excludePatterns.some(pattern => pattern.test(filePath));
    });
  }

  private parseAllFiles(sourceFiles: SourceFile[]): ParsedComponentData[] {
    const allParsed: ParsedComponentData[] = [];

    for (const sourceFile of sourceFiles) {
      try {
        const parsed = parseFile(sourceFile);
        allParsed.push(...parsed);
      } catch (error) {
        this.errors.push({
          filePath: sourceFile.getFilePath(),
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return allParsed;
  }

  private buildGraph(parsedData: ParsedComponentData[]): StateFlowGraph {
    const components = new Map<string, ComponentNode>();
    const stateNodes = new Map<string, StateNode>();
    const edges: StateFlowEdge[] = [];
    const contextBoundaries: ContextBoundary[] = [];

    const componentsByName = new Map<string, ComponentNode>();

    for (const { component, stateNodes: states } of parsedData) {
      components.set(component.id, component);
      componentsByName.set(component.name, component);

      for (const state of states) {
        stateNodes.set(state.id, state);
      }
    }

    // First pass: create edges for direct state passing
    for (const { component, jsxChildren } of parsedData) {
      for (const child of jsxChildren) {
        const childComponent = componentsByName.get(child.componentName);
        if (!childComponent) continue;

        for (const [propName, propValue] of child.props) {
          if (propName === '...spread') continue;

          const sourceState = this.findStateByName(propValue, component, stateNodes);

          if (sourceState) {
            const edge: StateFlowEdge = {
              id: `edge_${edges.length}`,
              from: component.id,
              to: childComponent.id,
              stateId: sourceState.id,
              mechanism: 'props',
              propName,
              hops: 1,
            };
            edges.push(edge);

            // Track that child receives this state via props
            if (!childComponent.stateUsed.some(s => s.id === sourceState.id)) {
              childComponent.stateUsed.push(sourceState);
            }

            const prop = component.props.find(p => p.name === propValue);
            if (prop) {
              prop.passedTo.push(childComponent.name);
            }
          }
        }
      }
    }

    // Second pass: update hop counts for prop drilling detection
    // This traces props through the component hierarchy and updates hop counts
    let changed = true;
    let maxIterations = 10; // Prevent infinite loops

    while (changed && maxIterations > 0) {
      changed = false;
      maxIterations--;

      for (const { component, jsxChildren } of parsedData) {
        for (const child of jsxChildren) {
          const childComponent = componentsByName.get(child.componentName);
          if (!childComponent) continue;

          for (const [propName, propValue] of child.props) {
            if (propName === '...spread') continue;

            // Check if this is a prop being passed through (not state defined here)
            const receivedProp = component.props.find(p => p.name === propValue);
            if (receivedProp && !component.stateProvided.some(s => s.name === propValue)) {
              // This component is passing through a received prop
              // Find any existing edges that deliver state to this component with this prop name
              const incomingEdge = edges.find(
                e => e.to === component.id && e.propName === propValue
              );

              if (incomingEdge) {
                // Find existing outgoing edge for this state
                const existingEdge = edges.find(
                  e => e.from === component.id &&
                       e.to === childComponent.id &&
                       e.stateId === incomingEdge.stateId
                );

                if (existingEdge) {
                  // Update the hop count if the incoming edge has a higher count
                  const newHops = incomingEdge.hops + 1;
                  if (existingEdge.hops < newHops) {
                    existingEdge.hops = newHops;
                    changed = true;
                  }
                } else {
                  // Create new edge
                  const edge: StateFlowEdge = {
                    id: `edge_${edges.length}`,
                    from: component.id,
                    to: childComponent.id,
                    stateId: incomingEdge.stateId,
                    mechanism: 'props',
                    propName,
                    hops: incomingEdge.hops + 1,
                  };
                  edges.push(edge);
                  changed = true;

                  // Track state used by child
                  const state = stateNodes.get(incomingEdge.stateId);
                  if (state && !childComponent.stateUsed.some(s => s.id === state.id)) {
                    childComponent.stateUsed.push(state);
                  }
                }
              }
            }
          }
        }
      }
    }

    // Third pass: create context boundaries and edges
    for (const { component } of parsedData) {
      for (const provider of component.contextProviders) {
        const boundary: ContextBoundary = {
          contextId: provider.contextId,
          contextName: provider.contextName,
          providerComponent: component.id,
          providerFile: component.filePath,
          providerLine: component.line,
          childComponents: [],
        };

        for (const otherComponent of components.values()) {
          if (otherComponent.contextConsumers.includes(provider.contextName)) {
            boundary.childComponents.push(otherComponent.id);

            const edge: StateFlowEdge = {
              id: `edge_${edges.length}`,
              from: component.id,
              to: otherComponent.id,
              stateId: provider.contextId,
              mechanism: 'context',
              hops: 0,
            };
            edges.push(edge);
          }
        }

        contextBoundaries.push(boundary);
      }
    }

    const propDrillingPaths = this.detectPropDrilling(components, edges, stateNodes);

    // Fourth pass: calculate component prop metrics
    const componentMetrics = this.calculateAllComponentMetrics(parsedData);

    // Fifth pass: detect prop bundles
    const bundles = this.detectBundles(parsedData, componentsByName);

    // Sixth pass: detect context leaks
    const contextLeaks = this.detectContextLeaks(parsedData, componentsByName, contextBoundaries);

    // Seventh pass: track prop renames and build prop chains
    const propChains = this.buildPropChains(parsedData, edges, componentsByName);

    return {
      components,
      stateNodes,
      edges,
      contextBoundaries,
      propDrillingPaths,
      componentMetrics,
      bundles,
      contextLeaks,
      propChains,
    };
  }

  private detectBundles(
    parsedData: ParsedComponentData[],
    componentsByName: Map<string, ComponentNode>
  ): PropBundle[] {
    const bundles: PropBundle[] = [];
    let bundleIdCounter = 0;

    for (const { component, jsxChildren } of parsedData) {
      for (const child of jsxChildren) {
        // Check for bundle props in this JSX child
        for (const bundleInfo of child.bundleProps) {
          // Only track bundles with known properties or that look significant
          const isSignificant =
            bundleInfo.isObjectLiteral && bundleInfo.estimatedSize >= 3 ||  // Inline object with 3+ props
            bundleInfo.propName === '...spread';  // Spread is always significant

          if (isSignificant) {
            const bundle: PropBundle = {
              id: `bundle_${++bundleIdCounter}`,
              propName: bundleInfo.propName,
              sourceComponentId: component.id,
              sourceComponentName: component.name,
              estimatedSize: bundleInfo.estimatedSize,
              properties: bundleInfo.properties,
              passedThrough: [],  // Will be populated by tracking
              isObjectLiteral: bundleInfo.isObjectLiteral,
              filePath: component.filePath,
              line: child.line,
            };

            // Track where this bundle flows
            this.trackBundleFlow(bundle, child.componentName, componentsByName, parsedData);

            bundles.push(bundle);

            // Add warning for large bundles
            if (bundleInfo.estimatedSize >= 5) {
              this.warnings.push({
                filePath: component.filePath,
                line: child.line,
                message: `Large prop bundle "${bundleInfo.propName}" with ${bundleInfo.estimatedSize} properties passed to ${child.componentName}`,
                code: 'PROP_BUNDLE',
              });
            }
          }
        }
      }
    }

    return bundles;
  }

  private trackBundleFlow(
    bundle: PropBundle,
    targetComponentName: string,
    componentsByName: Map<string, ComponentNode>,
    parsedData: ParsedComponentData[]
  ): void {
    const visited = new Set<string>();
    const queue: string[] = [targetComponentName];

    while (queue.length > 0) {
      const currentName = queue.shift()!;
      if (visited.has(currentName)) continue;
      visited.add(currentName);

      const component = componentsByName.get(currentName);
      if (!component) continue;

      // Find this component's parsed data to check its JSX children
      const componentData = parsedData.find(d => d.component.name === currentName);
      if (!componentData) continue;

      // Check if this component passes a similar bundle prop to its children
      for (const child of componentData.jsxChildren) {
        // Look for props that match the bundle's prop name (possibly renamed)
        const matchingProps = child.bundleProps.filter(
          bp => bp.propName === bundle.propName ||
                (bp.estimatedSize === -1 && bp.propName.toLowerCase().includes(bundle.propName.toLowerCase().replace(/data|info|value|state/i, '')))
        );

        if (matchingProps.length > 0) {
          // This component passes the bundle through
          if (!bundle.passedThrough.includes(component.id)) {
            bundle.passedThrough.push(component.id);
          }
          queue.push(child.componentName);
        }
      }
    }
  }

  private calculateAllComponentMetrics(parsedData: ParsedComponentData[]): ComponentPropMetrics[] {
    const metrics: ComponentPropMetrics[] = [];

    for (const { component, functionNode } of parsedData) {
      const propNames = component.props.map(p => p.name);

      // Skip components with no props
      if (propNames.length === 0) {
        continue;
      }

      const propUsages = analyzePropsUsage(functionNode, propNames);
      const componentMetric = this.calculateComponentMetrics(component, propUsages);
      metrics.push(componentMetric);
    }

    return metrics;
  }

  private calculateComponentMetrics(
    component: ComponentNode,
    propUsages: PropUsage[]
  ): ComponentPropMetrics {
    let consumed = 0;
    let passed = 0;
    let transformed = 0;
    let ignored = 0;

    for (const usage of propUsages) {
      const isConsumed = usage.usedInRender || usage.usedInCallback || usage.usedInEffect || usage.usedInLogic;
      const isPassed = usage.passedToChild;
      const isTransformed = usage.transformed;

      if (isConsumed) consumed++;
      if (isPassed) passed++;
      if (isTransformed) transformed++;

      // Ignored = not consumed AND not passed
      if (!isConsumed && !isPassed) {
        ignored++;
      }
    }

    const total = propUsages.length;
    const passthroughRatio = total > 0 ? passed / total : 0;
    const consumptionRatio = total > 0 ? consumed / total : 0;

    // Classify the component role
    let role: ComponentRole;
    if (passthroughRatio > 0.7 && consumptionRatio < 0.3) {
      role = 'passthrough';
    } else if (consumptionRatio > 0.7) {
      role = 'consumer';
    } else if (transformed > 0 && transformed >= passed * 0.5) {
      role = 'transformer';
    } else {
      role = 'mixed';
    }

    return {
      componentId: component.id,
      componentName: component.name,
      filePath: component.filePath,
      totalPropsReceived: total,
      propsConsumed: consumed,
      propsPassed: passed,
      propsTransformed: transformed,
      propsIgnored: ignored,
      passthroughRatio,
      consumptionRatio,
      role,
      propUsages,
    };
  }

  private findStateByName(
    name: string,
    component: ComponentNode,
    stateNodes: Map<string, StateNode>
  ): StateNode | null {
    // First, check if it matches state defined in this component
    for (const state of component.stateProvided) {
      if (state.name === name) {
        return state;
      }
    }

    // Check if it matches state used (received as props from parent)
    for (const state of component.stateUsed) {
      if (state.name === name) {
        return state;
      }
    }

    // Check if the name matches a prop this component receives
    // This handles prop drilling where a prop is passed through
    const matchingProp = component.props.find(p => p.name === name);
    if (matchingProp) {
      // Create a virtual state node to track this prop chain
      const propStateId = `prop_${component.id}_${name}`;
      // Check if we already have a state entry for this
      for (const state of stateNodes.values()) {
        if (state.id === propStateId) {
          return state;
        }
      }
      // Look for any state that was passed to this component with this prop name
      for (const state of stateNodes.values()) {
        if (state.name === name) {
          return state;
        }
      }
    }

    // Fallback: check all state nodes in same file
    for (const state of stateNodes.values()) {
      if (state.name === name && state.filePath === component.filePath) {
        return state;
      }
    }

    return null;
  }

  private detectPropDrilling(
    components: Map<string, ComponentNode>,
    edges: StateFlowEdge[],
    stateNodes: Map<string, StateNode>
  ): PropDrillingPath[] {
    const drillingPaths: PropDrillingPath[] = [];
    const threshold = this.options.drillingThreshold || 3;

    const stateEdges = new Map<string, StateFlowEdge[]>();
    for (const edge of edges) {
      if (edge.mechanism !== 'props') continue;

      const existing = stateEdges.get(edge.stateId) || [];
      existing.push(edge);
      stateEdges.set(edge.stateId, existing);
    }

    for (const [stateId, relatedEdges] of stateEdges) {
      const state = stateNodes.get(stateId);
      if (!state) continue;

      const paths = this.traceStatePaths(stateId, relatedEdges, components);

      for (const pathInfo of paths) {
        if (pathInfo.path.length >= threshold) {
          const unusedCount = this.countUnusedHops(pathInfo.path, stateId, components, edges);

          if (unusedCount >= threshold - 1) {
            drillingPaths.push({
              stateId,
              stateName: state.name,
              origin: pathInfo.origin,
              path: pathInfo.path,
              hops: pathInfo.path.length,
              propNames: pathInfo.propNames,
            });

            this.warnings.push({
              filePath: state.filePath,
              line: state.line,
              message: `State "${state.name}" is passed through ${pathInfo.path.length} components (prop drilling detected)`,
              code: 'PROP_DRILLING',
            });
          }
        }
      }
    }

    return drillingPaths;
  }

  private traceStatePaths(
    stateId: string,
    edges: StateFlowEdge[],
    components: Map<string, ComponentNode>
  ): { origin: string; path: string[]; propNames: string[] }[] {
    const paths: { origin: string; path: string[]; propNames: string[] }[] = [];

    const edgesByFrom = new Map<string, StateFlowEdge[]>();
    for (const edge of edges) {
      const existing = edgesByFrom.get(edge.from) || [];
      existing.push(edge);
      edgesByFrom.set(edge.from, existing);
    }

    const destinations = new Set(edges.map(e => e.to));
    const origins = edges.filter(e => !destinations.has(e.from)).map(e => e.from);

    for (const origin of origins) {
      const visited = new Set<string>();
      const pathResult = this.tracePath(origin, stateId, edgesByFrom, visited, components);
      if (pathResult.path.length > 0) {
        paths.push({
          origin,
          path: pathResult.path,
          propNames: pathResult.propNames,
        });
      }
    }

    return paths;
  }

  private tracePath(
    currentId: string,
    stateId: string,
    edgesByFrom: Map<string, StateFlowEdge[]>,
    visited: Set<string>,
    components: Map<string, ComponentNode>
  ): { path: string[]; propNames: string[] } {
    if (visited.has(currentId)) {
      return { path: [], propNames: [] };
    }

    visited.add(currentId);
    const component = components.get(currentId);
    if (!component) {
      return { path: [], propNames: [] };
    }

    const outgoingEdges = edgesByFrom.get(currentId) || [];
    const relevantEdge = outgoingEdges.find(e => e.stateId === stateId);

    if (!relevantEdge) {
      return { path: [component.name], propNames: [] };
    }

    const nextResult = this.tracePath(relevantEdge.to, stateId, edgesByFrom, visited, components);

    return {
      path: [component.name, ...nextResult.path],
      propNames: relevantEdge.propName
        ? [relevantEdge.propName, ...nextResult.propNames]
        : nextResult.propNames,
    };
  }

  private countUnusedHops(
    path: string[],
    stateId: string,
    components: Map<string, ComponentNode>,
    edges: StateFlowEdge[]
  ): number {
    let unused = 0;

    for (let i = 1; i < path.length - 1; i++) {
      const componentName = path[i];
      let component: ComponentNode | undefined;

      for (const c of components.values()) {
        if (c.name === componentName) {
          component = c;
          break;
        }
      }

      if (component) {
        // A component "uses" a state if it DEFINES that state (stateProvided)
        // A component is a "pass-through" if it receives the state and passes it to children
        const definesState = component.stateProvided.some(s => s.id === stateId);

        if (!definesState) {
          // Check if this component receives the state and passes it to children
          // If it only passes through (receives and sends), it's "unused"
          const receivesState = edges.some(
            e => e.to === component.id && e.stateId === stateId && e.mechanism === 'props'
          );
          const passesState = edges.some(
            e => e.from === component.id && e.stateId === stateId && e.mechanism === 'props'
          );

          // If it receives and passes, it's a pass-through (unused hop)
          if (receivesState && passesState) {
            unused++;
          }
        }
      }
    }

    return unused;
  }

  // ============================================
  // Context Leak Detection
  // ============================================

  private detectContextLeaks(
    parsedData: ParsedComponentData[],
    componentsByName: Map<string, ComponentNode>,
    contextBoundaries: ContextBoundary[]
  ): ContextLeak[] {
    const leaks: ContextLeak[] = [];
    let leakIdCounter = 0;

    for (const { component, functionNode, jsxChildren } of parsedData) {
      // Extract enhanced context usage for this component
      const contextUsages = extractEnhancedContextUsage(functionNode, component.filePath);

      for (const usage of contextUsages) {
        // Skip if no context values are passed as props
        if (usage.passedAsProps.length === 0) continue;

        // Parse the passedAsProps to get component and prop names
        const passedTo: ContextLeak['passedTo'] = [];
        const childComponents = new Map<string, string[]>();

        for (const propRef of usage.passedAsProps) {
          const [childName, propName] = propRef.split(':');
          if (childName && propName) {
            const existing = childComponents.get(childName) || [];
            existing.push(propName);
            childComponents.set(childName, existing);
          }
        }

        // Check if the receiving children could use useContext directly instead
        // Since the parent component is consuming context and passing to children,
        // those children could potentially consume the context directly
        for (const [childName, propNames] of childComponents) {
          const childComponent = componentsByName.get(childName);
          if (!childComponent) continue;

          // A context leak occurs when:
          // 1. Parent uses useContext
          // 2. Parent passes context values to children as props
          // 3. Children could potentially use useContext directly instead
          //
          // We detect this as a leak because:
          // - If the parent can access the context, children in the same tree likely can too
          // - This represents prop drilling of context values
          passedTo.push({
            componentId: childComponent.id,
            componentName: childName,
            propNames,
          });
        }

        // Only create a leak entry if we found valid children receiving context values
        if (passedTo.length > 0) {
          const extractedValues = usage.destructuredFields.length > 0
            ? usage.destructuredFields
            : [usage.variableName];

          const totalPropsLeaked = passedTo.reduce((sum, p) => sum + p.propNames.length, 0);
          const severity = this.calculateLeakSeverity(totalPropsLeaked, passedTo.length);

          // Generate fix suggestion
          const childNames = passedTo.map(p => p.componentName).join(', ');
          const firstPassedTo = passedTo[0];
          const potentialFix = passedTo.length === 1 && firstPassedTo
            ? `${firstPassedTo.componentName} can use useContext(${usage.contextName}) directly instead of receiving ${firstPassedTo.propNames.join(', ')} as props`
            : `${childNames} can each use useContext(${usage.contextName}) directly`;

          const leak: ContextLeak = {
            id: `leak_${++leakIdCounter}`,
            contextName: usage.contextName,
            leakingComponentId: component.id,
            leakingComponentName: component.name,
            extractedValues,
            passedTo,
            severity,
            potentialFix,
            filePath: component.filePath,
            line: usage.line,
          };

          leaks.push(leak);

          // Add warning
          this.warnings.push({
            filePath: component.filePath,
            line: usage.line,
            message: `Context leak: ${component.name} extracts from ${usage.contextName} and passes to ${childNames} as props`,
            code: 'CONTEXT_LEAK',
          });
        }
      }
    }

    return leaks;
  }

  private normalizeContextName(name: string): string {
    return name.toLowerCase()
      .replace(/context$/i, '')
      .replace(/provider$/i, '')
      .replace(/consumer$/i, '');
  }

  private calculateLeakSeverity(propsCount: number, childCount: number): ContextLeakSeverity {
    if (propsCount >= 5 || childCount >= 3) return 'high';
    if (propsCount >= 3 || childCount >= 2) return 'medium';
    return 'low';
  }

  // ============================================
  // Prop Chain / Rename Tracking
  // ============================================

  private buildPropChains(
    parsedData: ParsedComponentData[],
    edges: StateFlowEdge[],
    componentsByName: Map<string, ComponentNode>
  ): PropChain[] {
    const propChains: PropChain[] = [];
    const allRenames: PropRename[] = [];
    let chainIdCounter = 0;

    // Collect all renames from all components
    for (const { component, functionNode } of parsedData) {
      const propNames = component.props.map(p => p.name);
      if (propNames.length === 0) continue;

      const { renames } = buildScopeMap(
        functionNode,
        propNames,
        component.id,
        component.name,
        component.filePath
      );

      allRenames.push(...renames);
    }

    // If there are renames, group them by component and create chains
    if (allRenames.length > 0) {
      // Group renames by component
      const renamesByComponent = new Map<string, PropRename[]>();
      for (const rename of allRenames) {
        const existing = renamesByComponent.get(rename.componentId) || [];
        existing.push(rename);
        renamesByComponent.set(rename.componentId, existing);
      }

      // Create a chain for each component that has renames
      const processedComponents = new Set<string>();

      for (const rename of allRenames) {
        if (processedComponents.has(rename.componentId)) continue;
        processedComponents.add(rename.componentId);

        const componentRenames = renamesByComponent.get(rename.componentId) || [];

        // Create a chain for this component's renames
        if (componentRenames.length > 0) {
          const chain: PropChain = {
            id: `chain_${++chainIdCounter}`,
            originalStateId: undefined,
            originalName: componentRenames[0]?.fromName || '',
            renames: componentRenames,
            finalName: componentRenames[componentRenames.length - 1]?.toName || '',
            depth: componentRenames.length,
          };

          propChains.push(chain);

          // Warn about complex rename chains (2+ renames in same component)
          const firstRename = componentRenames[0];
          if (componentRenames.length >= 2 && firstRename) {
            const renameList = componentRenames.map(r => `${r.fromName}→${r.toName}`).join(', ');
            this.warnings.push({
              filePath: firstRename.filePath,
              line: firstRename.line,
              message: `Prop renamed ${componentRenames.length} times in ${rename.componentName}: ${renameList}`,
              code: 'PROP_RENAME_CHAIN',
            });
          }
        }
      }
    }

    return propChains;
  }

  private traceRenameChain(
    propName: string,
    startComponentId: string,
    edges: StateFlowEdge[],
    allRenames: PropRename[],
    componentsByName: Map<string, ComponentNode>
  ): PropRename[] {
    const chainRenames: PropRename[] = [];
    const visited = new Set<string>();
    let currentName = propName;
    let currentComponentId = startComponentId;

    // Follow edges and look for renames at each component
    while (!visited.has(currentComponentId)) {
      visited.add(currentComponentId);

      // Find renames in this component that match the current prop name
      const componentRenames = allRenames.filter(
        r => r.componentId === currentComponentId && r.fromName === currentName
      );

      for (const rename of componentRenames) {
        chainRenames.push(rename);
        currentName = rename.toName;
      }

      // Find outgoing edge with this prop name to follow to next component
      const outgoingEdge = edges.find(
        e => e.from === currentComponentId && e.propName === currentName && e.mechanism === 'props'
      );

      if (!outgoingEdge) break;
      currentComponentId = outgoingEdge.to;
    }

    return chainRenames;
  }
}
