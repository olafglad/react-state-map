# @react-state-map/core

Core parsing and graph building library for [React State Map](https://github.com/olafglad/react-state-map).

This package provides the static analysis engine that parses React codebases and builds component graphs with state flow information.

## Installation

```bash
npm install @react-state-map/core
```

## Usage

```typescript
import { ReactParser, serializeGraph, GraphAnalyzer } from '@react-state-map/core';

// Parse a React project
const parser = new ReactParser({
  rootDir: './src',
  drillingThreshold: 3,
  exclude: ['**/node_modules/**', '**/dist/**'],
  include: ['**/*.tsx', '**/*.jsx'],
});

const result = parser.parse();

// Serialize the graph for visualization
const graph = serializeGraph(result.graph);

// Analyze the graph
const analyzer = new GraphAnalyzer(result.graph);
const summary = analyzer.getSummary();

console.log(`Components: ${summary.components.totalComponents}`);
console.log(`State nodes: ${summary.state.totalStateNodes}`);
console.log(`Edges: ${summary.flow.totalEdges}`);
```

## Features

- **Static Analysis**: Parses React components without executing code
- **State Detection**: Finds useState, useReducer, useContext, Redux, Zustand, and custom hooks
- **Graph Building**: Constructs a complete dependency graph of state flow
- **Prop Drilling Detection**: Identifies props passed through too many layers
- **Context Boundaries**: Maps React Context provider/consumer relationships
- **Pass-Through Analysis**: Classifies components as consumer, passthrough, transformer, or mixed
- **Bundle Detection**: Identifies large object props (5+ properties) being passed through
- **Context Leak Detection**: Finds components that extract from useContext and re-pass as props
- **Rename Tracking**: Tracks props through destructuring renames across components

## For Most Users

If you just want to visualize your React state flow, use the CLI instead:

```bash
npx @react-state-map/cli ./src
```

Or install the [VS Code extension](https://marketplace.visualstudio.com/items?itemName=OlafGlad.react-state-map-vscode).

## License

MIT
