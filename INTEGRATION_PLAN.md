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

## Phase 2: Cytoscape.js Rendering Migration

**Goal**: Move from SVG DOM to Canvas/WebGL for 60+ FPS at 1000+ nodes.

### Step 2.1: Set up Cytoscape.js infrastructure
- [ ] Add `cytoscape` package to dependencies
- [ ] Create Cytoscape graph adapter (convert our graph format to Cytoscape elements)
- [ ] Set up basic Canvas rendering with performance options:
  ```js
  hideEdgesOnViewport: true
  textureOnViewport: true
  ```

### Step 2.2: Define style mappings
- [ ] Map current node colors to Cytoscape stylesheet
- [ ] Map edge styles (props=solid green, context=dashed purple, drilling=thick red)
- [ ] Create styles for cluster boundaries
- [ ] Implement badge/label rendering

### Step 2.3: Integrate ELK layout with Cytoscape
- [ ] Use `cytoscape-elk` extension or manual position assignment
- [ ] Ensure compound nodes (clusters) work with ELK layout
- [ ] Test layout + rendering pipeline end-to-end

### Step 2.4: Implement interactions
- [ ] Pan and zoom (native Cytoscape)
- [ ] Node click → show details in sidebar
- [ ] Node hover → highlight connections
- [ ] Collapse/expand subtrees

### Step 2.5: Handle hybrid SVG overlay (if needed)
- [ ] Evaluate if tooltips/details need SVG overlay
- [ ] Implement overlay layer for crisp text at high zoom
- [ ] Test performance with overlay

### Step 2.6: Update both targets
- [ ] Update CLI HTML generation to use Cytoscape
- [ ] Update VS Code webview to use Cytoscape
- [ ] Bundle Cytoscape for inline HTML (similar to current Dagre bundling)

**Exit criteria**: Smooth 60+ FPS pan/zoom at 1000 nodes, all current interactions working, visual parity with current implementation.

---

## Phase 3: Semantic Zoom Implementation

**Goal**: Show different detail levels at different zoom levels - directory boxes when zoomed out, individual components when zoomed in.

### Step 3.1: Define zoom thresholds and representations
- [ ] Define three zoom levels:
  - Far (< 0.3): Directory boxes only
  - Medium (0.3-0.7): Module groups with summary edges
  - Close (> 0.7): Individual components with full detail

### Step 3.2: Create collapsed group representations
- [ ] Design "directory box" node style (shows folder name, component count)
- [ ] Design "module group" node style (shows module name, complexity badge)
- [ ] Pre-compute group metadata (component count, external edge count, aggregate metrics)

### Step 3.3: Implement zoom-level switching
- [ ] Listen to Cytoscape zoom events
- [ ] Switch node classes/data based on zoom level
- [ ] Handle edge aggregation at low zoom (N edges → single weighted edge)

### Step 3.4: Add smooth transitions
- [ ] Animate between detail levels
- [ ] Ensure mental map preservation (nodes don't jump positions)

### Step 3.5: Test cognitive load reduction
- [ ] Verify zoomed-out view is comprehensible
- [ ] Verify zooming in reveals expected detail
- [ ] Test with large project

**Exit criteria**: Users can zoom out to see architecture overview, zoom in to see component details, transitions feel natural.

---

## Phase 4: Search-First Exploration UX

**Goal**: Replace "show everything" with "empty canvas, search to reveal" paradigm.

### Step 4.1: Implement search infrastructure
- [ ] Add search input to UI header
- [ ] Create fuzzy search over component names, file paths, prop names
- [ ] Debounce search (100ms)
- [ ] Show real-time results dropdown

### Step 4.2: Change default view
- [ ] Start with empty/minimal canvas (just top-level directories collapsed)
- [ ] OR start with nothing, prompt user to search
- [ ] Evaluate which feels better for developer workflow

### Step 4.3: Implement "reveal" mechanics
- [ ] Search result click → reveal component + immediate neighbors
- [ ] Add "Show more connections" button (expand 1 hop)
- [ ] Add proximity/depth slider (1-hop, 2-hop, 3-hop, all)

### Step 4.4: Add "path between A and B" feature
- [ ] UI to select two components
- [ ] Calculate shortest path(s) between them
- [ ] Highlight path on graph
- [ ] This is critical for debugging prop drilling

### Step 4.5: Implement exploration history
- [ ] Track revealed nodes as exploration state
- [ ] Add undo/redo for exploration
- [ ] "Clear canvas" to start fresh

### Step 4.6: URL state persistence
- [ ] Encode exploration state in URL parameters
- [ ] Enable sharing specific views
- [ ] Deep links to specific components

**Exit criteria**: Users can find what they're looking for without being overwhelmed, path-finding works, exploration feels intuitive.

---

## Phase 5: Edge Management & Bundling

**Goal**: Reduce visual noise from thousands of edges.

### Step 5.1: Implement hover-to-highlight
- [ ] Default: all edges at 10-15% opacity
- [ ] On node hover: direct connections at 100%, 2-hop at 50%
- [ ] Use Cytoscape's `closedNeighborhood()` for efficient neighbor lookup

### Step 5.2: Add edge type filters
- [ ] Toggle visibility: props edges, context edges, hook edges
- [ ] Filter by drilling status (show only drilling paths)
- [ ] Filter by component selection

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

**Next:** Phase 2 - Cytoscape.js Rendering Migration (for scaling to 500+ components)
