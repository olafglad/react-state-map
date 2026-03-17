# React State Map

**Instantly visualize how state flows through your React application.**

React State Map analyzes your codebase and generates interactive diagrams showing exactly how state, props, and context flow between components. No runtime dependencies, no code changes required - just pure static analysis.

![React State Map Demo](https://raw.githubusercontent.com/olafglad/react-state-map/main/packages/vscode-extension/images/demo.gif)

## Features

### State Flow Visualization
See at a glance which components own state and how it propagates through your component tree.

- **Blue nodes** = Components with local state (useState, useReducer, Redux, Zustand, etc.)
- **Green nodes** = Stateless components (receive props only)
- **Green arrows** = Props flow
- **Purple dashed arrows** = Context flow
- **Directory clustering** = Components grouped by folder structure

### Context View
Visualize your React Context providers and consumers with color-coded relationships.

- **Color-coded contexts**: Each context gets a unique color in edges and legend
- **Hierarchy lines**: Gray lines show parent-child relationships
- **Context edges**: Dashed lines show provider-to-consumer flow
- Switch to the Context tab to focus on context relationships

### Search & Path-Finding
Quickly find components and trace data flow paths.

- **Fuzzy search**: Find components by name, file path, or props
- **Real-time results** with keyboard navigation (Arrow keys + Enter)
- **Path finding**: Click the Path button, then click two components to find the shortest path
- **Focus mode**: Isolate a component and its direct neighbors

### Semantic Zoom
Navigate large codebases with zoom-level-aware detail.

- **Zoom out**: See directory-level overview with inter-directory connection weights
- **Zoom in**: See full component-level detail with all edges
- **Three levels**: Far (directories), Medium (reduced detail), Close (full detail)

### Edge Layer Controls
Control which edge types are visible with the floating Layers panel.

- **Toggle independently**: Props, Context, Hierarchy, and Drilling edges
- **View-aware**: Different toggles available per view (State Flow, Context, Drilling)
- **Draggable panel**: Position the Layers panel anywhere on the canvas

### Collapsible Subtrees
Reduce visual complexity by collapsing component subtrees.

- **Double-click** any node with children to collapse/expand
- **+N badge** on the node label shows how many children are hidden
- Great for focusing on specific parts of large codebases

### Prop Drilling Detection
Automatically detect when props are passed through too many component layers.

![Prop Drilling Detection](https://raw.githubusercontent.com/olafglad/react-state-map/main/packages/vscode-extension/images/prop-drilling.png)

- Color-coded drilling chains: Blue (defines state), Orange (pass-through), Green (uses state)
- Configurable threshold (default: 3 hops)
- Switch to the Drilling tab to see all drilling paths side by side

### Component Details Panel
Click any component to see comprehensive details in the sidebar.

![Component Details Panel](https://raw.githubusercontent.com/olafglad/react-state-map/main/packages/vscode-extension/images/component-details.png)

- **State Defined**: All state hooks in the component
- **Context Consumers**: Which contexts the component uses
- **Prop Metrics**: Usage bar showing consumed/passed/ignored ratio
- **Props**: Incoming props with types
- **Data Flow**: Where state comes from and goes to
- **Focus button**: Isolate this component and its neighbors
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
- **Zoom**: Scroll wheel (with semantic zoom levels)
- **Search**: Type in the search bar to find components
- **Path Finding**: Click Path button, then click two nodes
- **Focus**: Click Focus in the sidebar to isolate a component's neighborhood
- **Edge Layers**: Toggle edge types in the floating Layers panel
- **Collapse/Expand**: Double-click nodes to toggle subtrees
- **Switch views**: Click tabs (State Flow / Context / Drilling)
- **Inspect**: Click any component node for details
- **Navigate**: Click file links to jump to source code
- **Refresh**: Click ↻ or save a file
- **State Persistence**: Your view, zoom, pan, edge toggles, and panel state persist across refreshes

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
npx @react-state-map/cli ./src --output state-map.html
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
