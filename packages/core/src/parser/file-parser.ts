import {
  Project,
  SourceFile,
  Node,
  SyntaxKind,
  CallExpression,
  FunctionDeclaration,
  ArrowFunction,
  FunctionExpression,
  VariableDeclaration,
  JsxOpeningElement,
  JsxSelfClosingElement,
  Identifier,
  ObjectLiteralExpression,
} from 'ts-morph';
import type { StateNode, ComponentNode, PropDefinition, ContextInfo, PropUsage, EnhancedContextUsage, ScopeEntry, PropRename, RenameType } from '../types.js';

export interface ParsedComponent {
  component: ComponentNode;
  stateNodes: StateNode[];
  jsxChildren: JsxChildInfo[];
  functionNode: FunctionDeclaration | ArrowFunction | FunctionExpression;
}

export interface JsxPropBundleInfo {
  propName: string;
  properties: string[];           // Known property names in the object
  isObjectLiteral: boolean;       // True if inline object literal
  estimatedSize: number;          // Number of properties
}

export interface JsxChildInfo {
  componentName: string;
  props: Map<string, string>;
  line: number;
  bundleProps: JsxPropBundleInfo[];  // Props that are object bundles
}

let nodeIdCounter = 0;

function generateId(prefix: string): string {
  return `${prefix}_${++nodeIdCounter}`;
}

export function resetIdCounter(): void {
  nodeIdCounter = 0;
}

function isReactComponent(name: string): boolean {
  return /^[A-Z]/.test(name);
}

function getHookStateName(callExpr: CallExpression): string | null {
  // Navigate up through NonNullExpression or other wrapper nodes
  let currentNode: Node | undefined = callExpr.getParent();

  while (currentNode && (
    Node.isNonNullExpression(currentNode) ||
    Node.isAsExpression(currentNode) ||
    Node.isParenthesizedExpression(currentNode)
  )) {
    currentNode = currentNode.getParent();
  }

  if (currentNode && Node.isVariableDeclaration(currentNode)) {
    const nameNode = currentNode.getNameNode();
    if (Node.isArrayBindingPattern(nameNode)) {
      const elements = nameNode.getElements();
      if (elements.length > 0) {
        const first = elements[0];
        if (Node.isBindingElement(first)) {
          return first.getName();
        }
      }
    } else if (Node.isIdentifier(nameNode)) {
      return nameNode.getText();
    } else if (Node.isObjectBindingPattern(nameNode)) {
      // Handle destructuring: const { user, settings } = useContext(...)
      // Return a joined name of destructured fields
      const names: string[] = [];
      for (const element of nameNode.getElements()) {
        if (Node.isBindingElement(element)) {
          names.push(element.getName());
        }
      }
      return names.length > 0 ? names.join(', ') : null;
    }
  }

  return null;
}

function getColumnNumber(node: { getStart: () => number; getStartLineNumber: () => number; getSourceFile: () => SourceFile }): number {
  const sourceFile = node.getSourceFile();
  const pos = node.getStart();
  const lineNumber = node.getStartLineNumber();
  const text = sourceFile.getFullText();

  // Find the start of the line
  let lineStart = 0;
  let currentLine = 1;
  for (let i = 0; i < pos && i < text.length; i++) {
    if (text[i] === '\n') {
      currentLine++;
      if (currentLine === lineNumber) {
        lineStart = i + 1;
        break;
      }
    }
  }

  return pos - lineStart;
}

function extractUseStateCall(callExpr: CallExpression, filePath: string): StateNode | null {
  const name = getHookStateName(callExpr);
  if (!name) return null;

  const args = callExpr.getArguments();
  const firstArg = args[0];
  const initialValue = firstArg ? firstArg.getText() : undefined;

  return {
    id: generateId('state'),
    type: 'useState',
    name,
    filePath,
    line: callExpr.getStartLineNumber(),
    column: getColumnNumber(callExpr),
    initialValue,
  };
}

function extractUseReducerCall(callExpr: CallExpression, filePath: string): StateNode | null {
  const name = getHookStateName(callExpr);
  if (!name) return null;

  return {
    id: generateId('state'),
    type: 'useReducer',
    name,
    filePath,
    line: callExpr.getStartLineNumber(),
    column: getColumnNumber(callExpr),
  };
}

function extractUseContextCall(callExpr: CallExpression, filePath: string): StateNode | null {
  const name = getHookStateName(callExpr);
  if (!name) return null;

  const args = callExpr.getArguments();
  const firstArg = args[0];
  const contextName = firstArg ? firstArg.getText() : 'UnknownContext';

  return {
    id: generateId('state'),
    type: 'useContext',
    name,
    filePath,
    line: callExpr.getStartLineNumber(),
    column: getColumnNumber(callExpr),
    initialValue: contextName,
  };
}

// Built-in React hooks that we handle separately or ignore
const REACT_HOOKS = new Set([
  'useState', 'useReducer', 'useContext', 'useEffect', 'useLayoutEffect',
  'useMemo', 'useCallback', 'useRef', 'useImperativeHandle', 'useDebugValue',
  'useDeferredValue', 'useTransition', 'useId', 'useSyncExternalStore',
  'useInsertionEffect'
]);

function isCustomHook(name: string): boolean {
  return name.startsWith('use') && name.length > 3 && !REACT_HOOKS.has(name);
}

function extractZustandStore(callExpr: CallExpression, filePath: string): StateNode | null {
  const name = getHookStateName(callExpr);
  if (!name) return null;

  // Zustand useStore hooks typically end with 'Store' or match useXxxStore pattern
  const expr = callExpr.getExpression();
  const callName = expr.getText();

  // Check for zustand selectors: useStore((state) => state.xxx) or useBearStore()
  const args = callExpr.getArguments();
  let selectorInfo = '';
  if (args.length > 0) {
    const firstArg = args[0];
    if (firstArg) {
      selectorInfo = firstArg.getText();
    }
  }

  return {
    id: generateId('state'),
    type: 'zustand',
    name,
    filePath,
    line: callExpr.getStartLineNumber(),
    column: getColumnNumber(callExpr),
    storeName: callName,
    initialValue: selectorInfo || undefined,
  };
}

function extractReduxSelector(callExpr: CallExpression, filePath: string): StateNode | null {
  const name = getHookStateName(callExpr);
  if (!name) return null;

  const args = callExpr.getArguments();
  let selectorInfo = '';
  if (args.length > 0) {
    const firstArg = args[0];
    if (firstArg) {
      selectorInfo = firstArg.getText();
    }
  }

  return {
    id: generateId('state'),
    type: 'redux',
    name,
    filePath,
    line: callExpr.getStartLineNumber(),
    column: getColumnNumber(callExpr),
    initialValue: selectorInfo || undefined,
  };
}

function extractReduxDispatch(callExpr: CallExpression, filePath: string): StateNode | null {
  const name = getHookStateName(callExpr);
  if (!name) return null;

  return {
    id: generateId('state'),
    type: 'redux',
    name,
    filePath,
    line: callExpr.getStartLineNumber(),
    column: getColumnNumber(callExpr),
    initialValue: 'dispatch',
  };
}

function extractCustomHook(callExpr: CallExpression, filePath: string, hookName: string): StateNode | null {
  const name = getHookStateName(callExpr);
  if (!name) return null;

  return {
    id: generateId('state'),
    type: 'customHook',
    name,
    filePath,
    line: callExpr.getStartLineNumber(),
    column: getColumnNumber(callExpr),
    hookName,
  };
}

// Common provider component names that wrap context
const KNOWN_PROVIDER_NAMES = new Set([
  'Provider',
  'ThemeProvider',
  'StoreProvider',
  'AuthProvider',
  'QueryClientProvider',
  'ReduxProvider',
  'ApolloProvider',
  'ConfigProvider',
  'I18nProvider',
  'IntlProvider',
  'RouterProvider',
  'SessionProvider',
  'UserProvider',
]);

function extractContextProvider(jsxElement: JsxOpeningElement | JsxSelfClosingElement): ContextInfo | null {
  const tagName = jsxElement.getTagNameNode().getText();

  // Pattern 1: <ContextName.Provider value={...}>
  if (tagName.endsWith('.Provider')) {
    const contextName = tagName.replace('.Provider', '');
    const valueAttr = jsxElement.getAttribute('value');
    let providerValue: string | undefined;

    if (valueAttr && Node.isJsxAttribute(valueAttr)) {
      const initializer = valueAttr.getInitializer();
      if (initializer) {
        providerValue = initializer.getText();
      }
    }

    return {
      contextId: generateId('context'),
      contextName,
      providerValue,
    };
  }

  // Pattern 2: Known provider component names like <ThemeProvider>, <Provider>, etc.
  if (KNOWN_PROVIDER_NAMES.has(tagName) || tagName.endsWith('Provider')) {
    // Extract context name from tag (remove Provider suffix if present)
    const contextName = tagName.endsWith('Provider') && tagName !== 'Provider'
      ? tagName.replace(/Provider$/, '')
      : tagName;

    // Try to get the value prop for context providers
    const valueAttr = jsxElement.getAttribute('value');
    let providerValue: string | undefined;

    if (valueAttr && Node.isJsxAttribute(valueAttr)) {
      const initializer = valueAttr.getInitializer();
      if (initializer) {
        providerValue = initializer.getText();
      }
    }

    // For redux-style Provider, look for 'store' prop
    const storeAttr = jsxElement.getAttribute('store');
    if (storeAttr && Node.isJsxAttribute(storeAttr)) {
      const initializer = storeAttr.getInitializer();
      if (initializer) {
        providerValue = providerValue || initializer.getText();
      }
    }

    // For other providers, look for common prop names
    const commonProps = ['client', 'theme', 'config', 'context'];
    for (const propName of commonProps) {
      if (providerValue) break;
      const attr = jsxElement.getAttribute(propName);
      if (attr && Node.isJsxAttribute(attr)) {
        const initializer = attr.getInitializer();
        if (initializer) {
          providerValue = initializer.getText();
        }
      }
    }

    return {
      contextId: generateId('context'),
      contextName,
      providerValue,
    };
  }

  return null;
}

/**
 * Extracts property names from an object literal expression
 */
function extractObjectLiteralProperties(objLiteral: ObjectLiteralExpression): string[] {
  const properties: string[] = [];

  for (const prop of objLiteral.getProperties()) {
    if (Node.isPropertyAssignment(prop)) {
      properties.push(prop.getName());
    } else if (Node.isShorthandPropertyAssignment(prop)) {
      properties.push(prop.getName());
    } else if (Node.isSpreadAssignment(prop)) {
      // Spread in object literal - we can't easily know what it contains
      properties.push('...spread');
    }
  }

  return properties;
}

/**
 * Heuristic names that suggest a prop is likely a bundle
 */
const BUNDLE_NAME_PATTERNS = [
  /data$/i,
  /config$/i,
  /options$/i,
  /info$/i,
  /value$/i,
  /state$/i,
  /props$/i,
  /settings$/i,
  /params$/i,
  /context$/i,
  /fields$/i,
  /form$/i,
];

function looksLikeBundleName(name: string): boolean {
  return BUNDLE_NAME_PATTERNS.some(pattern => pattern.test(name));
}

function extractJsxChild(jsxElement: JsxOpeningElement | JsxSelfClosingElement): JsxChildInfo | null {
  const tagName = jsxElement.getTagNameNode().getText();

  // Skip non-components
  if (!isReactComponent(tagName)) {
    return null;
  }

  // Skip context providers and consumers - they're tracked separately
  if (tagName.endsWith('.Provider') ||
      tagName.endsWith('.Consumer') ||
      KNOWN_PROVIDER_NAMES.has(tagName) ||
      tagName.endsWith('Provider')) {
    return null;
  }

  const props = new Map<string, string>();
  const bundleProps: JsxPropBundleInfo[] = [];

  for (const attr of jsxElement.getAttributes()) {
    if (Node.isJsxAttribute(attr)) {
      const name = attr.getNameNode().getText();
      const initializer = attr.getInitializer();

      if (initializer) {
        if (Node.isJsxExpression(initializer)) {
          const expr = initializer.getExpression();
          const exprText = expr ? expr.getText() : '';
          props.set(name, exprText);

          // Check if the expression is an object literal
          if (expr && Node.isObjectLiteralExpression(expr)) {
            const properties = extractObjectLiteralProperties(expr);
            if (properties.length > 0) {
              bundleProps.push({
                propName: name,
                properties,
                isObjectLiteral: true,
                estimatedSize: properties.filter(p => p !== '...spread').length,
              });
            }
          }
          // Check if the prop name suggests it's a bundle (even if just an identifier)
          else if (expr && Node.isIdentifier(expr) && looksLikeBundleName(name)) {
            bundleProps.push({
              propName: name,
              properties: [],  // Unknown - identifier reference
              isObjectLiteral: false,
              estimatedSize: -1,  // Unknown size
            });
          }
        } else {
          props.set(name, initializer.getText());
        }
      } else {
        props.set(name, 'true');
      }
    } else if (Node.isJsxSpreadAttribute(attr)) {
      props.set('...spread', attr.getExpression().getText());

      // Spread attributes are always potential bundles
      bundleProps.push({
        propName: '...spread',
        properties: [],
        isObjectLiteral: false,
        estimatedSize: -1,
      });
    }
  }

  return {
    componentName: tagName,
    props,
    line: jsxElement.getStartLineNumber(),
    bundleProps,
  };
}

function extractPropsFromFunction(
  func: FunctionDeclaration | ArrowFunction | FunctionExpression
): PropDefinition[] {
  const props: PropDefinition[] = [];
  const params = func.getParameters();
  const firstParam = params[0];

  if (!firstParam) return props;

  const nameNode = firstParam.getNameNode();

  if (Node.isObjectBindingPattern(nameNode)) {
    for (const element of nameNode.getElements()) {
      if (Node.isBindingElement(element)) {
        props.push({
          name: element.getName(),
          type: element.getType().getText(),
          isUsed: true,
          passedTo: [],
        });
      }
    }
  } else if (Node.isIdentifier(nameNode)) {
    const typeNode = firstParam.getTypeNode();
    if (typeNode) {
      const typeText = typeNode.getText();
      const propsMatch = typeText.match(/\{([^}]+)\}/);
      const propsStr = propsMatch?.[1];
      if (propsStr) {
        const propMatches = propsStr.matchAll(/(\w+)\s*[?]?\s*:/g);
        for (const match of propMatches) {
          const propName = match[1];
          if (propName) {
            props.push({
              name: propName,
              isUsed: true,
              passedTo: [],
            });
          }
        }
      }
    }
  }

  return props;
}

function parseComponentFunction(
  func: FunctionDeclaration | ArrowFunction | FunctionExpression,
  name: string,
  filePath: string,
  isExported: boolean
): ParsedComponent | null {
  if (!isReactComponent(name)) return null;

  const stateNodes: StateNode[] = [];
  const contextProviders: ContextInfo[] = [];
  const contextConsumers: string[] = [];
  const jsxChildren: JsxChildInfo[] = [];

  const callExprs = func.getDescendantsOfKind(SyntaxKind.CallExpression);

  for (const callExpr of callExprs) {
    const expr = callExpr.getExpression();
    const callName = expr.getText();

    if (callName === 'useState') {
      const state = extractUseStateCall(callExpr, filePath);
      if (state) stateNodes.push(state);
    } else if (callName === 'useReducer') {
      const state = extractUseReducerCall(callExpr, filePath);
      if (state) stateNodes.push(state);
    } else if (callName === 'useContext') {
      const state = extractUseContextCall(callExpr, filePath);
      if (state) {
        stateNodes.push(state);
        contextConsumers.push(state.initialValue || 'UnknownContext');
      }
    } else if (callName === 'useSelector') {
      // Redux useSelector
      const state = extractReduxSelector(callExpr, filePath);
      if (state) stateNodes.push(state);
    } else if (callName === 'useDispatch') {
      // Redux useDispatch
      const state = extractReduxDispatch(callExpr, filePath);
      if (state) stateNodes.push(state);
    } else if (callName.endsWith('Store') && callName.startsWith('use')) {
      // Zustand store hook pattern: useBearStore, useUserStore, etc.
      const state = extractZustandStore(callExpr, filePath);
      if (state) stateNodes.push(state);
    } else if (callName === 'useStore') {
      // Generic zustand useStore
      const state = extractZustandStore(callExpr, filePath);
      if (state) stateNodes.push(state);
    } else if (isCustomHook(callName)) {
      // Custom hook
      const state = extractCustomHook(callExpr, filePath, callName);
      if (state) stateNodes.push(state);
    }
  }

  const jsxOpeningElements = func.getDescendantsOfKind(SyntaxKind.JsxOpeningElement);
  const jsxSelfClosingElements = func.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement);

  for (const jsx of [...jsxOpeningElements, ...jsxSelfClosingElements]) {
    const provider = extractContextProvider(jsx);
    if (provider) {
      contextProviders.push(provider);
    }

    const child = extractJsxChild(jsx);
    if (child) {
      jsxChildren.push(child);
    }
  }

  const props = extractPropsFromFunction(func);

  const component: ComponentNode = {
    id: generateId('component'),
    name,
    filePath,
    line: func.getStartLineNumber(),
    column: getColumnNumber(func),
    stateUsed: [],
    stateProvided: stateNodes,
    contextProviders,
    contextConsumers,
    props,
    isExported,
  };

  return { component, stateNodes, jsxChildren, functionNode: func };
}

/**
 * Determines the usage context of an identifier within a component
 */
function getUsageContext(identifier: Identifier): 'jsx-attribute' | 'jsx-expression' | 'effect' | 'callback' | 'logic' | 'assignment' | 'unknown' {
  let current: Node | undefined = identifier.getParent();

  while (current) {
    // JSX attribute (prop passed to child)
    if (Node.isJsxAttribute(current)) {
      return 'jsx-attribute';
    }

    // JSX expression in render (actual usage in render)
    if (Node.isJsxExpression(current)) {
      // Check if this JSX expression is inside an attribute (which means it's a prop to child)
      const parent = current.getParent();
      if (parent && Node.isJsxAttribute(parent)) {
        return 'jsx-attribute';
      }
      return 'jsx-expression';
    }

    // Hook calls
    if (Node.isCallExpression(current)) {
      const expr = current.getExpression();
      const callName = expr.getText();

      if (callName === 'useEffect' || callName === 'useLayoutEffect') {
        return 'effect';
      }
      if (callName === 'useCallback' || callName === 'useMemo') {
        return 'callback';
      }
    }

    // Variable declaration (transformation)
    if (Node.isVariableDeclaration(current)) {
      return 'assignment';
    }

    // Conditional/logical expressions
    if (Node.isIfStatement(current) ||
        Node.isConditionalExpression(current) ||
        Node.isBinaryExpression(current)) {
      return 'logic';
    }

    current = current.getParent();
  }

  return 'unknown';
}

/**
 * Analyzes how props are used within a component function
 */
export function analyzePropsUsage(
  func: FunctionDeclaration | ArrowFunction | FunctionExpression,
  propNames: string[]
): PropUsage[] {
  const usages: PropUsage[] = [];

  for (const propName of propNames) {
    const usage: PropUsage = {
      propName,
      usedInRender: false,
      passedToChild: false,
      usedInCallback: false,
      usedInEffect: false,
      usedInLogic: false,
      transformed: false,
    };

    // Find all identifier references to this prop name
    const identifiers = func.getDescendantsOfKind(SyntaxKind.Identifier)
      .filter(id => id.getText() === propName);

    for (const identifier of identifiers) {
      // Skip the prop declaration itself (in the function parameter)
      const parent = identifier.getParent();
      if (parent && Node.isBindingElement(parent)) {
        continue;
      }

      const context = getUsageContext(identifier);

      switch (context) {
        case 'jsx-attribute':
          usage.passedToChild = true;
          break;
        case 'jsx-expression':
          usage.usedInRender = true;
          break;
        case 'effect':
          usage.usedInEffect = true;
          break;
        case 'callback':
          usage.usedInCallback = true;
          break;
        case 'logic':
          usage.usedInLogic = true;
          break;
        case 'assignment':
          usage.transformed = true;
          break;
      }
    }

    usages.push(usage);
  }

  return usages;
}

// ============================================
// Enhanced Context Usage Extraction
// ============================================

/**
 * Extracts enhanced information about useContext calls, including destructured fields
 */
export function extractEnhancedContextUsage(
  func: FunctionDeclaration | ArrowFunction | FunctionExpression,
  filePath: string
): EnhancedContextUsage[] {
  const usages: EnhancedContextUsage[] = [];

  const callExprs = func.getDescendantsOfKind(SyntaxKind.CallExpression);

  for (const callExpr of callExprs) {
    const expr = callExpr.getExpression();
    const callName = expr.getText();

    if (callName !== 'useContext') continue;

    const args = callExpr.getArguments();
    const contextName = args[0]?.getText() || 'UnknownContext';

    // Find what variable(s) receive the context value
    // Navigate up through NonNullExpression or other wrapper nodes to find VariableDeclaration
    let currentNode: Node | undefined = callExpr.getParent();
    let variableName = '';
    const destructuredFields: string[] = [];

    // Skip through NonNullExpression, AsExpression, etc.
    while (currentNode && (
      Node.isNonNullExpression(currentNode) ||
      Node.isAsExpression(currentNode) ||
      Node.isParenthesizedExpression(currentNode)
    )) {
      currentNode = currentNode.getParent();
    }

    if (currentNode && Node.isVariableDeclaration(currentNode)) {
      const nameNode = currentNode.getNameNode();

      // const { user, settings } = useContext(MyContext)
      if (Node.isObjectBindingPattern(nameNode)) {
        variableName = '__destructured__';
        for (const element of nameNode.getElements()) {
          if (Node.isBindingElement(element)) {
            const propName = element.getPropertyNameNode()?.getText() || element.getName();
            destructuredFields.push(propName);
          }
        }
      }
      // const ctx = useContext(MyContext)
      else if (Node.isIdentifier(nameNode)) {
        variableName = nameNode.getText();
      }
    }

    // Track which JSX children receive these context values
    const passedAsProps: string[] = [];

    if (destructuredFields.length > 0) {
      // Find JSX elements where destructured fields are passed as props
      const jsxElements = [
        ...func.getDescendantsOfKind(SyntaxKind.JsxOpeningElement),
        ...func.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement),
      ];

      for (const jsx of jsxElements) {
        const tagName = jsx.getTagNameNode().getText();
        if (!isReactComponent(tagName)) continue;

        for (const attr of jsx.getAttributes()) {
          if (!Node.isJsxAttribute(attr)) continue;

          const attrName = attr.getNameNode().getText();
          const initializer = attr.getInitializer();

          if (initializer && Node.isJsxExpression(initializer)) {
            const exprNode = initializer.getExpression();
            if (exprNode && Node.isIdentifier(exprNode)) {
              const valueText = exprNode.getText();
              // Check if this prop value matches a destructured context field
              if (destructuredFields.includes(valueText)) {
                passedAsProps.push(`${tagName}:${attrName}`);
              }
            }
          }
        }
      }
    } else if (variableName) {
      // Check if the context variable itself is passed to children
      const jsxElements = [
        ...func.getDescendantsOfKind(SyntaxKind.JsxOpeningElement),
        ...func.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement),
      ];

      for (const jsx of jsxElements) {
        const tagName = jsx.getTagNameNode().getText();
        if (!isReactComponent(tagName)) continue;

        for (const attr of jsx.getAttributes()) {
          if (!Node.isJsxAttribute(attr)) continue;

          const attrName = attr.getNameNode().getText();
          const initializer = attr.getInitializer();

          if (initializer && Node.isJsxExpression(initializer)) {
            const exprNode = initializer.getExpression();
            if (exprNode) {
              const valueText = exprNode.getText();
              // Check if this matches the context variable or a property access on it
              if (valueText === variableName || valueText.startsWith(`${variableName}.`)) {
                passedAsProps.push(`${tagName}:${attrName}`);
              }
            }
          }
        }
      }
    }

    usages.push({
      contextName,
      variableName,
      destructuredFields,
      usedInJsx: false, // Could enhance this later
      passedAsProps,
      line: callExpr.getStartLineNumber(),
    });
  }

  return usages;
}

// ============================================
// Scope Map and Rename Tracking
// ============================================

/**
 * Builds a scope map tracking how variables relate to props
 */
export function buildScopeMap(
  func: FunctionDeclaration | ArrowFunction | FunctionExpression,
  propNames: string[],
  componentId: string,
  componentName: string,
  filePath: string
): { scopeMap: Map<string, ScopeEntry>; renames: PropRename[] } {
  const scopeMap = new Map<string, ScopeEntry>();
  const renames: PropRename[] = [];
  const propSet = new Set(propNames);

  // First, track destructuring from props parameter
  const params = func.getParameters();
  const firstParam = params[0];

  if (firstParam) {
    const nameNode = firstParam.getNameNode();

    // Handle: function Component({ user: userData, ...rest })
    if (Node.isObjectBindingPattern(nameNode)) {
      for (const element of nameNode.getElements()) {
        if (Node.isBindingElement(element)) {
          const localName = element.getName();
          const propNameNode = element.getPropertyNameNode();

          if (propNameNode) {
            // This is a rename: { originalProp: renamedLocal }
            const originalPropName = propNameNode.getText();
            scopeMap.set(localName, {
              type: 'destructure',
              originalName: originalPropName,
              sourceProp: originalPropName,
              line: element.getStartLineNumber(),
            });

            renames.push({
              fromName: originalPropName,
              toName: localName,
              componentId,
              componentName,
              renameType: 'destructure',
              line: element.getStartLineNumber(),
              filePath,
            });
          }
        }
      }
    }
  }

  // Track variable declarations that alias props
  const varDecls = func.getDescendantsOfKind(SyntaxKind.VariableDeclaration);

  for (const decl of varDecls) {
    const localName = decl.getName();
    const initializer = decl.getInitializer();

    if (!initializer) continue;

    // Pattern: const userData = props.user
    if (Node.isPropertyAccessExpression(initializer)) {
      const objExpr = initializer.getExpression();
      const propAccess = initializer.getName();

      // Direct props access
      if (objExpr.getText() === 'props' && propSet.has(propAccess)) {
        scopeMap.set(localName, {
          type: 'propAlias',
          originalName: propAccess,
          sourceProp: propAccess,
          line: decl.getStartLineNumber(),
        });

        renames.push({
          fromName: propAccess,
          toName: localName,
          componentId,
          componentName,
          renameType: 'accessor',
          line: decl.getStartLineNumber(),
          filePath,
        });
      }
      // Could also check if objExpr is already in scopeMap (chained renames)
      else {
        const objName = objExpr.getText();
        const existingEntry = scopeMap.get(objName);
        if (existingEntry) {
          // This is a chained access: const x = aliasedProp.field
          scopeMap.set(localName, {
            type: 'computed',
            originalName: `${existingEntry.originalName}.${propAccess}`,
            sourceProp: existingEntry.sourceProp,
            line: decl.getStartLineNumber(),
          });
        }
      }
    }

    // Pattern: const { field1, field2 } = someProp (destructuring from a prop)
    // IMPORTANT: Check this BEFORE the simple identifier check to handle destructuring properly
    const nameNode = decl.getNameNode();
    if (Node.isObjectBindingPattern(nameNode) && Node.isIdentifier(initializer)) {
      const sourceName = initializer.getText();
      const sourceEntry = scopeMap.get(sourceName);
      const isFromProp = propSet.has(sourceName) || sourceEntry?.sourceProp;

      if (isFromProp) {
        for (const element of nameNode.getElements()) {
          if (Node.isBindingElement(element)) {
            const fieldName = element.getName();
            const propNameNode = element.getPropertyNameNode();
            const originalFieldName = propNameNode?.getText() || fieldName;

            scopeMap.set(fieldName, {
              type: 'destructure',
              originalName: `${sourceName}.${originalFieldName}`,
              sourceProp: sourceEntry?.sourceProp || sourceName,
              line: element.getStartLineNumber(),
            });

            if (propNameNode && originalFieldName !== fieldName) {
              renames.push({
                fromName: originalFieldName,
                toName: fieldName,
                componentId,
                componentName,
                renameType: 'destructure',
                line: element.getStartLineNumber(),
                filePath,
              });
            }
          }
        }
      }
      continue; // Skip the simple identifier check below
    }

    // Pattern: const userData = user (where user is a prop) - simple variable assignment
    if (Node.isIdentifier(initializer)) {
      const initName = initializer.getText();
      if (propSet.has(initName)) {
        scopeMap.set(localName, {
          type: 'propAlias',
          originalName: initName,
          sourceProp: initName,
          line: decl.getStartLineNumber(),
        });

        renames.push({
          fromName: initName,
          toName: localName,
          componentId,
          componentName,
          renameType: 'assignment',
          line: decl.getStartLineNumber(),
          filePath,
        });
      }
      // Or it could be aliasing an existing alias
      else {
        const existingEntry = scopeMap.get(initName);
        if (existingEntry && existingEntry.sourceProp) {
          scopeMap.set(localName, {
            type: 'propAlias',
            originalName: existingEntry.originalName,
            sourceProp: existingEntry.sourceProp,
            line: decl.getStartLineNumber(),
          });

          renames.push({
            fromName: initName,
            toName: localName,
            componentId,
            componentName,
            renameType: 'assignment',
            line: decl.getStartLineNumber(),
            filePath,
          });
        }
      }
    }
  }

  return { scopeMap, renames };
}

/**
 * Resolves a variable name to its original prop name using scope map
 */
export function resolveToOriginalProp(
  name: string,
  scopeMap: Map<string, ScopeEntry>,
  propNames: string[]
): string | null {
  // Direct prop match
  if (propNames.includes(name)) {
    return name;
  }

  // Look up in scope map
  const entry = scopeMap.get(name);
  if (entry?.sourceProp) {
    return entry.sourceProp;
  }

  return null;
}

export function parseFile(sourceFile: SourceFile): ParsedComponent[] {
  const filePath = sourceFile.getFilePath();
  const components: ParsedComponent[] = [];
  const exportedNames = new Set<string>();

  for (const exportDecl of sourceFile.getExportDeclarations()) {
    for (const namedExport of exportDecl.getNamedExports()) {
      exportedNames.add(namedExport.getName());
    }
  }

  const defaultExport = sourceFile.getDefaultExportSymbol();
  if (defaultExport) {
    const declarations = defaultExport.getDeclarations();
    for (const decl of declarations) {
      if (Node.isFunctionDeclaration(decl)) {
        const name = decl.getName();
        if (name) exportedNames.add(name);
      }
    }
  }

  for (const funcDecl of sourceFile.getFunctions()) {
    const name = funcDecl.getName();
    if (!name) continue;

    const isExported = funcDecl.isExported() || exportedNames.has(name);
    const parsed = parseComponentFunction(funcDecl, name, filePath, isExported);
    if (parsed) components.push(parsed);
  }

  for (const varStmt of sourceFile.getVariableStatements()) {
    const isExported = varStmt.isExported();

    for (const decl of varStmt.getDeclarations()) {
      const name = decl.getName();
      const initializer = decl.getInitializer();

      if (!initializer) continue;

      if (Node.isArrowFunction(initializer) || Node.isFunctionExpression(initializer)) {
        const declExported = isExported || exportedNames.has(name);
        const parsed = parseComponentFunction(initializer, name, filePath, declExported);
        if (parsed) components.push(parsed);
      }
    }
  }

  return components;
}
