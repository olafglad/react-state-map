# React State Map

**Instantly visualize how state flows through your React application.**

React State Map analyzes your codebase and generates interactive diagrams showing exactly how state, props, and context flow between components. No runtime dependencies, no code changes required - just pure static analysis.

![React State Map Demo](https://raw.githubusercontent.com/olafglad/react-state-map/main/packages/vscode-extension/images/demo.gif)

## Installation

```bash
# Run directly with npx (no install required)
npx @react-state-map/cli ./src

# Or install globally
npm install -g @react-state-map/cli
```

## Usage

```bash
# Analyze current directory, output to state-map.html
react-state-map

# Analyze specific directory
react-state-map ./src

# Custom output file
react-state-map ./src --output my-state-map.html

# Output as JSON (for programmatic use)
react-state-map ./src --format json --output state.json

# Watch mode - auto-regenerate on file changes
react-state-map ./src --watch

# Don't auto-open in browser
react-state-map ./src --no-open

# Set prop drilling threshold
react-state-map ./src --threshold 4

# Include/exclude patterns
react-state-map ./src --include "**/*.tsx" --exclude "**/test/**"
```

## Options

| Option | Short | Default | Description |
|--------|-------|---------|-------------|
| `--output <file>` | `-o` | `state-map.html` | Output file path |
| `--format <format>` | `-f` | `html` | Output format: `html` or `json` |
| `--watch` | `-w` | `false` | Watch for file changes |
| `--threshold <n>` | `-t` | `3` | Prop drilling threshold (hops) |
| `--no-open` | | `false` | Don't open output in browser |
| `--include <patterns>` | `-i` | `**/*.tsx,**/*.jsx` | Glob patterns to include |
| `--exclude <patterns>` | `-e` | `node_modules,...` | Glob patterns to exclude |

## What It Detects

### State Types

| State Type | Detection |
|------------|-----------|
| `useState` | Variable name, initial value |
| `useReducer` | Reducer name, initial state |
| `useContext` | Context name, provider/consumer |
| **Redux** | `useSelector`, `useDispatch` |
| **Zustand** | `useStore`, `useXxxStore` patterns |
| **Custom Hooks** | Any `useXxx` hook calls |

### Visualization Features

- **State Flow**: See which components own state and how it propagates
- **Directory Clustering**: Components grouped by folder structure
- **Context Boundaries**: Visualize React Context providers with clustered consumers
- **Collapsible Subtrees**: Click to collapse/expand component subtrees
- **Prop Drilling Detection**: Automatically detect props passed through too many layers

## Output

### HTML (default)

Generates a standalone, interactive HTML file with:

- **Blue nodes** = Components with local state
- **Green nodes** = Stateless components
- **Green arrows** = Props flow
- **Purple dashed arrows** = Context flow
- **Gray dashed boundaries** = Directory clusters
- **Purple boundaries** = Context provider scope
- **▼/▶ indicators** = Collapsible nodes
- **Red highlights** = Prop drilling paths

Pan, zoom, collapse/expand nodes, click components for details, and switch between views.

![State Flow View](https://raw.githubusercontent.com/olafglad/react-state-map/main/packages/vscode-extension/images/state-flow.png)

### JSON

```json
{
  "components": [...],
  "edges": [...],
  "contexts": [...],
  "stats": {
    "totalComponents": 42,
    "statefulComponents": 12,
    "propDrillingPaths": 3
  }
}
```

## Use Cases

| Challenge | Solution |
|-----------|----------|
| "Where does this prop come from?" | Visual trace from source to destination |
| "Which components use this context?" | Context boundary visualization |
| "Is this prop drilling?" | Automatic detection with hop count |
| "What state does this component have?" | Click any node to see details |
| CI/CD documentation | Generate HTML reports automatically |
| Code reviews | Share state flow visualizations |

## VS Code Extension

For real-time visualization while coding, use the [VS Code extension](https://marketplace.visualstudio.com/items?itemName=OlafGlad.react-state-map-vscode).

## Requirements

- Node.js 18.0.0 or higher
- React project with `.tsx` or `.jsx` files

## License

MIT

## Feedback & Issues

[Open an issue on GitHub](https://github.com/olafglad/react-state-map/issues)
