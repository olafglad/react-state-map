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
  componentMetrics: ComponentPropMetrics[];
  bundles: PropBundle[];
  contextLeaks: ContextLeak[];
  propChains: PropChain[];
}

export interface SerializedStateFlowGraph {
  components: Record<string, ComponentNode>;
  stateNodes: Record<string, StateNode>;
  edges: StateFlowEdge[];
  contextBoundaries: ContextBoundary[];
  propDrillingPaths: PropDrillingPath[];
  componentMetrics: ComponentPropMetrics[];
  bundles: PropBundle[];
  contextLeaks: ContextLeak[];
  propChains: PropChain[];
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

// ============================================
// Pass-Through Ratio Analysis Types
// ============================================

export interface PropUsage {
  propName: string;
  usedInRender: boolean;      // Used in JSX expression (not as prop to child)
  passedToChild: boolean;     // Forwarded to child component as prop
  usedInCallback: boolean;    // Used in useCallback/useMemo
  usedInEffect: boolean;      // Used in useEffect/useLayoutEffect
  usedInLogic: boolean;       // Used in conditionals, computations
  transformed: boolean;       // Assigned to new variable before use
}

export type ComponentRole = 'consumer' | 'passthrough' | 'transformer' | 'mixed';

export interface ComponentPropMetrics {
  componentId: string;
  componentName: string;
  filePath: string;

  // Prop counts
  totalPropsReceived: number;
  propsConsumed: number;        // Used in render logic or callbacks
  propsPassed: number;          // Forwarded to children
  propsTransformed: number;     // Modified before passing
  propsIgnored: number;         // Neither used nor passed

  // Ratios (0-1)
  passthroughRatio: number;     // propsPassed / totalPropsReceived
  consumptionRatio: number;     // propsConsumed / totalPropsReceived

  // Classification
  role: ComponentRole;

  // Details
  propUsages: PropUsage[];
}

// ============================================
// Bundle Detection Types
// ============================================

export interface PropBundle {
  id: string;
  propName: string;                 // The prop name used (e.g., 'formData', 'carInfoValue')
  sourceComponentId: string;        // Component that creates/originates the bundle
  sourceComponentName: string;
  estimatedSize: number;            // Number of properties in the bundle
  properties: string[];             // Known property names in the bundle
  passedThrough: string[];          // Component IDs that forward this bundle
  isObjectLiteral: boolean;         // True if created as inline object literal
  filePath: string;
  line: number;
}

export interface BundleFlow {
  bundleId: string;
  fromComponentId: string;
  toComponentId: string;
  propName: string;                 // May be renamed at each level
  consumedProperties: string[];     // Properties actually used at destination
  forwardedProperties: string[];    // Properties passed further down
}

export type BundleSeverity = 'low' | 'medium' | 'high';

export interface BundleWarning {
  bundle: PropBundle;
  severity: BundleSeverity;
  passedThroughCount: number;       // How many components just forward it
  utilizationRatio: number;         // % of bundle properties actually used
  recommendation: string;
}

// ============================================
// Context Leak Detection Types
// ============================================

export type ContextLeakSeverity = 'low' | 'medium' | 'high';

export interface ContextLeak {
  id: string;
  contextName: string;              // The context being leaked
  leakingComponentId: string;       // Component that extracts and re-passes
  leakingComponentName: string;
  extractedValues: string[];        // What was pulled from context
  passedTo: Array<{
    componentId: string;
    componentName: string;
    propNames: string[];            // Which props carry context values
  }>;
  severity: ContextLeakSeverity;
  potentialFix: string;             // Suggestion for how to fix
  filePath: string;
  line: number;
}

export interface EnhancedContextUsage {
  contextName: string;
  variableName: string;             // Variable assigned to (may be destructured)
  destructuredFields: string[];     // Fields extracted: const { user, settings } = useContext(...)
  usedInJsx: boolean;               // Is it rendered directly
  passedAsProps: string[];          // Which children receive context values
  line: number;
}

// ============================================
// Rename Tracking Types
// ============================================

export type RenameType = 'destructure' | 'alias' | 'accessor' | 'assignment' | 'spread';

export interface PropRename {
  fromName: string;                 // Original prop/variable name
  toName: string;                   // New name after rename
  componentId: string;
  componentName: string;
  renameType: RenameType;
  line: number;
  filePath: string;
}

export interface PropChain {
  id: string;
  originalStateId?: string;         // If traceable to a state node
  originalName: string;             // Starting prop name
  renames: PropRename[];            // Chain of renames through components
  finalName: string;                // Name at the end of chain
  depth: number;                    // How many components deep
}

export interface ScopeEntry {
  type: 'propAlias' | 'destructure' | 'contextValue' | 'computed';
  originalName: string;
  sourceProp?: string;              // For destructure: which prop it came from
  line: number;
}
