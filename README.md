# React State Map

**Instantly visualize how state flows through your React application.**

React State Map analyzes your codebase and generates interactive diagrams showing exactly how state, props, and context flow between components. No runtime dependencies, no code changes required - just pure static analysis.

![React State Map Demo](https://raw.githubusercontent.com/olafglad/react-state-map/main/packages/vscode-extension/images/demo.gif)

## Features

- **State Flow Visualization**: See which components own state and how it propagates through props
- **Context Boundaries**: Visualize React Context providers with clustered consumers
- **Prop Drilling Detection**: Automatically detect props passed through too many layers
- **Pass-Through Analysis**: Classify components as consumer, passthrough, transformer, or mixed
- **Bundle Detection**: Warn about large object props (5+ properties) being passed through
- **Context Leak Detection**: Find components that extract from useContext and re-pass as props
- **Rename Tracking**: Track props through destructuring renames across components
- **Directory Clustering**: Components automatically grouped by directory structure
- **Collapsible Subtrees**: Collapse component subtrees to reduce visual complexity
- **Click-to-Navigate**: Click any component to jump to its source code
- **Multiple State Libraries**: Supports useState, useReducer, useContext, Redux, Zustand, and custom hooks

![State Flow View](https://raw.githubusercontent.com/olafglad/react-state-map/main/packages/vscode-extension/images/state-flow.png)

## Quick Start

### Option 1: VS Code Extension (Recommended)

Install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=OlafGlad.react-state-map-vscode) and get real-time visualization while you code.

### Option 2: CLI

```bash
# Run directly with npx (no install required)
npx @react-state-map/cli ./src

# Opens an interactive HTML visualization in your browser
```

## Packages

| Package | Description | Links |
|---------|-------------|-------|
| [react-state-map-vscode](./packages/vscode-extension) | VS Code extension with real-time visualization | [Marketplace](https://marketplace.visualstudio.com/items?itemName=OlafGlad.react-state-map-vscode) |
| [@react-state-map/cli](./packages/cli) | Command-line tool for generating visualizations | [npm](https://www.npmjs.com/package/@react-state-map/cli) |
| [@react-state-map/core](./packages/core) | Core parsing library for programmatic use | [npm](https://www.npmjs.com/package/@react-state-map/core) |

## What It Detects

| State Type | Detection |
|------------|-----------|
| `useState` | Variable name, initial value |
| `useReducer` | Reducer name, initial state |
| `useContext` | Context name, provider/consumer relationships |
| **Redux** | `useSelector`, `useDispatch` |
| **Zustand** | `useStore`, `useXxxStore` patterns |
| **Custom Hooks** | Any `useXxx` hook calls |

## Anti-Pattern Detection

React State Map automatically detects common anti-patterns and displays warning badges:

| Badge | Detection | Description |
|-------|-----------|-------------|
| `N drilling` | Prop Drilling | Props passed through 3+ components without being used |
| `N passthrough` | Pass-Through Components | Components that only forward props without consuming them |
| `N bundles` | Large Prop Bundles | Object props with 5+ properties being passed through |
| `N leaks` | Context Leaks | useContext values extracted and re-passed as props |
| `N renames` | Prop Renames | Props renamed 2+ times through destructuring |

## Visualization Guide

| Element | Meaning |
|---------|---------|
| Blue nodes | Components with local state |
| Green nodes | Stateless components |
| Green arrows | Props flow |
| Purple dashed arrows | Context flow |
| Purple boundaries | Context provider scope |
| Gray dashed boundaries | Directory clusters |
| ▼/▶ indicators | Expandable/collapsible nodes |
| +N badge | Number of hidden children |
| Red highlights | Prop drilling paths |
| Role badges | consumer / passthrough / transformer / mixed |

## Use Cases

- **"Where does this prop come from?"** - Visual trace from source to destination
- **"Which components use this context?"** - Context boundary visualization
- **"Is this prop drilling?"** - Automatic detection with hop count
- **"What state does this component have?"** - Click any node to see details
- **CI/CD documentation** - Generate HTML reports automatically
- **Code reviews** - Share state flow visualizations

## Requirements

- Node.js 18.0.0 or higher
- React project with `.tsx` or `.jsx` files

## License

MIT

## Contributing

[Open an issue](https://github.com/olafglad/react-state-map/issues) or submit a pull request!
