// Main entry point for @react-state-map/core

// Types
export type {
  StateNode,
  ComponentNode,
  PropDefinition,
  ContextInfo,
  StateFlowEdge,
  ContextBoundary,
  PropDrillingPath,
  StateFlowGraph,
  SerializedStateFlowGraph,
  ParseOptions,
  ParseResult,
  ParseError,
  ParseWarning,
} from './types.js';

// Parser
export { ReactParser } from './parser/react-parser.js';
export { parseFile } from './parser/file-parser.js';

// Graph utilities
export { serializeGraph, deserializeGraph } from './graph/serializer.js';
export { GraphAnalyzer } from './graph/analyzer.js';
export type { ComponentStats, StateStats, FlowStats, GraphSummary } from './graph/analyzer.js';
