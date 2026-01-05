import type { StateFlowGraph, SerializedStateFlowGraph } from '../types.js';

export function serializeGraph(graph: StateFlowGraph): SerializedStateFlowGraph {
  const components: Record<string, typeof graph.components extends Map<string, infer V> ? V : never> = {};
  const stateNodes: Record<string, typeof graph.stateNodes extends Map<string, infer V> ? V : never> = {};

  for (const [id, component] of graph.components) {
    components[id] = component;
  }

  for (const [id, state] of graph.stateNodes) {
    stateNodes[id] = state;
  }

  return {
    components,
    stateNodes,
    edges: graph.edges,
    contextBoundaries: graph.contextBoundaries,
    propDrillingPaths: graph.propDrillingPaths,
  };
}

export function deserializeGraph(serialized: SerializedStateFlowGraph): StateFlowGraph {
  const components = new Map(Object.entries(serialized.components));
  const stateNodes = new Map(Object.entries(serialized.stateNodes));

  return {
    components,
    stateNodes,
    edges: serialized.edges,
    contextBoundaries: serialized.contextBoundaries,
    propDrillingPaths: serialized.propDrillingPaths,
  };
}

export function toJSON(graph: StateFlowGraph): string {
  return JSON.stringify(serializeGraph(graph), null, 2);
}

export function fromJSON(json: string): StateFlowGraph {
  return deserializeGraph(JSON.parse(json));
}
