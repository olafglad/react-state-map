# Changelog

All notable changes to React State Map will be documented in this file.

## [0.1.6] - 2025-01-14

### Added
- **Pass-Through Ratio Visualization**: Component sidebar now shows prop usage metrics
  - Visual bar showing consumed/passed/transformed/ignored prop distribution
  - Role badge (consumer/passthrough/transformer/mixed) next to component name
  - Stats badge showing passthrough component count

- **Bundle Detection**: Detect large object props being passed through components
  - Stats badge showing problematic bundle count
  - Identifies inline object literals with 5+ properties

- **Context Leak Detection**: Detect anti-pattern of extracting context and re-passing as props
  - Finds components that use `useContext` then pass values as props to children
  - Stats badge showing leak count

- **Rename Tracking**: Track props through rename chains
  - Detects destructuring renames: `const { id: dealId } = props`
  - Detects assignment renames: `const newName = oldProp`
  - Stats badge showing complex rename count

### Changed
- Stats bar now shows 5 detection badges: drilling, passthrough, bundles, leaks, renames
- Updated to @react-state-map/core v0.1.6 with all new detection features

## [0.1.5] - 2025-01-13

### Added
- **Full Dagre Layout**: Switched from BFS depth-based layout to dagre's hierarchical algorithm
  - Automatic edge crossing minimization
  - Better handling of disconnected components
  - Compound graph support for clustering
- **Directory Clustering** (State Flow view): Components automatically grouped by directory
  - Recognizes common directories: components/, pages/, features/, modules/, views/
  - Visual cluster boundaries with dashed outlines
- **Context Boundary Clustering** (Context view): Consumers grouped inside provider boundaries
  - Context boundaries now influence layout, not just overlaid
  - Clearer visual hierarchy of context scope
- **Collapsible Subtrees**: Click to collapse/expand component subtrees
  - Collapse indicator (▶/▼) on nodes with children
  - Hidden child count badge (+N) when collapsed
  - Reduces visual complexity for large graphs
- **Hierarchy Lines in Context View**: Subtle props edges show parent-child relationships
  - Makes it clear why collapsing a parent hides its children
  - Lighter styling so context edges remain the focus

### Changed
- Layout algorithm now uses dagre for both node positioning and edge routing
- Context view shows both context edges (bold purple) and props edges (subtle gray)

## [0.1.4] - 2025-01-13

### Added
- **Improved Drilling View**: Completely redesigned prop drilling visualization
  - Shows only components involved in drilling paths as clean vertical chains
  - Color-coded nodes: Blue (defines state), Orange (pass-through), Green (uses state)
  - Displays state name and hop count above each drilling chain
  - Multiple drilling paths displayed side by side
- **Dynamic Legends**: Each view now has its own tailored legend
  - State Flow: Shows arrow types (Props, Context)
  - Context: Shows Context Provider indicator and Context Flow arrows
  - Drilling: Shows role colors (Defines State, Pass-through, Uses State)
- **Context Provider Highlighting**: Provider nodes now have purple border in Context view

### Changed
- CLI and VS Code extension now share identical rendering logic
- Synced hierarchical layout algorithm between CLI and VS Code

## [0.1.3] - 2025-01-07

### Fixed
- **Critical Bug Fix**: Fixed `dagreGraph` variable hoisting issue that caused State Flow view to crash
- **Layout Engine Rewrite**: Replaced dagre-only layout with custom hierarchical positioning
  - Nodes now arranged by depth (parents at top, children below)
  - Maximum 20 nodes per row to prevent extremely wide layouts
  - Extra vertical spacing between hierarchy levels
  - No more overlapping nodes
- **Error Handling**: Added try-catch around edge drawing to prevent crashes

### Changed
- Bundled dagre.js directly for edge routing (more reliable)
- Improved fit-to-view behavior for large graphs

## [0.1.2] - 2025-01-06

### Fixed
- **Large Project Support**: Fixed visualization failing on projects with many components
  - Added automatic fit-to-view that zooms out to show all nodes
  - Dynamic spacing that increases for larger graphs (1.2x for 20+ nodes, 1.5x for 50+ nodes)
  - Removed viewport clamping that caused nodes to be cut off at edges
  - Increased collision detection iterations for dense graphs
- **Context Detection**: Now detects more context provider patterns
  - Added support for `<ThemeProvider>`, `<Provider>`, `<AuthProvider>`, etc.
  - Detects any component ending in `Provider`
  - Recognizes common provider props (`value`, `store`, `client`, `theme`, `config`)
- **Prop Drilling Detection**: Fixed false negatives in prop drilling detection
  - Now correctly tracks props through component chains
  - Fixed hop count calculation for intermediate components
  - Properly identifies pass-through components vs components that use the state

### Added
- **Fit to View Button**: New button in header to reset zoom and center the graph

## [0.1.1] - 2025-01-05

### Fixed
- Minor bug fixes and improvements

## [0.1.0] - 2025-01-05

### Added
- Initial release
- **State Flow View**: Visualize how state flows between components
- **Context Boundaries View**: See React Context providers and consumers
- **Prop Drilling Detection**: Automatically detect props passed through multiple layers
- State detection for:
  - `useState` and `useReducer`
  - `useContext`
  - Redux (`useSelector`, `useDispatch`)
  - Zustand (`useStore`, `useXxxStore` patterns)
  - Custom hooks (`useXxx`)
- Interactive graph with pan and zoom
- Click-to-navigate: Click any component to jump to source code
- Auto-refresh on file save
- Configurable exclusion patterns
- Configurable prop drilling threshold
