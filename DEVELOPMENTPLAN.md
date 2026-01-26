# Scaling React component visualization to 2000 nodes

Your current architecture—Dagre.js with pure SVG DOM manipulation—will not survive at 500-2000 components. **SVG performance degrades sharply above 1,000 elements**, and Dagre lacks the edge-routing sophistication and nested grouping support needed for large component graphs. The path forward combines three fundamental shifts: switching layout engines from Dagre to ELK.js, moving rendering from SVG to Canvas/WebGL via Cytoscape.js or Sigma.js, and adopting a progressive disclosure UX pattern that starts from search rather than showing everything at once.

The research across 40+ visualization tools and libraries reveals consistent patterns: successful large-graph tools (Nx, Neo4j Bloom, Git Graph) all use lazy loading, composite nodes, and search-first exploration. Academic research on developer mental models confirms that developers think hierarchically and build understanding incrementally—they don't benefit from seeing 2,000 components simultaneously.

---

## Rendering technology determines your ceiling

The single highest-impact change is migrating from SVG to Canvas or WebGL rendering. Published benchmarks from yWorks and Cytoscape.js show consistent thresholds:

| Technology | Practical limit    | Maximum with optimization     |
| ---------- | ------------------ | ----------------------------- |
| **SVG**    | ~500-1,000 nodes   | ~2,000 with aggressive hiding |
| **Canvas** | ~2,000-5,000 nodes | ~20,000 elements              |
| **WebGL**  | ~10,000+ nodes     | ~500,000 elements             |

Cytoscape.js 3.31+ introduced WebGL rendering that achieves **100+ FPS with 1,200 nodes and 16,000 edges** on M1 hardware—versus 20 FPS with Canvas and impractical with SVG at that scale. Sigma.js handles **100,000 edges** without strain using WebGL, though custom node icons slow it at 5,000+ nodes.

For your dual CLI HTML + VS Code webview deployment, **Canvas-based rendering via Cytoscape.js** offers the best balance. WebGL works in VS Code webviews (confirmed functional) but Canvas provides maximum compatibility. The migration path: keep SVG for detailed tooltips and interaction overlays while rendering the graph itself on Canvas.

**Key tradeoffs**: Canvas/WebGL lose native DOM events (requiring manual hit-testing), CSS styling, and crisp text rendering at scale. The hybrid approach—Canvas for graph, SVG overlay for interactive elements—addresses these while keeping performance viable.

---

## ELK.js solves the Dagre limitations you're experiencing

Your reported problems—"hairball layouts, edge crossings obscuring flow, meaningless clusters"—stem directly from Dagre's architectural limitations. Dagre does not support nested groups, routes edges _through_ blocks rather than around them, and has minimal crossing minimization. **ELK.js (Eclipse Layout Kernel)** addresses all three:

The layered algorithm in ELK includes proper hierarchical edge routing with `hierarchyHandling: INCLUDE_CHILDREN`, which means edges route around compound nodes rather than through them. ELK offers **100+ configurable options** versus Dagre's handful, including explicit crossing minimization strategies (`LAYER_SWEEP`), orthogonal edge routing, and port-aware layout for components with multiple connection points.

```javascript
const elkOptions = {
  "elk.algorithm": "layered",
  "elk.direction": "DOWN",
  "elk.hierarchyHandling": "INCLUDE_CHILDREN",
  "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
  "elk.layered.nodePlacement.bk.fixedAlignment": "BALANCED",
  "elk.layered.spacing.nodeNodeBetweenLayers": "100",
};
```

ELK.js includes **Web Worker support** via the `workerUrl` option—critical for keeping UI responsive during layout computation at 1,000+ nodes. Layout computation time scales with graph complexity; offloading this to a worker prevents the UI freeze your users experience.

Performance comparison shows ELK.js slightly ahead of Dagre in npm downloads (~1.07M vs ~1M weekly) with significantly more active maintenance from the KIELER research group.

---

## Semantic zoom and progressive disclosure are non-negotiable

Every successful large-graph tool—Nx Graph, Neo4j Bloom, Git Graph, CodeScene—uses some form of level-of-detail rendering that shows different representations at different zoom levels. This isn't optional at 500+ nodes; it's the core architectural pattern.

**Three-level semantic zoom pattern for component graphs**:

| Zoom level       | Visual representation            | Metadata shown                              |
| ---------------- | -------------------------------- | ------------------------------------------- |
| < 0.3 (far)      | Directory boxes                  | Folder name, component count, external deps |
| 0.3-0.7 (medium) | Module groups with bundled edges | Module name, complexity badge               |
| > 0.7 (close)    | Individual component nodes       | Name, props, hooks, file path               |

Implementation with Cytoscape.js uses the viewport transform to conditionally render:

```javascript
cy.on("zoom", function () {
  const zoom = cy.zoom();
  cy.nodes().forEach((node) => {
    if (zoom < 0.3) {
      node.data("label", node.data("groupLabel"));
      node.addClass("collapsed-group");
    } else {
      node.data("label", node.data("componentName"));
      node.removeClass("collapsed-group");
    }
  });
});
```

G6 (AntV) offers **native combo/grouping support** that handles collapse/expand animation automatically—components can declare a `comboId` and G6 manages the visual grouping, edge aggregation, and interaction. This is the most complete out-of-box solution for nested hierarchies.

**Progressive disclosure algorithm** for initial state: collapse groups where internal cohesion exceeds external connectivity. If a directory's components primarily communicate with each other rather than outside, show it collapsed by default.

---

## Edge management strategies that actually work

With 500-2000 components, edge count can reach 5,000-10,000+ connections. Three approaches reduce visual noise:

**Hierarchical edge bundling** (Holten 2006) routes edges along the hierarchy tree between source and target, creating visual bundles that reveal flow patterns. D3's `d3.curveBundle.beta()` implements this for radial layouts. The `beta` coefficient (0-1) controls bundling tightness.

**Force-directed edge bundling** (FDEB) treats edges as flexible springs that attract compatible neighbors. The `d3-ForceBundle` library implements this:

```javascript
import ForceEdgeBundling from "d3-ForceBundle";
const bundling = ForceEdgeBundling()
  .compatibility_threshold(0.6)
  .bundling_stiffness(0.1);
```

**"Show on hover"** consistently outperforms "always visible" for dense graphs. The pattern: dim all edges to 10-15% opacity, then on node hover, highlight the node's direct connections at full opacity while showing 2-hop connections at 50%. Cytoscape.js's `closedNeighborhood()` method makes this trivial.

Edge **aggregation**—showing "5 connections to this module" as a single weighted edge—works well when combined with composite nodes. Store original edges, render summary edges at low zoom, restore originals on expansion.

---

## The search-first paradigm beats show-everything

Research into Neo4j Bloom, TigerGraph GraphStudio, and developer UX studies converges on the same conclusion: **"empty canvas, search to reveal" outperforms "show everything, filter down"** for graphs above ~100 nodes.

Neo4j Bloom explicitly designs around this: "The scene contains just the parts of the graph which you've found through search or exploration." Users start with a component name search, see that component and its immediate connections, then incrementally expand. This matches how developers actually think—starting with a specific question ("where does this prop come from?") rather than trying to comprehend the entire system.

**Critical features for search-first**:

- Fuzzy search with real-time results (debounced, ~100ms)
- "Show path between A and B" prominently featured
- Exploration history with undo/redo
- Saved/shareable exploration states via URL parameters

The Nx Graph exemplifies this with its `--focus` flag and proximity slider that controls how many dependency hops to display. Turborepo's devtools similarly start with a selected task and reveal connections on demand.

---

## How existing tools solve your exact problem

**Nx Graph** (Cytoscape.js-based):

- Uses "composite nodes" for directory groupings that expand in place
- Proximity slider controls visible dependency depth (1-hop, 2-hop, all)
- Focus mode starts from a single project and builds outward
- Handles 500+ packages in production monorepos

**React DevTools** (vanilla TypeScript, not React):

- Sends only minimal metadata initially (name, type, key)
- Fetches props/state only when element is selected
- Uses typed arrays for efficient bridge communication
- Tree collapse by default with lazy-loaded children

**Git Graph** (Canvas rendering):

- Configurable initial commit count (pagination)
- "Load more" triggered by scroll
- `retainContextWhenHidden` optional to preserve state
- No React—vanilla TypeScript for performance

**Webpack Bundle Analyzer** (Canvas treemap):

- Treemap visualization handles thousands of modules
- Click-to-zoom drills into sections
- Sidebar filtering toggles chunk visibility

---

## VS Code webview constraints and optimizations

VS Code webviews run in sandboxed iframes with specific constraints your implementation must handle:

**Memory**: No documented limit, but the guidance is to minimize footprint. The `retainContextWhenHidden` option preserves webview state when the tab is hidden but has "high memory overhead"—use `vscode.getState()`/`setState()` instead for persistence.

**Communication**: All data passes through `postMessage()` as JSON. A real performance issue documented in Roo-Code: sending entire state on every update caused O(n²) degradation. **Send incremental updates only**—changed nodes, not the full graph.

**Web Workers**: Supported but scripts must load via `data:` or `blob:` URIs, not direct file paths. Bundle worker code as a single file using webpack's `LimitChunkCountPlugin`.

**WebGL**: Confirmed functional in VS Code webviews. GPU compositing and WebGL2 are enabled by default.

**Recommended pattern for initial load**:

```typescript
const CHUNK_SIZE = 200;
for (let i = 0; i < nodes.length; i += CHUNK_SIZE) {
  panel.webview.postMessage({
    type: "addNodes",
    nodes: nodes.slice(i, i + CHUNK_SIZE),
    isLast: i + CHUNK_SIZE >= nodes.length,
  });
}
```

---

## Library recommendations for your stack

### Primary recommendation: Cytoscape.js + ELK.js

**Cytoscape.js** (v3.33+) provides the best balance for 500-2000 nodes with dual deployment targets:

- Canvas renderer with WebGL mode for performance
- Comprehensive layout algorithm integration (including ELK)
- Rich graph algorithms (centrality, shortest path, neighborhood)
- React wrapper via `react-cytoscapejs` (maintained by Plotly)
- Works reliably in VS Code webviews

**ELK.js** for layout:

- Superior hierarchical layout with proper edge routing
- Nested group support via `hierarchyHandling`
- Web Worker support for non-blocking computation

### Alternative: G6 (AntV) + Graphin

If you need tighter React integration and native combo/grouping:

- **G6** (v5+) with multi-renderer support (Canvas/SVG/WebGL)
- **Graphin** provides official React wrapper
- 58k+ GitHub stars, backed by Ant Group
- Native combo support with built-in collapse/expand

### Supporting libraries

| Purpose                  | Library                   | Notes                                      |
| ------------------------ | ------------------------- | ------------------------------------------ |
| Graph data structure     | `graphology`              | Used by Sigma.js, comprehensive algorithms |
| Centrality/DOI metrics   | `graphology-metrics`      | Betweenness, PageRank, degree              |
| Edge bundling            | `d3-ForceBundle`          | Force-directed bundling                    |
| Very large graphs (10k+) | `sigma.js` + `graphology` | WebGL-only, React wrapper available        |

### Libraries to avoid

- **React Flow**: Designed for workflow editors, struggles above 80 nodes with state updates, 10k unusable
- **d3-dag**: "Light maintenance mode" per maintainer, freezes browser at 500+ nodes
- **vis-network**: Good to ~2,000 nodes but clustering required beyond; less active maintenance

---

## Implementation priority order for maximum impact

### Phase 1: Layout engine swap (highest impact, 1-2 weeks)

Replace Dagre with ELK.js. This alone should dramatically improve edge routing and reduce visual chaos:

1. Install `elkjs` and configure Web Worker mode
2. Map your existing Dagre options to ELK equivalents
3. Enable `hierarchyHandling: INCLUDE_CHILDREN` for compound nodes
4. Test with your 500+ component datasets

Expected outcome: Cleaner hierarchical layout, edges routed around groups, measurable reduction in edge crossings.

### Phase 2: Rendering migration (critical for scale, 2-3 weeks)

Migrate from SVG DOM to Cytoscape.js Canvas:

1. Define Cytoscape style mappings for your current node/edge appearances
2. Set up `react-cytoscapejs` wrapper
3. Implement custom node rendering for component details
4. Add `hideEdgesOnViewport: true` and `textureOnViewport: true` for performance
5. Test WebGL mode for additional performance headroom

Expected outcome: Smooth interaction at 1,000+ nodes, 60+ FPS pan/zoom.

### Phase 3: Semantic zoom (major UX improvement, 1-2 weeks)

Implement three-level detail rendering:

1. Define zoom thresholds for your graph scale
2. Create simplified node representations for low zoom
3. Implement directory grouping as Cytoscape compound nodes
4. Add smooth transitions between detail levels

Expected outcome: Coherent visualization at any zoom level, ability to see "the forest and the trees."

### Phase 4: Search-first exploration (UX paradigm shift, 1-2 weeks)

Replace "show everything" with progressive disclosure:

1. Start with empty or minimally-populated canvas
2. Add fuzzy search with real-time component matching
3. Implement "show path between A and B" feature
4. Add proximity/hop-depth control
5. Save exploration state to URL for sharing

Expected outcome: Focused exploration that matches developer mental models.

### Phase 5: Edge management (visual clarity, 1 week)

Add edge bundling and interaction:

1. Implement hover-to-highlight with neighbor dimming
2. Add edge bundling for dense connection areas
3. Create edge type filters (props, context, state)
4. Aggregate inter-group edges at low zoom

Expected outcome: Clean visualization even with 5,000+ edges.

### Phase 6: VS Code optimization (production hardening, 1 week)

Optimize for webview constraints:

1. Replace `retainContextWhenHidden` with `getState`/`setState`
2. Implement chunked initial data loading
3. Switch to incremental update messages
4. Move layout computation to Web Worker
5. Add state persistence across tab switches

---

## Academic papers and resources worth reading

### Foundational visualization research

- **Holten (2006)**: "Hierarchical Edge Bundles: Visualization of Adjacency Relations in Hierarchical Data" — the original edge bundling paper, directly applicable to component hierarchies
- **Furnas (1986)**: "Generalized Fisheye Views" — foundational DOI concept
- **Card et al. (2002)**: "Degree-of-Interest Trees" — extended DOI with bounding constraints
- **Archambault & Purchase (2013)**: "Mental Map Preservation in Dynamic Graphs" — animation helps users track changes; predictability and traceability are key

### Developer tools and mental models

- **Pennington's Model**: Developers build mental models bottom-up, chunking code structures into higher abstractions
- **Kuhn et al. (2010)**: "CODEMAP" — spatial 2D maps of source code using lexical/structural distance
- Nielsen Norman Group articles on progressive disclosure (limit to 2-3 levels maximum)

### Technical resources

- **Cytoscape.js performance documentation**: js.cytoscape.org/demos
- **ELK algorithm documentation**: eclipse.dev/elk/reference/algorithms.html
- **yWorks SVG vs Canvas vs WebGL comparison**: yworks.com/blog/svg-canvas-webgl
- **Cambridge Intelligence graph visualization guides**: cambridge-intelligence.com/graph-visualization
- **React DevTools OVERVIEW.md**: github.com/facebook/react/blob/main/packages/react-devtools/OVERVIEW.md

### Tools to study

- **Nx Graph source**: github.com/nrwl/nx (Cytoscape.js implementation)
- **Git Graph extension**: github.com/mhutchie/vscode-git-graph (VS Code Canvas optimization)
- **Neo4j Bloom documentation**: neo4j.com/docs/bloom-user-guide (search-first exploration patterns)

---

## Summary: The three-part solution

Your path from "works at 50 components, unusable at 500-2000" requires three synchronized changes:

1. **Rendering**: SVG → Canvas/WebGL (Cytoscape.js with WebGL mode)
2. **Layout**: Dagre → ELK.js (proper edge routing, nested groups, Web Workers)
3. **UX paradigm**: Show-all → Search-first (progressive disclosure, semantic zoom)

None of these changes alone is sufficient. SVG with ELK still won't render 2,000 nodes smoothly. Cytoscape with Dagre still produces hairball layouts. Canvas rendering with show-everything still overwhelms users cognitively.

The combined approach—starting with layout engine migration, then rendering, then progressive disclosure—addresses the technical performance ceiling _and_ the cognitive load problem simultaneously. The priority order puts highest-impact changes first, with each phase building on the previous to deliver incremental improvements your users will notice immediately.
