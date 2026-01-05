# React State Map

**Instantly visualize how state flows through your React application.**

React State Map analyzes your codebase and generates interactive diagrams showing exactly how state, props, and context flow between components. No runtime dependencies, no code changes required - just pure static analysis.

![React State Map - State Flow View](https://raw.githubusercontent.com/olafglad/react-state-map/main/packages/vscode-extension/images/state-flow.png)

## Features

### State Flow Visualization
See at a glance which components own state and how it propagates through your component tree.

- **Blue nodes** = Components with local state (useState, useReducer, Redux, Zustand, etc.)
- **Green nodes** = Stateless components (receive props only)
- **Green arrows** = Props flow
- **Purple dashed arrows** = Context flow

### Context Boundary Detection
Visualize your React Context providers and see exactly which components are inside or outside each context boundary.

![Context Boundaries View](https://raw.githubusercontent.com/olafglad/react-state-map/main/packages/vscode-extension/images/context-boundaries.png)

- Dashed purple boundaries show context scope
- Nested contexts displayed with offset for clarity
- Easily spot components outside a context boundary

### Prop Drilling Detection
Automatically detect when props are passed through too many component layers.

![Prop Drilling View](https://raw.githubusercontent.com/olafglad/react-state-map/main/packages/vscode-extension/images/prop-drilling.png)

- Red highlights indicate prop drilling paths
- Configurable threshold (default: 3 hops)
- Clean codebase? You'll see the green checkmark!

### Component Details Panel
Click any component to see comprehensive details in the sidebar.

![Component Details](https://raw.githubusercontent.com/olafglad/react-state-map/main/packages/vscode-extension/images/component-details.png)

- **State Defined**: All state hooks in the component
- **Context Consumers**: Which contexts the component uses
- **Props**: Incoming props with types
- **Data Flow**: Where state comes from and goes to
- **Click to navigate**: Jump directly to the source file

### Comprehensive State Detection

| State Type | Detection |
|------------|-----------|
| `useState` | Variable name, initial value |
| `useReducer` | Reducer name, initial state |
| `useContext` | Context name, provider/consumer |
| **Redux** | `useSelector`, `useDispatch` |
| **Zustand** | `useStore`, `useXxxStore` patterns |
| **Custom Hooks** | Any `useXxx` hook calls |

## Quick Start

1. Open a React project in VS Code
2. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
3. Type **"React State Map"** and select **"Open Panel"**

That's it! The visualization updates automatically when you save files.

## Interactive Features

- **Pan**: Click and drag the canvas
- **Zoom**: Scroll wheel
- **Switch views**: Click tabs (State Flow / Context Boundaries / Prop Drilling)
- **Inspect**: Click any component node for details
- **Navigate**: Click file links to jump to source code
- **Refresh**: Click ↻ or save a file

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `reactStateMap.drillingThreshold` | `3` | Hops before flagging as prop drilling |
| `reactStateMap.exclude` | `["**/node_modules/**", ...]` | Glob patterns to exclude |
| `reactStateMap.include` | `["**/*.tsx", "**/*.jsx"]` | File patterns to analyze |
| `reactStateMap.autoRefresh` | `true` | Refresh on file save |

## Why React State Map?

| Challenge | Solution |
|-----------|----------|
| "Where does this prop come from?" | Visual trace from source to destination |
| "Which components use this context?" | Context boundary visualization |
| "Is this prop drilling?" | Automatic detection with hop count |
| "What state does this component have?" | Click to see all state at a glance |

## CLI Version

Also available as a CLI for CI/CD pipelines and documentation:

```bash
npx react-state-map ./src --output state-map.html
```

Generates a standalone HTML file you can open in any browser or include in documentation.

## Requirements

- VS Code 1.85.0 or higher
- React project with `.tsx` or `.jsx` files

## Feedback & Issues

Found a bug or have a feature request?

[Open an issue on GitHub](https://github.com/olafglad/react-state-map/issues)

---

**Made with Static Analysis** - No runtime overhead, no code changes, just insights.
