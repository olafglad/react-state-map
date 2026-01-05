/**
 * Core data types for React State Map
 */

export interface StateNode {
  id: string;
  type: 'useState' | 'useReducer' | 'useContext' | 'zustand' | 'redux' | 'customHook' | 'props';
  name: string;
  filePath: string;
  line: number;
  column: number;
  initialValue?: string;
  storeName?: string; // For zustand/redux - which store it comes from
  hookName?: string;  // For custom hooks - which hook provides this state
}

export interface ContextInfo {
  contextId: string;
  contextName: string;
  providerValue?: string;
}

export interface ComponentNode {
  id: string;
  name: string;
  filePath: string;
  line: number;
  column: number;
  stateUsed: StateNode[];
  stateProvided: StateNode[];
  contextProviders: ContextInfo[];
  contextConsumers: string[];
  props: PropDefinition[];
  isExported: boolean;
}

export interface PropDefinition {
  name: string;
  type?: string;
  isUsed: boolean;
  passedTo: string[];
}

export interface StateFlowEdge {
  id: string;
  from: string;
  to: string;
  stateId: string;
  mechanism: 'props' | 'context' | 'hook';
  propName?: string;
  hops: number;
}

export interface ContextBoundary {
  contextId: string;
  contextName: string;
  providerComponent: string;
  providerFile: string;
  providerLine: number;
  childComponents: string[];
}

export interface PropDrillingPath {
  stateId: string;
  stateName: string;
  origin: string;
  path: string[];
  hops: number;
  propNames: string[];
}

export interface StateFlowGraph {
  components: Map<string, ComponentNode>;
  stateNodes: Map<string, StateNode>;
  edges: StateFlowEdge[];
  contextBoundaries: ContextBoundary[];
  propDrillingPaths: PropDrillingPath[];
}

export interface SerializedStateFlowGraph {
  components: Record<string, ComponentNode>;
  stateNodes: Record<string, StateNode>;
  edges: StateFlowEdge[];
  contextBoundaries: ContextBoundary[];
  propDrillingPaths: PropDrillingPath[];
}

export interface ParseOptions {
  entryPoint?: string;
  rootDir: string;
  include?: string[];
  exclude?: string[];
  drillingThreshold?: number;
}

export interface ParseResult {
  graph: StateFlowGraph;
  errors: ParseError[];
  warnings: ParseWarning[];
}

export interface ParseError {
  filePath: string;
  line?: number;
  column?: number;
  message: string;
}

export interface ParseWarning {
  filePath: string;
  line?: number;
  column?: number;
  message: string;
  code: string;
}
