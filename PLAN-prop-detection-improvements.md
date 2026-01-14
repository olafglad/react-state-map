# Prop Detection Improvements Plan

Based on analysis of real-world codebase patterns that evade current detection.

---

## Feature 1: Bundle Detection

**Problem**: Props like `carInfoValue` (15 fields), `topButtonListData` (18 fields), `formData` (16 fields) hide drilling under a single prop name.

### Implementation

#### 1.1 New Types (`packages/core/src/types.ts`)

```typescript
interface PropBundle {
  id: string;
  propName: string;
  sourceComponent: string;
  estimatedSize: number;           // Number of properties
  properties: string[];            // Known property names
  passedThrough: string[];         // Components that forward this bundle
  consumedProperties: Map<string, string[]>; // componentId → properties actually used
}

interface BundleWarning {
  bundle: PropBundle;
  severity: 'low' | 'medium' | 'high';
  passThroughRatio: number;        // % of bundle forwarded without use
  recommendation: string;
}
```

#### 1.2 Detection Logic (`packages/core/src/parser/file-parser.ts`)

Add to `extractJsxChild()`:

```typescript
// Detect object literal props: <Child data={{ user, settings, config }} />
if (attr.getInitializer()?.isKind(SyntaxKind.ObjectLiteralExpression)) {
  const objLiteral = attr.getInitializer() as ObjectLiteralExpression;
  const properties = objLiteral.getProperties().map(p => p.getName?.() || 'unknown');
  // Store as bundle with property list
}

// Detect identifier props that reference large objects
// Requires tracking variable declarations in component scope
```

#### 1.3 Bundle Analysis Pass (`packages/core/src/parser/react-parser.ts`)

New Pass 4 after context boundaries:

```typescript
private analyzeBundles(): void {
  for (const edge of this.graph.edges) {
    if (edge.mechanism === 'props') {
      const propValue = this.getPropValueAtEdge(edge);
      if (this.isLikelyBundle(propValue)) {
        this.trackBundleFlow(edge);
      }
    }
  }
}

private isLikelyBundle(propValue: string): boolean {
  // Heuristics:
  // 1. Object literal with 5+ properties
  // 2. Variable name containing: data, config, options, info, value, state
  // 3. Spread operator usage
  return /\{.*,.*,.*\}/.test(propValue) ||
         /(data|config|options|info|value|state|props)$/i.test(propValue);
}
```

#### 1.4 Output Integration

- Add `bundles: PropBundle[]` to `StateFlowGraph`
- Add `getBundleWarnings(threshold: number)` to `GraphAnalyzer`
- Visualize bundles as thick/colored edges in HTML renderer

---

## Feature 2: Rename Tracking

**Problem**: `dealInfoForm` → `dealData` → `formData` - same data, different names at each level.

### Implementation

#### 2.1 New Types

```typescript
interface PropRename {
  fromName: string;
  toName: string;
  componentId: string;
  renameType: 'destructure' | 'alias' | 'accessor' | 'assignment';
  line: number;
}

interface PropTrace {
  originalStateId: string;
  path: Array<{
    componentId: string;
    propName: string;
    renames: PropRename[];
  }>;
}
```

#### 2.2 Variable Scope Analysis (`packages/core/src/parser/file-parser.ts`)

New function to build component scope map:

```typescript
private buildScopeMap(component: FunctionDeclaration | ArrowFunction): Map<string, ScopeEntry> {
  const scope = new Map<string, ScopeEntry>();

  // Track variable declarations
  component.getDescendantsOfKind(SyntaxKind.VariableDeclaration).forEach(decl => {
    const name = decl.getName();
    const init = decl.getInitializer();

    // Detect: const userData = props.user
    if (init?.isKind(SyntaxKind.PropertyAccessExpression)) {
      const propAccess = init as PropertyAccessExpression;
      if (propAccess.getExpression().getText() === 'props') {
        scope.set(name, {
          type: 'propAlias',
          originalName: propAccess.getName(),
          line: decl.getStartLineNumber()
        });
      }
    }

    // Detect: const { user: userData } = props
    // (destructuring with rename)
  });

  return scope;
}
```

#### 2.3 Destructure Pattern Detection

```typescript
private extractDestructureRenames(pattern: ObjectBindingPattern): PropRename[] {
  const renames: PropRename[] = [];

  for (const element of pattern.getElements()) {
    const propName = element.getPropertyNameNode()?.getText();
    const localName = element.getName();

    if (propName && propName !== localName) {
      renames.push({
        fromName: propName,
        toName: localName,
        renameType: 'destructure'
      });
    }
  }

  return renames;
}
```

#### 2.4 Enhanced Edge Tracking

Modify `findStateByName()` to use scope analysis:

```typescript
private findStateByNameWithRenames(
  name: string,
  component: ComponentNode,
  scopeMap: Map<string, ScopeEntry>
): { state: StateNode | null; renames: PropRename[] } {

  // Check if this name is an alias
  const scopeEntry = scopeMap.get(name);
  if (scopeEntry?.type === 'propAlias') {
    // Recurse with original name
    return this.findStateByNameWithRenames(
      scopeEntry.originalName,
      component,
      scopeMap
    );
  }

  // Existing lookup logic...
}
```

---

## Feature 3: Context Leak Detection

**Problem**: `useContext()` result destructured then passed as props to children instead of children consuming context directly.

### Implementation

#### 3.1 New Types

```typescript
interface ContextLeak {
  contextName: string;
  leakingComponent: string;        // Component that extracts and re-passes
  extractedValues: string[];       // What was pulled from context
  passedTo: Array<{
    componentId: string;
    propNames: string[];
  }>;
  severity: 'low' | 'medium' | 'high';
  potentialFix: string;
}
```

#### 3.2 Context Usage Tracking

Enhance `extractUseContextCall()`:

```typescript
interface ContextUsage {
  contextName: string;
  variableName: string;
  destructuredFields: string[];    // NEW: track what's destructured
  usedInJsx: boolean;              // NEW: is it used in render
  passedAsProps: string[];         // NEW: which children receive it
}

private extractUseContextCall(call: CallExpression): ContextUsage {
  const contextName = call.getArguments()[0]?.getText();

  // Get the variable it's assigned to
  const parent = call.getParent();
  let destructuredFields: string[] = [];

  if (parent?.isKind(SyntaxKind.VariableDeclaration)) {
    const nameNode = parent.getNameNode();

    // const { user, settings } = useContext(MyContext)
    if (nameNode.isKind(SyntaxKind.ObjectBindingPattern)) {
      destructuredFields = nameNode.getElements().map(e => e.getName());
    }
  }

  return { contextName, variableName, destructuredFields, usedInJsx: false, passedAsProps: [] };
}
```

#### 3.3 Leak Detection Pass

New Pass 5:

```typescript
private detectContextLeaks(): ContextLeak[] {
  const leaks: ContextLeak[] = [];

  for (const component of this.graph.components) {
    for (const contextUsage of component.contextConsumers) {
      // Find JSX children that receive context values as props
      const jsxChildren = this.getJsxChildren(component);

      for (const child of jsxChildren) {
        const matchingProps = child.props.filter(p =>
          contextUsage.destructuredFields.includes(p.name) ||
          p.value === contextUsage.variableName
        );

        if (matchingProps.length > 0) {
          // Check if child component is within same context boundary
          const childComponent = this.findComponent(child.name);
          const isInSameBoundary = this.isWithinContextBoundary(
            childComponent,
            contextUsage.contextName
          );

          if (isInSameBoundary) {
            leaks.push({
              contextName: contextUsage.contextName,
              leakingComponent: component.id,
              extractedValues: matchingProps.map(p => p.name),
              passedTo: [{ componentId: child.name, propNames: matchingProps.map(p => p.name) }],
              severity: this.calculateLeakSeverity(matchingProps.length),
              potentialFix: `${child.name} can use useContext(${contextUsage.contextName}) directly`
            });
          }
        }
      }
    }
  }

  return leaks;
}
```

#### 3.4 Severity Calculation

```typescript
private calculateLeakSeverity(propsCount: number): 'low' | 'medium' | 'high' {
  if (propsCount >= 5) return 'high';
  if (propsCount >= 3) return 'medium';
  return 'low';
}
```

---

## Feature 4: Pass-Through Ratio

**Problem**: Can't easily identify components that exist only to forward props.

### Implementation

#### 4.1 New Types

```typescript
interface ComponentPropMetrics {
  componentId: string;
  componentName: string;

  // Prop counts
  totalPropsReceived: number;
  propsConsumed: number;           // Used in render logic or callbacks
  propsPassed: number;             // Forwarded to children
  propsTransformed: number;        // Modified before passing
  propsIgnored: number;            // Neither used nor passed

  // Ratios
  passthroughRatio: number;        // propsPassed / totalPropsReceived
  consumptionRatio: number;        // propsConsumed / totalPropsReceived

  // Classification
  role: 'consumer' | 'passthrough' | 'transformer' | 'mixed';
}
```

#### 4.2 Prop Usage Detection

New analysis in `file-parser.ts`:

```typescript
private analyzePropsUsage(component: ParsedComponent): PropUsageMap {
  const usage = new Map<string, PropUsage>();
  const body = component.functionBody;

  // Get all prop names
  const propNames = component.props.map(p => p.name);

  for (const propName of propNames) {
    const usageInfo: PropUsage = {
      usedInRender: false,
      passedToChild: false,
      usedInCallback: false,
      usedInEffect: false,
      transformed: false
    };

    // Search for identifier usage in function body
    body.getDescendantsOfKind(SyntaxKind.Identifier)
      .filter(id => id.getText() === propName)
      .forEach(id => {
        const context = this.getUsageContext(id);
        if (context === 'jsx-attribute') usageInfo.passedToChild = true;
        if (context === 'jsx-expression') usageInfo.usedInRender = true;
        if (context === 'callback') usageInfo.usedInCallback = true;
        if (context === 'effect') usageInfo.usedInEffect = true;
        if (context === 'assignment') usageInfo.transformed = true;
      });

    usage.set(propName, usageInfo);
  }

  return usage;
}

private getUsageContext(identifier: Identifier): string {
  let current = identifier.getParent();

  while (current) {
    if (current.isKind(SyntaxKind.JsxAttribute)) return 'jsx-attribute';
    if (current.isKind(SyntaxKind.JsxExpression)) return 'jsx-expression';
    if (current.isKind(SyntaxKind.CallExpression)) {
      const callName = current.getExpression().getText();
      if (callName === 'useEffect' || callName === 'useLayoutEffect') return 'effect';
      if (callName === 'useCallback' || callName === 'useMemo') return 'callback';
    }
    if (current.isKind(SyntaxKind.VariableDeclaration)) return 'assignment';
    current = current.getParent();
  }

  return 'unknown';
}
```

#### 4.3 Metrics Calculation

```typescript
private calculatePropMetrics(component: ComponentNode, usage: PropUsageMap): ComponentPropMetrics {
  let consumed = 0, passed = 0, transformed = 0, ignored = 0;

  for (const [propName, info] of usage) {
    if (info.usedInRender || info.usedInCallback || info.usedInEffect) consumed++;
    if (info.passedToChild) passed++;
    if (info.transformed) transformed++;
    if (!info.usedInRender && !info.passedToChild && !info.usedInCallback) ignored++;
  }

  const total = usage.size;
  const passthroughRatio = total > 0 ? passed / total : 0;
  const consumptionRatio = total > 0 ? consumed / total : 0;

  let role: ComponentPropMetrics['role'];
  if (passthroughRatio > 0.7 && consumptionRatio < 0.3) role = 'passthrough';
  else if (consumptionRatio > 0.7) role = 'consumer';
  else if (transformed > passed * 0.5) role = 'transformer';
  else role = 'mixed';

  return {
    componentId: component.id,
    componentName: component.name,
    totalPropsReceived: total,
    propsConsumed: consumed,
    propsPassed: passed,
    propsTransformed: transformed,
    propsIgnored: ignored,
    passthroughRatio,
    consumptionRatio,
    role
  };
}
```

---

## Implementation Order

### Phase 1: Foundation (Pass-Through Ratio)
**Why first**: Enables identifying which components to focus on for other features.

1. Add `PropUsageMap` and `ComponentPropMetrics` types
2. Implement `analyzePropsUsage()` in file-parser
3. Add metrics to `ComponentNode`
4. Add `getPassthroughComponents(threshold)` to analyzer
5. Visualize in HTML (badge on nodes showing role)

**Estimated files changed**: 4 (types.ts, file-parser.ts, react-parser.ts, analyzer.ts)

### Phase 2: Bundle Detection
**Why second**: Highest impact on real-world detection gaps.

1. Add `PropBundle` types
2. Implement object literal detection in JSX
3. Add bundle tracking pass
4. Create bundle warnings
5. Visualize bundles (edge thickness/color)

**Estimated files changed**: 5 (types.ts, file-parser.ts, react-parser.ts, analyzer.ts, html-renderer.ts)

### Phase 3: Context Leak Detection
**Why third**: Common anti-pattern, moderate complexity.

1. Enhance `ContextUsage` tracking
2. Add destructure field extraction
3. Implement leak detection pass
4. Add leak warnings to output
5. Suggest fixes in output

**Estimated files changed**: 4 (types.ts, file-parser.ts, react-parser.ts, analyzer.ts)

### Phase 4: Rename Tracking
**Why last**: Most complex, requires scope analysis.

1. Build scope map infrastructure
2. Implement destructure rename detection
3. Enhance `findStateByName` with scope awareness
4. Track renames through drilling paths
5. Show rename chain in output

**Estimated files changed**: 4 (types.ts, file-parser.ts, react-parser.ts, analyzer.ts)

---

## CLI/Extension Output Changes

### New CLI Flags

```bash
# Bundle detection
--bundle-threshold <n>     # Flag bundles with >n properties (default: 5)
--show-bundles            # Include bundle analysis in output

# Context leaks
--detect-context-leaks    # Enable context leak detection
--leak-severity <level>   # Minimum severity to report (low|medium|high)

# Pass-through analysis
--passthrough-threshold <ratio>  # Flag components with >ratio passthrough (default: 0.7)
--show-roles              # Show component roles in output
```

### New JSON Output Fields

```json
{
  "bundles": [...],
  "contextLeaks": [...],
  "componentMetrics": [...],
  "propRenames": [...]
}
```

### HTML Visualization Enhancements

1. **Node badges**: Show role (passthrough/consumer/transformer)
2. **Edge styling**: Thicker edges for bundles, dashed for context leaks
3. **Warning panel**: List bundles, leaks, high-passthrough components
4. **Rename annotations**: Show prop name changes on hover

---

## Testing Strategy

Each feature needs:

1. **Unit tests**: Parser extracts correct data
2. **Integration tests**: End-to-end detection works
3. **Fixture files**: Sample components demonstrating each pattern

### Test Fixtures Needed

```
test-fixtures/
├── bundles/
│   ├── large-object-prop.tsx      # { user, settings, config, ... }
│   ├── nested-bundle.tsx          # Bundle passed through 3 levels
│   └── partial-consumption.tsx    # Bundle where only 2/10 props used
├── renames/
│   ├── destructure-rename.tsx     # const { user: userData } = props
│   ├── accessor-rename.tsx        # const id = props.userId
│   └── chain-rename.tsx           # Props renamed at each level
├── context-leaks/
│   ├── simple-leak.tsx            # useContext → pass as prop
│   ├── partial-leak.tsx           # Some context values leaked
│   └── no-leak.tsx                # Proper context usage (negative test)
└── passthrough/
    ├── pure-passthrough.tsx       # Component only forwards props
    ├── mixed-usage.tsx            # Some props used, some passed
    └── transformer.tsx            # Props transformed before passing
```
