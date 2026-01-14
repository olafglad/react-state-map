import type {
  StateFlowGraph,
  ComponentNode,
  StateNode,
  StateFlowEdge,
  ContextBoundary,
  PropDrillingPath,
  ComponentPropMetrics,
  ComponentRole,
  PropBundle,
  BundleWarning,
  BundleSeverity,
  ContextLeak,
  ContextLeakSeverity,
  PropChain,
  PropRename,
} from '../types.js';

export interface ComponentStats {
  totalComponents: number;
  componentsWithState: number;
  componentsWithContext: number;
  averageStatePerComponent: number;
}

export interface StateStats {
  totalStateNodes: number;
  byType: Record<string, number>;
}

export interface FlowStats {
  totalEdges: number;
  propFlows: number;
  contextFlows: number;
  hookFlows: number;
  averageHops: number;
}

export interface GraphSummary {
  components: ComponentStats;
  state: StateStats;
  flow: FlowStats;
  contextBoundaries: number;
  propDrillingPaths: number;
  worstDrillingPath: PropDrillingPath | null;
}

export class GraphAnalyzer {
  constructor(private graph: StateFlowGraph) {}

  getSummary(): GraphSummary {
    return {
      components: this.getComponentStats(),
      state: this.getStateStats(),
      flow: this.getFlowStats(),
      contextBoundaries: this.graph.contextBoundaries.length,
      propDrillingPaths: this.graph.propDrillingPaths.length,
      worstDrillingPath: this.getWorstDrillingPath(),
    };
  }

  getComponentStats(): ComponentStats {
    const components = Array.from(this.graph.components.values());
    const totalComponents = components.length;
    const componentsWithState = components.filter(c => c.stateProvided.length > 0).length;
    const componentsWithContext = components.filter(
      c => c.contextProviders.length > 0 || c.contextConsumers.length > 0
    ).length;

    const totalState = components.reduce((sum, c) => sum + c.stateProvided.length, 0);
    const averageStatePerComponent = totalComponents > 0 ? totalState / totalComponents : 0;

    return {
      totalComponents,
      componentsWithState,
      componentsWithContext,
      averageStatePerComponent,
    };
  }

  getStateStats(): StateStats {
    const stateNodes = Array.from(this.graph.stateNodes.values());
    const byType: Record<string, number> = {};

    for (const state of stateNodes) {
      byType[state.type] = (byType[state.type] || 0) + 1;
    }

    return {
      totalStateNodes: stateNodes.length,
      byType,
    };
  }

  getFlowStats(): FlowStats {
    const edges = this.graph.edges;
    const propFlows = edges.filter(e => e.mechanism === 'props').length;
    const contextFlows = edges.filter(e => e.mechanism === 'context').length;
    const hookFlows = edges.filter(e => e.mechanism === 'hook').length;

    const totalHops = edges.reduce((sum, e) => sum + e.hops, 0);
    const averageHops = edges.length > 0 ? totalHops / edges.length : 0;

    return {
      totalEdges: edges.length,
      propFlows,
      contextFlows,
      hookFlows,
      averageHops,
    };
  }

  getWorstDrillingPath(): PropDrillingPath | null {
    if (this.graph.propDrillingPaths.length === 0) return null;

    return this.graph.propDrillingPaths.reduce((worst, current) =>
      current.hops > worst.hops ? current : worst
    );
  }

  getComponentById(id: string): ComponentNode | undefined {
    return this.graph.components.get(id);
  }

  getStateById(id: string): StateNode | undefined {
    return this.graph.stateNodes.get(id);
  }

  getComponentsByFile(filePath: string): ComponentNode[] {
    return Array.from(this.graph.components.values()).filter(
      c => c.filePath === filePath
    );
  }

  getStateOrigins(): ComponentNode[] {
    return Array.from(this.graph.components.values()).filter(
      c => c.stateProvided.length > 0
    );
  }

  getStateConsumers(stateId: string): ComponentNode[] {
    const consumerIds = new Set<string>();

    for (const edge of this.graph.edges) {
      if (edge.stateId === stateId) {
        consumerIds.add(edge.to);
      }
    }

    return Array.from(consumerIds)
      .map(id => this.graph.components.get(id))
      .filter((c): c is ComponentNode => c !== undefined);
  }

  getContextProviders(): ContextBoundary[] {
    return this.graph.contextBoundaries;
  }

  getContextConsumers(contextName: string): ComponentNode[] {
    return Array.from(this.graph.components.values()).filter(c =>
      c.contextConsumers.includes(contextName)
    );
  }

  getIncomingEdges(componentId: string): StateFlowEdge[] {
    return this.graph.edges.filter(e => e.to === componentId);
  }

  getOutgoingEdges(componentId: string): StateFlowEdge[] {
    return this.graph.edges.filter(e => e.from === componentId);
  }

  getDrillingPathsForState(stateId: string): PropDrillingPath[] {
    return this.graph.propDrillingPaths.filter(p => p.stateId === stateId);
  }

  findComponentByName(name: string): ComponentNode | undefined {
    for (const component of this.graph.components.values()) {
      if (component.name === name) {
        return component;
      }
    }
    return undefined;
  }

  // ============================================
  // Pass-Through Ratio Analysis Methods
  // ============================================

  /**
   * Get all component prop metrics
   */
  getComponentMetrics(): ComponentPropMetrics[] {
    return this.graph.componentMetrics;
  }

  /**
   * Get metrics for a specific component
   */
  getMetricsForComponent(componentId: string): ComponentPropMetrics | undefined {
    return this.graph.componentMetrics.find(m => m.componentId === componentId);
  }

  /**
   * Get components with high passthrough ratio (primarily forwarding props)
   * @param threshold - Minimum passthrough ratio (0-1), default 0.7
   */
  getPassthroughComponents(threshold: number = 0.7): ComponentPropMetrics[] {
    return this.graph.componentMetrics.filter(
      m => m.passthroughRatio >= threshold && m.consumptionRatio < 0.3
    );
  }

  /**
   * Get components by their role classification
   */
  getComponentsByRole(role: ComponentRole): ComponentPropMetrics[] {
    return this.graph.componentMetrics.filter(m => m.role === role);
  }

  /**
   * Get role distribution summary
   */
  getRoleDistribution(): Record<ComponentRole, number> {
    const distribution: Record<ComponentRole, number> = {
      consumer: 0,
      passthrough: 0,
      transformer: 0,
      mixed: 0,
    };

    for (const metric of this.graph.componentMetrics) {
      distribution[metric.role]++;
    }

    return distribution;
  }

  /**
   * Get components with unused/ignored props
   * @param minIgnored - Minimum number of ignored props
   */
  getComponentsWithIgnoredProps(minIgnored: number = 1): ComponentPropMetrics[] {
    return this.graph.componentMetrics.filter(m => m.propsIgnored >= minIgnored);
  }

  /**
   * Get passthrough summary for analysis output
   */
  getPassthroughSummary(): {
    totalComponentsWithProps: number;
    passthroughCount: number;
    consumerCount: number;
    transformerCount: number;
    mixedCount: number;
    worstPassthrough: ComponentPropMetrics | null;
  } {
    const distribution = this.getRoleDistribution();
    const passthroughComponents = this.getPassthroughComponents();

    const worstPassthrough = passthroughComponents.length > 0
      ? passthroughComponents.reduce((worst, current) =>
          current.passthroughRatio > worst.passthroughRatio ? current : worst
        )
      : null;

    return {
      totalComponentsWithProps: this.graph.componentMetrics.length,
      passthroughCount: distribution.passthrough,
      consumerCount: distribution.consumer,
      transformerCount: distribution.transformer,
      mixedCount: distribution.mixed,
      worstPassthrough,
    };
  }

  // ============================================
  // Bundle Detection Methods
  // ============================================

  /**
   * Get all detected prop bundles
   */
  getBundles(): PropBundle[] {
    return this.graph.bundles;
  }

  /**
   * Get bundles above a certain size threshold
   * @param minSize - Minimum number of properties (default: 5)
   */
  getLargeBundles(minSize: number = 5): PropBundle[] {
    return this.graph.bundles.filter(b => b.estimatedSize >= minSize);
  }

  /**
   * Get bundles that are passed through multiple components
   * @param minPassthroughs - Minimum number of pass-through components (default: 2)
   */
  getBundlesWithPassthrough(minPassthroughs: number = 2): PropBundle[] {
    return this.graph.bundles.filter(b => b.passedThrough.length >= minPassthroughs);
  }

  /**
   * Get warnings for problematic bundles
   */
  getBundleWarnings(): BundleWarning[] {
    const warnings: BundleWarning[] = [];

    for (const bundle of this.graph.bundles) {
      const passedThroughCount = bundle.passedThrough.length;

      // Calculate severity
      let severity: BundleSeverity = 'low';
      if (bundle.estimatedSize >= 10 || passedThroughCount >= 3) {
        severity = 'high';
      } else if (bundle.estimatedSize >= 5 || passedThroughCount >= 2) {
        severity = 'medium';
      }

      // Only warn for medium/high severity
      if (severity !== 'low') {
        const recommendation = this.generateBundleRecommendation(bundle);

        warnings.push({
          bundle,
          severity,
          passedThroughCount,
          utilizationRatio: 0,  // Would need more analysis to calculate
          recommendation,
        });
      }
    }

    return warnings.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  private generateBundleRecommendation(bundle: PropBundle): string {
    if (bundle.passedThrough.length >= 2) {
      return `Consider using React Context or a state management solution to avoid passing "${bundle.propName}" through ${bundle.passedThrough.length} intermediate components`;
    }
    if (bundle.estimatedSize >= 10) {
      return `Consider splitting "${bundle.propName}" into smaller, focused prop groups or using composition`;
    }
    if (bundle.estimatedSize >= 5) {
      return `Bundle "${bundle.propName}" has ${bundle.estimatedSize} properties - consider if all are needed by the child component`;
    }
    return `Review if all properties in "${bundle.propName}" are necessary`;
  }

  /**
   * Get bundle summary for analysis output
   */
  getBundleSummary(): {
    totalBundles: number;
    largeBundles: number;
    bundlesWithPassthrough: number;
    warningCount: number;
    largestBundle: PropBundle | null;
  } {
    const bundles = this.graph.bundles;
    const largeBundles = this.getLargeBundles().length;
    const bundlesWithPassthrough = this.getBundlesWithPassthrough().length;
    const warnings = this.getBundleWarnings();

    const largestBundle = bundles.length > 0
      ? bundles.reduce((largest, current) =>
          current.estimatedSize > largest.estimatedSize ? current : largest
        )
      : null;

    return {
      totalBundles: bundles.length,
      largeBundles,
      bundlesWithPassthrough,
      warningCount: warnings.length,
      largestBundle,
    };
  }

  // ============================================
  // Context Leak Detection Methods
  // ============================================

  /**
   * Get all detected context leaks
   */
  getContextLeaks(): ContextLeak[] {
    return this.graph.contextLeaks;
  }

  /**
   * Get context leaks by severity
   */
  getContextLeaksBySeverity(severity: ContextLeakSeverity): ContextLeak[] {
    return this.graph.contextLeaks.filter(leak => leak.severity === severity);
  }

  /**
   * Get context leaks for a specific context
   */
  getLeaksForContext(contextName: string): ContextLeak[] {
    const normalizedName = contextName.toLowerCase().replace(/context$/i, '');
    return this.graph.contextLeaks.filter(leak => {
      const leakContextNormalized = leak.contextName.toLowerCase().replace(/context$/i, '');
      return leakContextNormalized === normalizedName ||
             leak.contextName === contextName;
    });
  }

  /**
   * Get context leaks originating from a specific component
   */
  getLeaksFromComponent(componentId: string): ContextLeak[] {
    return this.graph.contextLeaks.filter(leak => leak.leakingComponentId === componentId);
  }

  /**
   * Get context leak summary for analysis output
   */
  getContextLeakSummary(): {
    totalLeaks: number;
    highSeverity: number;
    mediumSeverity: number;
    lowSeverity: number;
    affectedContexts: string[];
    worstLeak: ContextLeak | null;
  } {
    const leaks = this.graph.contextLeaks;

    const highSeverity = leaks.filter(l => l.severity === 'high').length;
    const mediumSeverity = leaks.filter(l => l.severity === 'medium').length;
    const lowSeverity = leaks.filter(l => l.severity === 'low').length;

    const affectedContexts = [...new Set(leaks.map(l => l.contextName))];

    // Find worst leak (most props passed to most children)
    const worstLeak = leaks.length > 0
      ? leaks.reduce((worst, current) => {
          const currentScore = current.extractedValues.length * current.passedTo.length;
          const worstScore = worst.extractedValues.length * worst.passedTo.length;
          return currentScore > worstScore ? current : worst;
        })
      : null;

    return {
      totalLeaks: leaks.length,
      highSeverity,
      mediumSeverity,
      lowSeverity,
      affectedContexts,
      worstLeak,
    };
  }

  // ============================================
  // Prop Chain / Rename Tracking Methods
  // ============================================

  /**
   * Get all prop chains (rename tracking)
   */
  getPropChains(): PropChain[] {
    return this.graph.propChains;
  }

  /**
   * Get prop chains with multiple renames
   * @param minDepth - Minimum number of renames (default: 2)
   */
  getComplexPropChains(minDepth: number = 2): PropChain[] {
    return this.graph.propChains.filter(chain => chain.depth >= minDepth);
  }

  /**
   * Get prop chain for a specific original prop name
   */
  getChainForProp(originalName: string): PropChain | undefined {
    return this.graph.propChains.find(chain => chain.originalName === originalName);
  }

  /**
   * Get all renames in a specific component
   */
  getRenamesInComponent(componentId: string): PropRename[] {
    const renames: PropRename[] = [];
    for (const chain of this.graph.propChains) {
      for (const rename of chain.renames) {
        if (rename.componentId === componentId) {
          renames.push(rename);
        }
      }
    }
    return renames;
  }

  /**
   * Get prop chain summary for analysis output
   */
  getPropChainSummary(): {
    totalChains: number;
    complexChains: number;
    totalRenames: number;
    deepestChain: PropChain | null;
    mostRenamedProp: PropChain | null;
  } {
    const chains = this.graph.propChains;
    const complexChains = this.getComplexPropChains().length;
    const totalRenames = chains.reduce((sum, chain) => sum + chain.renames.length, 0);

    const deepestChain = chains.length > 0
      ? chains.reduce((deepest, current) =>
          current.depth > deepest.depth ? current : deepest
        )
      : null;

    const mostRenamedProp = chains.length > 0
      ? chains.reduce((most, current) =>
          current.renames.length > most.renames.length ? current : most
        )
      : null;

    return {
      totalChains: chains.length,
      complexChains,
      totalRenames,
      deepestChain,
      mostRenamedProp,
    };
  }

  /**
   * Trace a prop through all its renames to find the final name
   */
  tracePropToFinalName(originalName: string): string {
    const chain = this.getChainForProp(originalName);
    return chain?.finalName || originalName;
  }

  /**
   * Get all names a prop has had through the component tree
   */
  getAllNamesForProp(originalName: string): string[] {
    const chain = this.getChainForProp(originalName);
    if (!chain) return [originalName];

    const names = [originalName];
    for (const rename of chain.renames) {
      if (!names.includes(rename.toName)) {
        names.push(rename.toName);
      }
    }
    return names;
  }
}
