import type {
  StateFlowGraph,
  ComponentNode,
  StateNode,
  StateFlowEdge,
  ContextBoundary,
  PropDrillingPath,
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
}
