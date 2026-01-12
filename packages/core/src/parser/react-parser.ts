import { Project, SourceFile } from 'ts-morph';
import { parseFile, resetIdCounter } from './file-parser.js';
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
} from '../types.js';
import * as path from 'node:path';
import * as fs from 'node:fs';

interface JsxChildInfo {
  componentName: string;
  props: Map<string, string>;
  line: number;
}

interface ParsedComponentData {
  component: ComponentNode;
  stateNodes: StateNode[];
  jsxChildren: JsxChildInfo[];
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

    return {
      components,
      stateNodes,
      edges,
      contextBoundaries,
      propDrillingPaths,
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
}
