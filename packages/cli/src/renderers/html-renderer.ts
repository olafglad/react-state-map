import type { SerializedStateFlowGraph } from '@react-state-map/core';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load dagre bundle at runtime
function getDagreBundle(): string {
  const bundlePath = path.join(__dirname, 'dagre.bundle.js');
  // In development, look in src directory
  const srcBundlePath = path.join(__dirname, '..', '..', 'src', 'renderers', 'dagre.bundle.js');

  if (fs.existsSync(bundlePath)) {
    return fs.readFileSync(bundlePath, 'utf-8');
  } else if (fs.existsSync(srcBundlePath)) {
    return fs.readFileSync(srcBundlePath, 'utf-8');
  }

  // Fallback: inline minimal dagre from CDN comment
  return '/* dagre bundle not found - edge routing will use fallback */';
}

export function generateHTML(graph: SerializedStateFlowGraph): string {
  const graphJSON = JSON.stringify(graph);
  const dagreBundle = getDagreBundle();

  // Calculate summary stats
  const components = Object.values(graph.components);
  const stateCount = Object.keys(graph.stateNodes).length;
  const edgeCount = graph.edges.length;
  const drillingCount = graph.propDrillingPaths.length;

  const summaryJSON = JSON.stringify({
    components: { totalComponents: components.length },
    state: { totalStateNodes: stateCount },
    flow: { totalEdges: edgeCount }
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>React State Map</title>
  <style>
${getStyles()}
  </style>
</head>
<body>
  <div class="app">
    <header class="header">
      <div class="header-left">
        <h1>React State Map</h1>
        <nav class="tabs">
          <button class="tab active" data-view="flow">State Flow</button>
          <button class="tab" data-view="context">Context</button>
          <button class="tab" data-view="drilling">Drilling</button>
        </nav>
      </div>
      <div class="header-right">
        <div class="stats" id="stats"></div>
        <button class="fit-btn" id="fitBtn" title="Fit to View">Fit</button>
      </div>
    </header>
    <main class="main">
      <div class="canvas-container">
        <svg id="graph" width="100%" height="100%"></svg>
      </div>
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-content">
          <h3>Select a node</h3>
          <p>Click on a component to see details</p>
        </div>
      </aside>
    </main>
    <div class="legend" id="legend"></div>
  </div>
  <script>${dagreBundle}</script>
  <script>
const graphData = ${graphJSON};
const summaryData = ${summaryJSON};
${getScript()}
  </script>
</body>
</html>`;
}

function getStyles(): string {
  return `
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      font-size: 14px;
      background: #0d1117;
      color: #c9d1d9;
      overflow: hidden;
    }

    .app {
      display: flex;
      flex-direction: column;
      height: 100vh;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 20px;
      background: #161b22;
      border-bottom: 1px solid #30363d;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .header h1 {
      font-size: 16px;
      font-weight: 600;
      color: #58a6ff;
    }

    .tabs {
      display: flex;
      gap: 4px;
    }

    .tab {
      padding: 6px 14px;
      border: none;
      background: transparent;
      color: #8b949e;
      font-size: 13px;
      cursor: pointer;
      border-radius: 6px;
      transition: all 0.15s;
    }

    .tab:hover {
      background: #21262d;
      color: #c9d1d9;
    }

    .tab.active {
      background: #238636;
      color: white;
    }

    .stats {
      font-size: 12px;
      color: #8b949e;
    }

    .stats span {
      margin-left: 14px;
    }

    .fit-btn {
      padding: 6px 12px;
      border: none;
      background: #21262d;
      color: #c9d1d9;
      font-size: 12px;
      cursor: pointer;
      border-radius: 6px;
    }

    .fit-btn:hover {
      background: #30363d;
    }

    .main {
      display: flex;
      flex: 1;
      overflow: hidden;
    }

    .canvas-container {
      flex: 1;
      position: relative;
      overflow: hidden;
    }

    #graph {
      width: 100%;
      height: 100%;
      cursor: grab;
    }

    #graph:active {
      cursor: grabbing;
    }

    .sidebar {
      width: 300px;
      background: #161b22;
      border-left: 1px solid #30363d;
      overflow-y: auto;
    }

    .sidebar-content {
      padding: 20px;
    }

    .sidebar h3 {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 10px;
      color: #f0f6fc;
    }

    .sidebar p {
      font-size: 13px;
      color: #8b949e;
      line-height: 1.5;
    }

    .sidebar-section {
      margin-bottom: 18px;
      padding-bottom: 18px;
      border-bottom: 1px solid #30363d;
    }

    .sidebar-section:last-child {
      border-bottom: none;
    }

    .file-link {
      display: block;
      padding: 6px 10px;
      margin: 6px 0;
      background: #21262d;
      border-radius: 6px;
      font-size: 12px;
      color: #58a6ff;
      text-decoration: none;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 5px 0;
      font-size: 13px;
    }

    .detail-label {
      color: #8b949e;
    }

    .detail-value {
      color: #c9d1d9;
    }

    .tag {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 11px;
      margin: 3px;
    }

    .tag-state {
      background: #1f6feb;
      color: white;
    }
    .tag-context {
      background: #8957e5;
      color: white;
    }
    .tag-props {
      background: #238636;
      color: white;
    }

    .legend {
      display: flex;
      gap: 20px;
      padding: 10px 20px;
      background: #161b22;
      border-top: 1px solid #30363d;
      font-size: 12px;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .legend-color {
      width: 12px;
      height: 12px;
      border-radius: 3px;
    }

    /* Graph styles */
    .node {
      cursor: pointer;
    }

    .node-rect {
      transition: opacity 0.15s;
    }

    .node:hover .node-rect {
      opacity: 0.8;
    }

    .node-component {
      fill: #238636;
    }

    .node-component-state {
      fill: #1f6feb;
    }

    .node-label {
      font-size: 11px;
      fill: white;
      text-anchor: middle;
      dominant-baseline: middle;
      pointer-events: none;
    }

    .edge {
      stroke-width: 2;
      fill: none;
    }

    .edge-props {
      stroke: #3fb950;
    }

    .edge-context {
      stroke: #8957e5;
      stroke-dasharray: 5, 5;
    }

    .edge-props-subtle {
      stroke: #30363d;
      stroke-width: 1;
      opacity: 0.5;
    }

    .edge-drilling {
      stroke: #f85149;
      stroke-width: 3;
    }

    .context-boundary {
      fill: rgba(137, 87, 229, 0.1);
      stroke: #8957e5;
      stroke-width: 2;
      stroke-dasharray: 8, 4;
      rx: 8;
    }

    .collapse-indicator {
      cursor: pointer;
      user-select: none;
      transition: fill 0.2s;
    }

    .collapse-indicator:hover {
      fill: #c9d1d9 !important;
    }

    .cluster-boundary {
      pointer-events: none;
    }

    .cluster-label {
      font-family: inherit;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #8b949e;
      text-align: center;
      padding: 20px;
    }

    .empty-state h2 {
      font-size: 18px;
      margin-bottom: 8px;
      color: #c9d1d9;
    }

    .warning-badge {
      background: #9e6a03;
      color: #f0f6fc;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      margin-left: 10px;
    }
  `;
}

function getScript(): string {
  return `
(function() {
  const svg = document.getElementById('graph');
  const sidebar = document.getElementById('sidebar');
  const statsEl = document.getElementById('stats');
  const legendEl = document.getElementById('legend');
  const tabs = document.querySelectorAll('.tab');
  const fitBtn = document.getElementById('fitBtn');

  let currentView = 'flow';
  let transform = { x: 0, y: 0, scale: 1 };
  let isDragging = false;
  let dragStart = { x: 0, y: 0 };
  let nodes = [];
  let dagreGraph = null;
  let collapsedNodes = new Set();
  let currentClusters = new Map();

  init();

  function init() {
    setupEventListeners();
    processGraph();
    updateStats();
    updateLegend();
    render();
  }

  function setupEventListeners() {
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentView = tab.dataset.view;
        updateLegend();
        render();
      });
    });

    fitBtn.addEventListener('click', () => {
      fitToView();
      updateTransform();
    });

    svg.addEventListener('mousedown', handleMouseDown);
    svg.addEventListener('mousemove', handleMouseMove);
    svg.addEventListener('mouseup', handleMouseUp);
    svg.addEventListener('mouseleave', handleMouseUp);
    svg.addEventListener('wheel', handleWheel, { passive: false });
  }

  function handleMouseDown(e) {
    if (e.target === svg || e.target.closest('.graph-container')) {
      if (!e.target.closest('.node')) {
        isDragging = true;
        dragStart = { x: e.clientX - transform.x, y: e.clientY - transform.y };
        svg.style.cursor = 'grabbing';
      }
    }
  }

  function handleMouseMove(e) {
    if (isDragging) {
      transform.x = e.clientX - dragStart.x;
      transform.y = e.clientY - dragStart.y;
      updateTransform();
    }
  }

  function handleMouseUp() {
    isDragging = false;
    svg.style.cursor = 'grab';
  }

  function handleWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const rect = svg.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    transform.x = mouseX - (mouseX - transform.x) * delta;
    transform.y = mouseY - (mouseY - transform.y) * delta;
    transform.scale *= delta;
    transform.scale = Math.max(0.02, Math.min(3, transform.scale));
    updateTransform();
  }

  function updateTransform() {
    const g = svg.querySelector('.graph-container');
    if (g) {
      g.setAttribute('transform', \`translate(\${transform.x}, \${transform.y}) scale(\${transform.scale})\`);
    }
  }

  function processGraph() {
    nodes = [];
    const components = Object.values(graphData.components);

    components.forEach((comp) => {
      const hasState = comp.stateProvided.length > 0;
      nodes.push({
        id: comp.id,
        type: 'component',
        name: comp.name,
        data: comp,
        hasState,
        x: 0,
        y: 0
      });
    });

    layoutNodes();
  }

  function getNodeWidth(node) {
    return Math.max(100, node.name.length * 8 + 24);
  }

  // Get descendants of a node for collapse functionality
  function getDescendants(nodeId) {
    const descendants = new Set();
    const queue = [nodeId];
    const visited = new Set();

    while (queue.length > 0) {
      const current = queue.shift();
      if (visited.has(current)) continue;
      visited.add(current);

      graphData.edges
        .filter(e => e.from === current && e.mechanism === 'props')
        .forEach(e => {
          if (e.to !== nodeId) {
            descendants.add(e.to);
            queue.push(e.to);
          }
        });
    }
    return descendants;
  }

  // Get visible nodes (excluding collapsed descendants)
  function getVisibleNodes() {
    const hidden = new Set();
    collapsedNodes.forEach(nodeId => {
      getDescendants(nodeId).forEach(id => hidden.add(id));
    });
    return nodes.filter(n => !hidden.has(n.id));
  }

  // Check if node is hidden due to collapse
  function isHiddenByCollapse(nodeId) {
    for (const collapsedId of collapsedNodes) {
      if (getDescendants(collapsedId).has(nodeId)) {
        return true;
      }
    }
    return false;
  }

  // Toggle collapse state for a node
  function toggleCollapse(nodeId) {
    if (collapsedNodes.has(nodeId)) {
      collapsedNodes.delete(nodeId);
    } else {
      collapsedNodes.add(nodeId);
    }
    render();
  }

  // Basic dagre layout (used as default)
  function layoutNodes() {
    if (nodes.length === 0) return;

    if (typeof dagre === 'undefined') {
      // Fallback to simple layout if dagre not available
      layoutNodesFallback();
      return;
    }

    dagreGraph = new dagre.graphlib.Graph({ compound: true });
    dagreGraph.setGraph({
      rankdir: 'TB',
      ranksep: 100,
      nodesep: 60,
      marginx: 40,
      marginy: 40,
      ranker: 'network-simplex'
    });
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    // Add nodes with dimensions
    nodes.forEach(node => {
      dagreGraph.setNode(node.id, {
        label: node.name,
        width: getNodeWidth(node),
        height: 40
      });
    });

    // Add edges for layout calculation
    graphData.edges
      .filter(e => e.mechanism === 'props' || e.mechanism === 'context')
      .forEach(edge => {
        if (dagreGraph.hasNode(edge.from) && dagreGraph.hasNode(edge.to)) {
          dagreGraph.setEdge(edge.from, edge.to);
        }
      });

    // Run dagre layout
    dagre.layout(dagreGraph);

    // Extract positions
    nodes.forEach(node => {
      const dagreNode = dagreGraph.node(node.id);
      if (dagreNode) {
        node.x = dagreNode.x;
        node.y = dagreNode.y;
      }
    });

    currentClusters = new Map();
    fitToView();
  }

  // Fallback layout when dagre is not available
  function layoutNodesFallback() {
    let maxNodeWidth = 0;
    nodes.forEach(n => {
      maxNodeWidth = Math.max(maxNodeWidth, getNodeWidth(n));
    });

    const HORIZONTAL_GAP = maxNodeWidth + 50;
    const VERTICAL_GAP = 80;
    const MAX_NODES_PER_ROW = 20;

    // Simple grid layout
    nodes.forEach((node, index) => {
      const row = Math.floor(index / MAX_NODES_PER_ROW);
      const col = index % MAX_NODES_PER_ROW;
      node.x = col * HORIZONTAL_GAP + HORIZONTAL_GAP / 2;
      node.y = row * VERTICAL_GAP + VERTICAL_GAP / 2;
    });

    dagreGraph = null;
    currentClusters = new Map();
    fitToView();
  }

  // Layout with clustering support
  function layoutWithClustering(getClusterForNode) {
    if (nodes.length === 0) return new Map();

    if (typeof dagre === 'undefined') {
      layoutNodesFallback();
      return new Map();
    }

    dagreGraph = new dagre.graphlib.Graph({ compound: true });
    dagreGraph.setGraph({
      rankdir: 'TB',
      ranksep: 100,
      nodesep: 60,
      marginx: 40,
      marginy: 40,
      ranker: 'network-simplex'
    });
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    // Identify clusters
    const clusters = new Map();
    nodes.forEach(node => {
      const clusterId = getClusterForNode(node);
      if (clusterId) {
        if (!clusters.has(clusterId)) clusters.set(clusterId, []);
        clusters.get(clusterId).push(node);
      }
    });

    // Add cluster subgraphs to dagre
    clusters.forEach((clusterNodes, clusterId) => {
      dagreGraph.setNode(clusterId, {
        label: clusterId.replace(/^(ctx:|dir:)/, ''),
        clusterLabelPos: 'top'
      });
    });

    // Add nodes with parent clusters
    nodes.forEach(node => {
      const clusterId = getClusterForNode(node);
      dagreGraph.setNode(node.id, {
        label: node.name,
        width: getNodeWidth(node),
        height: 40
      });
      if (clusterId) {
        dagreGraph.setParent(node.id, clusterId);
      }
    });

    // Add edges
    graphData.edges
      .filter(e => e.mechanism === 'props' || e.mechanism === 'context')
      .forEach(edge => {
        if (dagreGraph.hasNode(edge.from) && dagreGraph.hasNode(edge.to)) {
          dagreGraph.setEdge(edge.from, edge.to);
        }
      });

    dagre.layout(dagreGraph);

    // Extract positions
    nodes.forEach(node => {
      const dagreNode = dagreGraph.node(node.id);
      if (dagreNode) {
        node.x = dagreNode.x;
        node.y = dagreNode.y;
      }
    });

    currentClusters = clusters;
    fitToView();
    return clusters;
  }

  // Layout for State Flow view - directory-based clustering
  function layoutForStateFlow() {
    const getDirectoryCluster = (node) => {
      if (!node.data.filePath) return null;
      const parts = node.data.filePath.split('/');
      // Find meaningful directory (components, pages, features, etc.)
      const idx = parts.findIndex(p =>
        ['components', 'pages', 'features', 'modules', 'views', 'containers', 'src'].includes(p)
      );
      if (idx >= 0 && idx < parts.length - 1) {
        return 'dir:' + parts.slice(idx, parts.length - 1).join('/');
      }
      return parts.length > 1 ? 'dir:' + parts[parts.length - 2] : null;
    };

    return layoutWithClustering(getDirectoryCluster);
  }

  // Layout for Context view - context boundary clustering
  function layoutForContextView() {
    const getContextCluster = (node) => {
      // Provider nodes create their own cluster
      for (const boundary of graphData.contextBoundaries) {
        if (boundary.providerComponent === node.id) {
          return 'ctx:' + boundary.contextName;
        }
      }
      // Consumer nodes join their provider's cluster
      for (const boundary of graphData.contextBoundaries) {
        if (boundary.childComponents.includes(node.id)) {
          return 'ctx:' + boundary.contextName;
        }
      }
      return null;
    };

    return layoutWithClustering(getContextCluster);
  }

  // Draw cluster boundary helper
  function drawClusterBoundary(g, clusterInfo, label, strokeColor) {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', clusterInfo.x - clusterInfo.width / 2 - 20);
    rect.setAttribute('y', clusterInfo.y - clusterInfo.height / 2 - 25);
    rect.setAttribute('width', clusterInfo.width + 40);
    rect.setAttribute('height', clusterInfo.height + 45);
    rect.setAttribute('rx', 8);
    rect.setAttribute('fill', 'rgba(255,255,255,0.02)');
    rect.setAttribute('stroke', strokeColor);
    rect.setAttribute('stroke-width', '1');
    rect.setAttribute('stroke-dasharray', '4,4');

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', clusterInfo.x - clusterInfo.width / 2 - 10);
    text.setAttribute('y', clusterInfo.y - clusterInfo.height / 2 - 8);
    text.setAttribute('fill', '#8b949e');
    text.setAttribute('font-size', '10');
    text.setAttribute('font-family', 'inherit');
    text.textContent = label;

    g.insertBefore(text, g.firstChild);
    g.insertBefore(rect, g.firstChild);
  }

  function fitToView() {
    if (nodes.length === 0) return;

    const width = svg.clientWidth || 800;
    const height = svg.clientHeight || 600;
    const padding = 40;

    // Calculate bounding box of all nodes
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    nodes.forEach(node => {
      const nodeW = getNodeWidth(node);
      const nodeH = 32;
      minX = Math.min(minX, node.x - nodeW / 2);
      maxX = Math.max(maxX, node.x + nodeW / 2);
      minY = Math.min(minY, node.y - nodeH / 2);
      maxY = Math.max(maxY, node.y + nodeH / 2);
    });

    const graphWidth = maxX - minX;
    const graphHeight = maxY - minY;

    // For small graphs (< 50 nodes), try to fit in view
    // For large graphs, start at scale 1.0 and let users zoom out
    if (nodes.length < 50) {
      const availableWidth = width - padding * 2;
      const availableHeight = height - padding * 2;
      const scaleX = availableWidth / graphWidth;
      const scaleY = availableHeight / graphHeight;
      let scale = Math.min(scaleX, scaleY, 1.0);

      const graphCenterX = (minX + maxX) / 2;
      const graphCenterY = (minY + maxY) / 2;
      const viewCenterX = width / 2;
      const viewCenterY = height / 2;

      transform.scale = scale;
      transform.x = viewCenterX - graphCenterX * scale;
      transform.y = viewCenterY - graphCenterY * scale;
    } else {
      // Large graph: start at scale 1.0, positioned at top-left
      transform.scale = 1.0;
      transform.x = padding - minX;
      transform.y = padding - minY;
    }
  }

  function render() {
    svg.innerHTML = '';

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'graph-container');
    svg.appendChild(g);

    if (nodes.length === 0) {
      renderEmptyState();
      return;
    }

    switch (currentView) {
      case 'flow':
        renderFlowView(g);
        break;
      case 'context':
        renderContextView(g);
        break;
      case 'drilling':
        renderDrillingView(g);
        break;
    }

    updateTransform();
  }

  function renderEmptyState() {
    const container = document.querySelector('.canvas-container');
    container.innerHTML = \`
      <div class="empty-state">
        <h2>No React components found</h2>
        <p>Make sure your workspace contains .tsx or .jsx files with React components</p>
      </div>
    \`;
  }

  function renderFlowView(g) {
    // Layout with directory clustering
    const clusters = layoutForStateFlow();

    // Draw cluster boundaries (directories)
    clusters.forEach((clusterNodes, clusterId) => {
      if (!clusterId.startsWith('dir:')) return;
      const clusterInfo = dagreGraph ? dagreGraph.node(clusterId) : null;
      if (clusterInfo && clusterInfo.width && clusterInfo.height) {
        drawClusterBoundary(g, clusterInfo, clusterId.replace('dir:', ''), '#30363d');
      }
    });

    // Draw edges (only for visible nodes)
    try {
      graphData.edges.forEach(edge => {
        const source = nodes.find(n => n.id === edge.from);
        const target = nodes.find(n => n.id === edge.to);
        if (source && target && !isHiddenByCollapse(source.id) && !isHiddenByCollapse(target.id)) {
          drawEdge(g, source, target, edge);
        }
      });
    } catch (e) {
      console.error('Error drawing edges:', e);
    }

    // Draw visible nodes
    getVisibleNodes().forEach(node => drawNode(g, node));
  }

  function renderContextView(g) {
    // Layout with context boundary clustering
    const clusters = layoutForContextView();

    // Draw context boundaries from dagre cluster positions
    clusters.forEach((clusterNodes, clusterId) => {
      if (!clusterId.startsWith('ctx:')) return;
      const clusterInfo = dagreGraph ? dagreGraph.node(clusterId) : null;
      if (clusterInfo && clusterInfo.width && clusterInfo.height) {
        // Draw context boundary using cluster info
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', clusterInfo.x - clusterInfo.width / 2 - 20);
        rect.setAttribute('y', clusterInfo.y - clusterInfo.height / 2 - 25);
        rect.setAttribute('width', clusterInfo.width + 40);
        rect.setAttribute('height', clusterInfo.height + 45);
        rect.setAttribute('rx', 8);
        rect.setAttribute('class', 'context-boundary');

        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', clusterInfo.x - clusterInfo.width / 2 - 10);
        label.setAttribute('y', clusterInfo.y - clusterInfo.height / 2 - 8);
        label.setAttribute('fill', '#bc8cff');
        label.setAttribute('font-size', '11');
        label.setAttribute('font-weight', '500');
        label.textContent = clusterId.replace('ctx:', '') + '.Provider';

        g.insertBefore(label, g.firstChild);
        g.insertBefore(rect, g.firstChild);
      }
    });

    // Fallback: if no clusters were rendered, use the old boundary drawing method
    if (clusters.size === 0 && graphData.contextBoundaries.length > 0) {
      const total = graphData.contextBoundaries.length;

      function normalizeContextName(name) {
        return name.toLowerCase()
          .replace(/context$/i, '')
          .replace(/provider$/i, '')
          .replace(/consumer$/i, '');
      }

      graphData.contextBoundaries.forEach((boundary, index) => {
        const provider = nodes.find(n => n.id === boundary.providerComponent);
        const consumers = boundary.childComponents
          .map(id => nodes.find(n => n.id === id))
          .filter(n => n !== undefined);

        if (provider) {
          const normalizedBoundaryName = normalizeContextName(boundary.contextName);
          const contextConsumers = nodes.filter(n => {
            if (!n.data.contextConsumers || n.data.contextConsumers.length === 0) return false;
            return n.data.contextConsumers.some(consumerContext => {
              const normalizedConsumer = normalizeContextName(consumerContext);
              return consumerContext === boundary.contextName ||
                     normalizedConsumer === normalizedBoundaryName ||
                     normalizedConsumer.includes(normalizedBoundaryName) ||
                     normalizedBoundaryName.includes(normalizedConsumer);
            });
          });
          const allConsumers = [...new Set([...consumers, ...contextConsumers])];
          drawContextBoundary(g, provider, allConsumers, boundary.contextName, index, total);
        }
      });
    }

    // Draw props edges first (subtle, in background) to show component hierarchy
    graphData.edges
      .filter(e => e.mechanism === 'props')
      .forEach(edge => {
        const source = nodes.find(n => n.id === edge.from);
        const target = nodes.find(n => n.id === edge.to);
        if (source && target && !isHiddenByCollapse(source.id) && !isHiddenByCollapse(target.id)) {
          drawEdgeSubtle(g, source, target);
        }
      });

    // Draw context edges (only for visible nodes)
    graphData.edges
      .filter(e => e.mechanism === 'context')
      .forEach(edge => {
        const source = nodes.find(n => n.id === edge.from);
        const target = nodes.find(n => n.id === edge.to);
        if (source && target && !isHiddenByCollapse(source.id) && !isHiddenByCollapse(target.id)) {
          drawEdge(g, source, target, edge);
        }
      });

    // Draw visible nodes with purple border for providers
    getVisibleNodes().forEach(node => {
      const isProvider = node.data.contextProviders && node.data.contextProviders.length > 0;
      drawNode(g, node, isProvider ? '#8957e5' : null);
    });
  }

  // Draw subtle edge for showing hierarchy in context view
  function drawEdgeSubtle(g, source, target) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const nodeHeight = 20;

    const dx = target.x - source.x;
    const dy = target.y - source.y;

    let startX = source.x;
    let startY = source.y + nodeHeight;
    let endX = target.x;
    let endY = target.y - nodeHeight;

    if (dy < 0) {
      startY = source.y - nodeHeight;
      endY = target.y + nodeHeight;
    }

    const sourceWidth = getNodeWidth(source) / 2;
    const targetWidth = getNodeWidth(target) / 2;

    if (Math.abs(dx) > Math.abs(dy) * 2) {
      startY = source.y;
      endY = target.y;
      startX = source.x + (dx > 0 ? sourceWidth : -sourceWidth);
      endX = target.x + (dx > 0 ? -targetWidth : targetWidth);
    }

    const midY = (startY + endY) / 2;
    const d = \`M\${startX},\${startY} C\${startX},\${midY} \${endX},\${midY} \${endX},\${endY}\`;

    path.setAttribute('d', d);
    path.setAttribute('class', 'edge edge-props-subtle');
    path.setAttribute('fill', 'none');

    g.insertBefore(path, g.firstChild);
  }

  function renderDrillingView(g) {
    if (graphData.propDrillingPaths.length === 0) {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', svg.clientWidth / 2);
      text.setAttribute('y', svg.clientHeight / 2);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('fill', '#3fb950');
      text.setAttribute('font-size', '16');
      text.textContent = '\\u2713 No prop drilling detected';
      g.appendChild(text);
      return;
    }

    // Layout drilling paths as vertical chains, side by side
    const VERTICAL_GAP = 70;
    const HORIZONTAL_GAP = 250;
    const START_X = 150;
    const START_Y = 80;

    // Add arrow marker for drilling
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = \`
      <marker id="arrow-red" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
        <path d="M0,0 L0,6 L8,3 z" fill="#f85149" />
      </marker>
    \`;
    g.appendChild(defs);

    graphData.propDrillingPaths.forEach((drillingPath, pathIndex) => {
      const chainX = START_X + pathIndex * HORIZONTAL_GAP;

      // Draw path label (state name being drilled)
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', chainX);
      label.setAttribute('y', START_Y - 40);
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('fill', '#f85149');
      label.setAttribute('font-size', '13');
      label.setAttribute('font-weight', '600');
      label.textContent = drillingPath.stateName + ' (' + drillingPath.hops + ' hops)';
      g.appendChild(label);

      // Create positioned nodes for this chain
      const chainNodes = [];
      drillingPath.path.forEach((componentName, index) => {
        const originalNode = nodes.find(n => n.name === componentName);
        if (originalNode) {
          chainNodes.push({
            ...originalNode,
            x: chainX,
            y: START_Y + index * VERTICAL_GAP,
            isFirst: index === 0,
            isLast: index === drillingPath.path.length - 1
          });
        }
      });

      // Draw edges between chain nodes
      for (let i = 0; i < chainNodes.length - 1; i++) {
        const source = chainNodes[i];
        const target = chainNodes[i + 1];

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const startY = source.y + 16;
        const endY = target.y - 16;
        const midY = (startY + endY) / 2;

        path.setAttribute('d', \`M\${source.x},\${startY} C\${source.x},\${midY} \${target.x},\${midY} \${target.x},\${endY}\`);
        path.setAttribute('class', 'edge edge-drilling');
        path.setAttribute('marker-end', 'url(#arrow-red)');
        g.appendChild(path);
      }

      // Draw nodes
      chainNodes.forEach(node => {
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', 'node');
        group.setAttribute('transform', \`translate(\${node.x}, \${node.y})\`);

        const width = getNodeWidth(node);
        const height = 32;

        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', -width / 2);
        rect.setAttribute('y', -height / 2);
        rect.setAttribute('width', width);
        rect.setAttribute('height', height);
        rect.setAttribute('rx', 4);

        // First node (origin) is blue, last (consumer) is green, middle (pass-through) is orange
        let fillColor;
        if (node.isFirst) {
          fillColor = '#1f6feb'; // Blue - origin/defines state
        } else if (node.isLast) {
          fillColor = '#238636'; // Green - actually uses it
        } else {
          fillColor = '#d29922'; // Orange/yellow - pass-through
        }
        rect.setAttribute('fill', fillColor);

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('class', 'node-label');
        text.textContent = node.name;

        group.appendChild(rect);
        group.appendChild(text);

        group.addEventListener('click', () => showNodeDetails(node));

        g.appendChild(group);
      });
    });

    // Update transform to fit drilling view
    const numPaths = graphData.propDrillingPaths.length;
    const maxPathLength = Math.max(...graphData.propDrillingPaths.map(p => p.path.length));
    const totalWidth = numPaths * HORIZONTAL_GAP;
    const totalHeight = maxPathLength * VERTICAL_GAP + 100;

    const width = svg.clientWidth || 800;
    const height = svg.clientHeight || 600;
    const scaleX = (width - 80) / totalWidth;
    const scaleY = (height - 80) / totalHeight;
    const scale = Math.min(scaleX, scaleY, 1.0);

    transform.scale = scale;
    transform.x = (width - totalWidth * scale) / 2;
    transform.y = 40;
  }

  function drawNode(g, node, borderColor) {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', 'node');
    group.setAttribute('transform', \`translate(\${node.x}, \${node.y})\`);

    const width = getNodeWidth(node);
    const height = 32;

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', -width / 2);
    rect.setAttribute('y', -height / 2);
    rect.setAttribute('width', width);
    rect.setAttribute('height', height);
    rect.setAttribute('rx', 4);
    rect.setAttribute('class', \`node-rect \${node.hasState ? 'node-component-state' : 'node-component'}\`);

    // Add border for context providers
    if (borderColor) {
      rect.setAttribute('stroke', borderColor);
      rect.setAttribute('stroke-width', '3');
    }

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('class', 'node-label');
    text.textContent = node.name;

    group.appendChild(rect);
    group.appendChild(text);

    // Add collapse indicator if node has children (only in flow/context views)
    if (currentView !== 'drilling') {
      const hasChildren = graphData.edges.some(e =>
        e.from === node.id && e.mechanism === 'props'
      );

      if (hasChildren) {
        const isCollapsed = collapsedNodes.has(node.id);
        const indicator = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        indicator.setAttribute('x', width / 2 - 14);
        indicator.setAttribute('y', 4);
        indicator.setAttribute('fill', '#8b949e');
        indicator.setAttribute('font-size', '12');
        indicator.setAttribute('class', 'collapse-indicator');
        indicator.textContent = isCollapsed ? '\\u25B6' : '\\u25BC';

        indicator.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleCollapse(node.id);
        });
        group.appendChild(indicator);

        // Show hidden count when collapsed
        if (isCollapsed) {
          const count = getDescendants(node.id).size;
          if (count > 0) {
            const badge = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            badge.setAttribute('x', width / 2 + 6);
            badge.setAttribute('y', -10);
            badge.setAttribute('fill', '#f0883e');
            badge.setAttribute('font-size', '10');
            badge.textContent = '+' + count;
            group.appendChild(badge);
          }
        }
      }
    }

    group.addEventListener('click', () => showNodeDetails(node));

    g.appendChild(group);
  }

  function drawEdge(g, source, target, edge) {
    // Add arrow markers if not exists
    if (!g.querySelector('#arrow-green')) {
      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      defs.innerHTML = \`
        <marker id="arrow-green" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#3fb950" />
        </marker>
        <marker id="arrow-purple" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#8957e5" />
        </marker>
      \`;
      g.appendChild(defs);
    }

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const nodeHeight = 20;
    const sourceWidth = getNodeWidth(source) / 2;
    const targetWidth = getNodeWidth(target) / 2;

    let d;

    // Try to use dagre's calculated edge path if available
    if (dagreGraph) {
      const dagreEdge = dagreGraph.edge(source.id, target.id);
      if (dagreEdge && dagreEdge.points && dagreEdge.points.length > 0) {
        const points = dagreEdge.points;
        d = 'M' + points[0].x + ',' + points[0].y;

        if (points.length === 2) {
          d += ' L' + points[1].x + ',' + points[1].y;
        } else if (points.length >= 3) {
          for (let i = 1; i < points.length - 1; i++) {
            const p0 = points[i - 1];
            const p1 = points[i];
            const p2 = points[i + 1];
            d += ' Q' + p1.x + ',' + p1.y + ' ' +
              ((p1.x + p2.x) / 2) + ',' + ((p1.y + p2.y) / 2);
          }
          d += ' L' + points[points.length - 1].x + ',' + points[points.length - 1].y;
        }
      }
    }

    // Fallback if dagre path not available
    if (!d) {
      const dx = target.x - source.x;
      const dy = target.y - source.y;

      let startX = source.x;
      let startY = source.y + nodeHeight;
      let endX = target.x;
      let endY = target.y - nodeHeight;

      if (dy < 0) {
        startY = source.y - nodeHeight;
        endY = target.y + nodeHeight;
      }

      if (Math.abs(dx) > Math.abs(dy) * 2) {
        startY = source.y;
        endY = target.y;
        startX = source.x + (dx > 0 ? sourceWidth : -sourceWidth);
        endX = target.x + (dx > 0 ? -targetWidth : targetWidth);
      }

      const midY = (startY + endY) / 2;
      d = \`M\${startX},\${startY} C\${startX},\${midY} \${endX},\${midY} \${endX},\${endY}\`;
    }

    path.setAttribute('d', d);
    path.setAttribute('class', \`edge edge-\${edge.mechanism}\`);
    path.setAttribute('marker-end', edge.mechanism === 'context' ? 'url(#arrow-purple)' : 'url(#arrow-green)');

    g.insertBefore(path, g.firstChild);
  }

  function drawContextBoundary(g, provider, consumers, name, index, total) {
    const allNodes = [provider, ...consumers].filter(n => n !== undefined);
    if (allNodes.length === 0) return;

    const basePadding = 50;
    const offset = (total - 1 - index) * 30;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    allNodes.forEach(n => {
      const nodeWidth = getNodeWidth(n);
      minX = Math.min(minX, n.x - nodeWidth / 2);
      maxX = Math.max(maxX, n.x + nodeWidth / 2);
      minY = Math.min(minY, n.y - 20);
      maxY = Math.max(maxY, n.y + 20);
    });

    minX = minX - basePadding - offset;
    minY = minY - basePadding - offset;
    maxX = maxX + basePadding + offset;
    maxY = maxY + basePadding + offset;

    const rectX = minX - 30;
    const rectY = minY - 25;
    const rectWidth = maxX - minX + 60;
    const rectHeight = maxY - minY + 50;

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', rectX);
    rect.setAttribute('y', rectY);
    rect.setAttribute('width', rectWidth);
    rect.setAttribute('height', rectHeight);
    rect.setAttribute('class', 'context-boundary');

    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', rectX + 10);
    label.setAttribute('y', rectY + 16);
    label.setAttribute('fill', '#bc8cff');
    label.setAttribute('font-size', '11');
    label.setAttribute('font-weight', '500');
    label.textContent = name + '.Provider';

    const labelBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    const labelWidth = name.length * 7 + 60;
    labelBg.setAttribute('x', rectX + 6);
    labelBg.setAttribute('y', rectY + 3);
    labelBg.setAttribute('width', labelWidth);
    labelBg.setAttribute('height', 18);
    labelBg.setAttribute('fill', '#0d1117');
    labelBg.setAttribute('rx', '3');

    g.insertBefore(label, g.firstChild);
    g.insertBefore(labelBg, g.firstChild);
    g.insertBefore(rect, g.firstChild);
  }

  function showNodeDetails(node) {
    const comp = node.data;
    const fileName = comp.filePath.split('/').pop();

    let html = \`
      <div class="sidebar-content">
        <div class="sidebar-section">
          <h3>\${comp.name}</h3>
          <div class="file-link">\${fileName}:\${comp.line}</div>
        </div>
    \`;

    if (comp.stateProvided.length > 0) {
      html += \`
        <div class="sidebar-section">
          <h3>State Defined</h3>
          \${comp.stateProvided.map(s => \`
            <span class="tag tag-state">\${s.name}</span>
            <span style="font-size:10px;color:#8b949e">(\${s.type})</span>
          \`).join('')}
        </div>
      \`;
    }

    if (comp.contextProviders.length > 0) {
      html += \`
        <div class="sidebar-section">
          <h3>Provides Context</h3>
          \${comp.contextProviders.map(c => \`<span class="tag tag-context">\${c.contextName}</span>\`).join('')}
        </div>
      \`;
    }

    if (comp.contextConsumers.length > 0) {
      html += \`
        <div class="sidebar-section">
          <h3>Consumes Context</h3>
          \${comp.contextConsumers.map(c => \`<span class="tag tag-context">\${c}</span>\`).join('')}
        </div>
      \`;
    }

    if (comp.props.length > 0) {
      html += \`
        <div class="sidebar-section">
          <h3>Props</h3>
          \${comp.props.map(p => \`<span class="tag tag-props">\${p.name}</span>\`).join('')}
        </div>
      \`;
    }

    const incoming = graphData.edges.filter(e => e.to === node.id);
    const outgoing = graphData.edges.filter(e => e.from === node.id);

    if (incoming.length > 0) {
      html += \`
        <div class="sidebar-section">
          <h3>Receives From</h3>
          \${incoming.map(e => {
            const from = graphData.components[e.from];
            return \`<div class="detail-row">
              <span class="detail-label">\${from?.name || 'Unknown'}</span>
              <span class="detail-value">\${e.mechanism}\${e.propName ? ' (' + e.propName + ')' : ''}</span>
            </div>\`;
          }).join('')}
        </div>
      \`;
    }

    if (outgoing.length > 0) {
      html += \`
        <div class="sidebar-section">
          <h3>Passes To</h3>
          \${outgoing.map(e => {
            const to = graphData.components[e.to];
            return \`<div class="detail-row">
              <span class="detail-label">\${to?.name || 'Unknown'}</span>
              <span class="detail-value">\${e.mechanism}\${e.propName ? ' (' + e.propName + ')' : ''}</span>
            </div>\`;
          }).join('')}
        </div>
      \`;
    }

    html += '</div>';
    sidebar.innerHTML = html;
  }

  function updateStats() {
    const drillingCount = graphData.propDrillingPaths.length;
    let drillingBadge = '';
    if (drillingCount > 0) {
      drillingBadge = \`<span class="warning-badge">\${drillingCount} drilling</span>\`;
    }

    statsEl.innerHTML = \`
      <span>\${summaryData.components.totalComponents} components</span>
      <span>\${summaryData.state.totalStateNodes} state</span>
      <span>\${summaryData.flow.totalEdges} edges</span>
      \${drillingBadge}
    \`;
  }

  function updateLegend() {
    if (currentView === 'drilling' && graphData.propDrillingPaths.length > 0) {
      legendEl.innerHTML = \`
        <div class="legend-item">
          <div class="legend-color" style="background: #1f6feb"></div>
          <span>Defines State</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #d29922"></div>
          <span>Pass-through</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #238636"></div>
          <span>Uses State</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #f85149"></div>
          <span>Drilling Path</span>
        </div>
      \`;
    } else if (currentView === 'context') {
      legendEl.innerHTML = \`
        <div class="legend-item">
          <div class="legend-color" style="background: #238636"></div>
          <span>Component</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #1f6feb"></div>
          <span>Has State</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #8957e5; border: 2px solid #8957e5;"></div>
          <span>Context Provider</span>
        </div>
        <div class="legend-item">
          <svg width="20" height="12"><line x1="0" y1="6" x2="20" y2="6" stroke="#8957e5" stroke-width="2" stroke-dasharray="4,2"/></svg>
          <span>Context Flow</span>
        </div>
      \`;
    } else {
      legendEl.innerHTML = \`
        <div class="legend-item">
          <div class="legend-color" style="background: #238636"></div>
          <span>Component</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #1f6feb"></div>
          <span>Has State</span>
        </div>
        <div class="legend-item">
          <svg width="20" height="12"><line x1="0" y1="6" x2="20" y2="6" stroke="#3fb950" stroke-width="2"/><polygon points="16,3 20,6 16,9" fill="#3fb950"/></svg>
          <span>Props</span>
        </div>
        <div class="legend-item">
          <svg width="20" height="12"><line x1="0" y1="6" x2="20" y2="6" stroke="#8957e5" stroke-width="2" stroke-dasharray="4,2"/></svg>
          <span>Context</span>
        </div>
      \`;
    }
  }
})();
  `;
}
