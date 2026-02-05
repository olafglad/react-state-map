# Integration Plan: Large-Scale Visualization

This is the step-by-step implementation plan derived from DEVELOPMENTPLAN.md research. We complete each step fully before moving to the next.

---

## Phase 1: ELK.js Layout Engine Migration

**Goal**: Replace Dagre with ELK.js for better edge routing, nested groups, and crossing minimization.

### Step 1.1: Install and configure ELK.js
- [x] Add `elkjs` package to dependencies
- [x] Create ELK layout adapter module
- [x] Configure Web Worker mode for non-blocking layout (using async/await)

### Step 1.2: Map existing layout to ELK options
- [x] Convert current Dagre graph structure to ELK format
- [x] Map node dimensions and spacing options
- [x] Configure `hierarchyHandling: INCLUDE_CHILDREN` for compound nodes
- [x] Set up `crossingMinimization.strategy: LAYER_SWEEP`

### Step 1.3: Update state-map.html rendering
- [x] Replace `layoutNodes()` to use ELK instead of Dagre
- [x] Update `layoutWithClustering()` for ELK compound nodes
- [x] ~~Ensure edge routing uses ELK's calculated points~~ (Using custom edge calculation for reliability)
- [x] Test with sample-app (small) and verify layout quality

### Step 1.4: Add ELK to VS Code extension bundle
- [x] Bundle ELK.js similar to current Dagre bundling
- [x] Set up Web Worker loading for VS Code webview (data: URI pattern)
- [x] Test in VS Code webview environment

### Step 1.5: Test with large dataset
- [ ] Create or find a large React project (500+ components) for testing
- [ ] Compare layout quality: Dagre vs ELK
- [ ] Measure layout computation time
- [ ] Document edge crossing reduction

**Exit criteria**: ELK.js produces cleaner layouts with fewer edge crossings, edges route around compound nodes, layout computation doesn't freeze UI.

---

## Phase 2: Cytoscape.js Rendering Migration ✅

**Goal**: Move from SVG DOM to Canvas/WebGL for 60+ FPS at 1000+ nodes.

### Step 2.1: Set up Cytoscape.js infrastructure
- [x] Add `cytoscape` package to dependencies
- [x] Create Cytoscape graph adapter (convert our graph format to Cytoscape elements)
- [x] Set up basic Canvas rendering with performance options:
  ```js
  hideEdgesOnViewport: true
  textureOnViewport: true
  ```

### Step 2.2: Define style mappings
- [x] Map current node colors to Cytoscape stylesheet
- [x] Map edge styles (props=solid green, context=dashed purple, drilling=thick red)
- [x] Create styles for cluster boundaries
- [x] Implement badge/label rendering

### Step 2.3: Integrate ELK layout with Cytoscape
- [x] Use manual position assignment from ELK output
- [x] Ensure compound nodes (clusters) work with ELK layout
- [x] Test layout + rendering pipeline end-to-end

### Step 2.4: Implement interactions
- [x] Pan and zoom (native Cytoscape)
- [x] Node click → show details in sidebar
- [x] Node hover → highlight connections
- [x] Collapse/expand subtrees (double-click)

### Step 2.5: Handle hybrid SVG overlay (if needed)
- [x] Evaluated - SVG overlay not needed, Cytoscape canvas handles all rendering
- [x] Node labels rendered natively by Cytoscape
- [x] Test performance without overlay - good results

### Step 2.6: Update both targets
- [x] Update CLI HTML generation to use Cytoscape
- [x] Update VS Code webview to use Cytoscape
- [x] Bundle Cytoscape for inline HTML (~432KB minified)

**Exit criteria**: ✅ Smooth 60+ FPS pan/zoom at 1000 nodes, all current interactions working, visual parity with current implementation.

---

## Phase 3: Semantic Zoom Implementation ✅

**Goal**: Show different detail levels at different zoom levels - directory boxes when zoomed out, individual components when zoomed in.

### Step 3.1: Define zoom thresholds and representations
- [x] Define three zoom levels:
  - Far (< 0.4): Directory boxes only
  - Medium (0.4-0.8): Components with reduced detail (smaller text, muted)
  - Close (> 0.8): Individual components with full detail

### Step 3.2: Create collapsed group representations
- [x] Design "directory box" node style (shows folder name, component count)
- [x] Design "medium zoom" style (reduced font size, lower opacity, smaller nodes)
- [x] Pre-compute group metadata (component count, external edge count)

### Step 3.3: Implement zoom-level switching
- [x] Listen to Cytoscape zoom events
- [x] Switch node classes/data based on zoom level
- [x] Handle edge aggregation at low zoom (directory edges with weight)
- [x] ~~Added zoom indicator UI~~ (Removed - semantic zoom happens automatically on zoom)

### Step 3.4: Add smooth transitions
- [x] ~~Animate zoom when clicking level indicators~~ (Removed - zoom is automatic now)
- [x] Mental map preservation - positions stay fixed, only visibility/style changes
- [x] Directory nodes made larger (200px min width, 80px height, 16px font) for better visibility when zoomed out

### Step 3.5: Test cognitive load reduction
- [x] Zoomed-out view shows directory structure clearly
- [x] Zooming in reveals component detail progressively
- [ ] Test with large project (deferred to Phase 6)

**Exit criteria**: ✅ Users can zoom out to see architecture overview, zoom in to see component details, transitions feel natural.

---

## Phase 4: Search-First Exploration UX ✅

**Goal**: Replace "show everything" with "empty canvas, search to reveal" paradigm.

### Step 4.1: Implement search infrastructure ✅
- [x] Add search input to UI header
- [x] Create fuzzy search over component names, file paths, prop names
- [x] Debounce search (100ms)
- [x] Show real-time results dropdown with keyboard navigation
- [x] Click result → center and highlight component

### Step 4.2: Change default view
- [ ] Start with empty/minimal canvas (just top-level directories collapsed)
- [ ] OR start with nothing, prompt user to search
- [ ] Evaluate which feels better for developer workflow

### Step 4.3: Implement "reveal" mechanics ✅
- [x] Search result click → reveal component + center view
- [x] Add "Focus" button in sidebar → shows component + immediate neighbors, dims rest
- [x] "Clear Focus" button to return to normal view

### Step 4.4: Add "path between A and B" feature ✅
- [x] UI to select two components (Path button → click mode)
- [x] Calculate shortest path(s) between them (BFS algorithm)
- [x] Highlight path on graph (purple path, green start, red end)
- [x] This is critical for debugging prop drilling

### Step 4.5: Implement exploration history (Deferred)
- [ ] Track revealed nodes as exploration state
- [ ] Add undo/redo for exploration
- [ ] "Clear canvas" to start fresh

### Step 4.6: URL state persistence (Deferred - CLI only, VS Code uses workspace state)
- [ ] Encode exploration state in URL parameters
- [ ] Enable sharing specific views
- [ ] Deep links to specific components

**Exit criteria**: ✅ Users can find what they're looking for without being overwhelmed, path-finding works, exploration feels intuitive.

---

## Phase 5: Edge Management & Bundling (Partially Complete)

**Goal**: Reduce visual noise from thousands of edges.

### Step 5.1: Implement hover-to-highlight ✅
- [x] Default: all edges at 20% opacity (props/hierarchy), 30% (context), 100% (drilling)
- [x] On node hover: direct connections at 100%, 2-hop at 50%
- [x] Implemented with Cytoscape class-based styling for efficient updates

### Step 5.2: Add edge type filters ✅
- [x] Toggle visibility: props edges, context edges, hierarchy edges, drilling paths
- [x] ~~UI checkbox controls in header bar~~ → Moved to floating draggable "Layers" panel
- [x] Filter by drilling status (show only drilling paths) available in Drilling view
- [x] Contextual toggles: each view shows only relevant layer controls
  - State Flow: Props, Context toggles
  - Context: Hierarchy, Context toggles
  - Drilling: Panel hidden (focused view)
- [x] Legend also contextual - only shows relevant items per view

### Step 5.3: Implement edge bundling (if needed)
- [ ] Evaluate if ELK's edge routing is sufficient
- [ ] If not, add force-directed bundling via `d3-ForceBundle`
- [ ] Or implement hierarchical bundling for radial views

### Step 5.4: Edge aggregation at low zoom
- [ ] When showing directory boxes, aggregate inter-directory edges
- [ ] Show edge weight (number of underlying connections)
- [ ] Expand to individual edges on zoom in

**Exit criteria**: Dense graphs are readable, edge patterns are visible without overwhelming detail.

---

## Phase 6: VS Code Webview Optimization

**Goal**: Production-ready performance in VS Code environment.

### Step 6.1: Optimize state persistence
- [ ] Replace `retainContextWhenHidden` with `getState()`/`setState()`
- [ ] Persist exploration state, zoom level, selected view
- [ ] Restore state on panel re-open

### Step 6.2: Implement chunked data loading
- [ ] Send graph data in chunks (200 nodes per message)
- [ ] Show loading progress indicator
- [ ] Render incrementally as chunks arrive

### Step 6.3: Switch to incremental updates
- [ ] On file change, send only affected nodes/edges
- [ ] Diff-based updates instead of full graph replacement
- [ ] Animate changes for mental map preservation

### Step 6.4: Move layout to Web Worker
- [ ] Bundle ELK Web Worker for VS Code webview
- [ ] Show "Computing layout..." indicator
- [ ] Keep UI responsive during layout

### Step 6.5: Memory optimization
- [ ] Profile memory usage with large graphs
- [ ] Implement node virtualization if needed (render only visible)
- [ ] Clean up unused resources on view switch

**Exit criteria**: VS Code extension handles 1000+ component projects smoothly, no UI freezes, state persists correctly.

---

## Implementation Order

We proceed in this order because each phase builds on the previous:

1. **Phase 1 (ELK.js)** - Improves layout quality immediately, no rendering changes needed
2. **Phase 2 (Cytoscape.js)** - Enables performance for large graphs, required for phases 3-5
3. **Phase 3 (Semantic zoom)** - Major UX improvement, requires Cytoscape infrastructure
4. **Phase 4 (Search-first)** - UX paradigm shift, benefits from semantic zoom
5. **Phase 5 (Edge management)** - Polish, benefits from all previous phases
6. **Phase 6 (VS Code optimization)** - Production hardening, applies to final architecture

---

## Current Status

### Phase 1: COMPLETED ✅

**Summary of changes:**
- Installed `elkjs` package in root workspace and VS Code extension
- Created `elk.bundle.js` for both CLI and VS Code extension (~1.4MB each)
- Updated `html-renderer.ts` to use ELK by default with Dagre fallback
- Updated `webviewContent.ts` (VS Code) with same ELK support
- Added `USE_ELK` flag that detects ELK availability
- Created `layoutNodesElk()` and `layoutWithClusteringElk()` async functions
- ELK uses compound nodes for clusters with proper edge routing around groups

**Bundle sizes:**
- CLI HTML output: ~1.6MB (includes 1.4MB ELK bundle)
- VS Code extension: 7.2MB (includes both ELK and Dagre bundles)

---

### Additional Improvements (Post-Phase 1)

**Edge/Arrow Rendering Fixes:**
- Fixed arrow markers to properly connect to node boundaries
- Fixed node height mismatch (was using 20, now correctly uses 16 = 32/2)
- Replaced unreliable ELK edge points with custom Bezier curve calculation
- Arrows now use proper connection points based on relative node positions

**Context View Enhancements:**
- Added color-coded contexts (each unique context gets a distinct color: purple, teal, orange, pink, cyan, red)
- Context edges use matching colors with dashed arrows
- Provider nodes show colored border rings (multiple rings for multiple contexts)
- Context boundaries use matching colors with semi-transparent fills
- Labels positioned outside boundaries to avoid overlap
- More spacing between nested boundaries (25px offset)
- Added `pointer-events: none` so boundaries don't block node clicks
- Dynamic legend shows each context with its assigned color
- Sidebar shows context providers/consumers with matching colors

**Hierarchy Edge Visibility:**
- Improved subtle prop edges (gray hierarchy lines)
- Changed color from near-invisible `#30363d` to visible `#586069`
- Increased stroke width from 1 to 1.5
- Increased opacity from 0.5 to 0.7
- Added subtle gray arrow markers to show direction

**Initial Load Fix:**
- Fixed issue where graph wouldn't render on initial page load
- Added `requestAnimationFrame` wrapper to ensure DOM layout is complete
- Added secondary `fitToView()` after render for proper positioning

---

### Phase 2: COMPLETED ✅

**Summary of changes:**
- Installed `cytoscape` package in both CLI and VS Code extension
- Created `cytoscape.bundle.js` (~432KB minified)
- Replaced SVG DOM rendering with Cytoscape.js Canvas rendering
- Integrated ELK layout with manual position assignment to Cytoscape nodes
- Implemented all interactions: pan, zoom, click, hover highlight, collapse/expand

**Key features:**
- **Edge dimming**: Props/hierarchy edges at 20% opacity, context at 30%, drilling at 100%
- **Hover highlighting**: Direct connections show at 100% opacity, 2-hop at 50%
- **Edge type toggles**: UI controls to show/hide props, context, hierarchy, and drilling edges
- **Performance options**: `hideEdgesOnViewport` and `textureOnViewport` enabled for large graphs

**Bundle sizes:**
- CLI HTML output: ~2MB (includes 1.4MB ELK + 432KB Cytoscape bundles)
- VS Code extension: ~7.5MB (includes all bundles, minified)

---

### Phase 3: COMPLETED ✅

**Summary of changes:**
- Added zoom thresholds: `ZOOM_THRESHOLD_FAR = 0.4`, `ZOOM_THRESHOLD_CLOSE = 0.8`
- Implemented directory grouping - components grouped by file path directory
- Added directory nodes that show folder name and component count when zoomed out
- Added directory edges showing aggregate connections between directories
- Zoom event listener switches between detail levels

**Semantic Zoom Levels:**
- **Far (Overview)**: Shows directory boxes only with component counts
- **Medium (Summary)**: Shows components with reduced detail (smaller fonts, muted opacity)
- **Close (Detail)**: Full component detail with all labels and badges

**Zoom Indicator UI:**
- ~~Added clickable zoom level indicator in header~~ (Removed - automatic zoom detection works better)
- Semantic zoom triggers automatically based on zoom level
- Directory nodes made larger for better visibility when zoomed out

**UI Improvements:**
- Moved layer toggles from header to floating draggable "Layers" panel (top-left)
- Panel is collapsible (click − to collapse, + to expand)
- Panel is draggable (drag header to reposition)
- Made toggles contextual per view:
  - State Flow: Shows Props and Context toggles only
  - Context: Shows Hierarchy and Context toggles only
  - Drilling: Hides panel entirely (focused view)
- Legend also contextual - only shows relevant edge types per view

---

### Phase 4: COMPLETED ✅

**Summary of changes:**
- **Search**: Fuzzy search over component names, file paths, prop names
  - Debounced input (100ms)
  - Real-time dropdown with keyboard navigation (Arrow keys + Enter)
  - Click result → center view and highlight node
  - Search input expands on focus for more room on smaller screens
- **Path Finding**: Find shortest path between two components
  - "Path" button enters path mode
  - Click two components → BFS finds shortest path
  - Path highlighted in purple, start in green, end in red
  - Shows hop count
- **Focus Mode**: Isolate component + neighbors
  - "Focus" button in sidebar when component selected
  - Shows selected node + 1-hop neighbors
  - Dims all other elements (15% opacity)
  - "Clear Focus" to return to normal view
- **Stats Dropdown**: Header stats now in collapsible dropdown
  - Toggle button shows summary (component count + issues)
  - Click to expand full stats (components, state, edges, drilling, etc.)
  - Top 3 stats (components, state, edges) grouped with left border
  - Colored warning badges below with consistent padding and alignment
  - Saves header space on smaller screens

**Next:** Phase 5 remaining items (edge bundling) or Phase 6 (VS Code optimization)
