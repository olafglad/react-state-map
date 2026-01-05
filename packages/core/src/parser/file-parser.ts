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
} from 'ts-morph';
import type { StateNode, ComponentNode, PropDefinition, ContextInfo } from '../types.js';

interface ParsedComponent {
  component: ComponentNode;
  stateNodes: StateNode[];
  jsxChildren: JsxChildInfo[];
}

interface JsxChildInfo {
  componentName: string;
  props: Map<string, string>;
  line: number;
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
  const parent = callExpr.getParent();

  if (Node.isVariableDeclaration(parent)) {
    const nameNode = parent.getNameNode();
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

function extractContextProvider(jsxElement: JsxOpeningElement | JsxSelfClosingElement): ContextInfo | null {
  const tagName = jsxElement.getTagNameNode().getText();

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

  return null;
}

function extractJsxChild(jsxElement: JsxOpeningElement | JsxSelfClosingElement): JsxChildInfo | null {
  const tagName = jsxElement.getTagNameNode().getText();

  if (!isReactComponent(tagName) || tagName.endsWith('.Provider') || tagName.endsWith('.Consumer')) {
    return null;
  }

  const props = new Map<string, string>();

  for (const attr of jsxElement.getAttributes()) {
    if (Node.isJsxAttribute(attr)) {
      const name = attr.getNameNode().getText();
      const initializer = attr.getInitializer();
      if (initializer) {
        if (Node.isJsxExpression(initializer)) {
          const expr = initializer.getExpression();
          props.set(name, expr ? expr.getText() : '');
        } else {
          props.set(name, initializer.getText());
        }
      } else {
        props.set(name, 'true');
      }
    } else if (Node.isJsxSpreadAttribute(attr)) {
      props.set('...spread', attr.getExpression().getText());
    }
  }

  return {
    componentName: tagName,
    props,
    line: jsxElement.getStartLineNumber(),
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

  return { component, stateNodes, jsxChildren };
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
