import type { SerializedStateFlowGraph, GraphSummary, ParseWarning } from '@react-state-map/core';
// @ts-ignore - esbuild imports this as text
import dagreBundleCode from './dagre.bundle.js';

export function getWebviewContent(
  graph: SerializedStateFlowGraph,
  summary: GraphSummary,
  warnings: ParseWarning[]
): string {
  const graphJSON = JSON.stringify(graph);
  const summaryJSON = JSON.stringify(summary);
  const warningsJSON = JSON.stringify(warnings);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
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
        <button class="refresh-btn" id="fitBtn" title="Fit to View">⊡</button>
        <button class="refresh-btn" id="refreshBtn" title="Refresh">↻</button>
      </div>
    </header>
    <main class="main">
      <div class="canvas-container">
        <svg id="graph" width="100%" height="100%"></svg>
      </div>
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-content">
          <h3>Select a node</h3>
          <p>Click on a component to see details and navigate to source</p>
        </div>
      </aside>
    </main>
    <div class="legend" id="legend"></div>
  </div>
  <script>${dagreBundleCode}</script>
  <script>
const vscode = acquireVsCodeApi();
const graphData = ${graphJSON};
const summaryData = ${summaryJSON};
const warningsData = ${warningsJSON};
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
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      background: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
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
      padding: 8px 16px;
      background: var(--vscode-sideBar-background);
      border-bottom: 1px solid var(--vscode-panel-border);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .header h1 {
      font-size: 14px;
      font-weight: 600;
      color: var(--vscode-foreground);
    }

    .tabs {
      display: flex;
      gap: 2px;
    }

    .tab {
      padding: 4px 12px;
      border: none;
      background: transparent;
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
      cursor: pointer;
      border-radius: 4px;
      transition: all 0.15s;
    }

    .tab:hover {
      background: var(--vscode-toolbar-hoverBackground);
      color: var(--vscode-foreground);
    }

    .tab.active {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }

    .stats {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
    }

    .stats span {
      margin-left: 12px;
    }

    .refresh-btn {
      padding: 4px 8px;
      border: none;
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      font-size: 14px;
      cursor: pointer;
      border-radius: 4px;
    }

    .refresh-btn:hover {
      background: var(--vscode-button-secondaryHoverBackground);
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
      width: 280px;
      background: var(--vscode-sideBar-background);
      border-left: 1px solid var(--vscode-panel-border);
      overflow-y: auto;
    }

    .sidebar-content {
      padding: 16px;
    }

    .sidebar h3 {
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 8px;
      color: var(--vscode-foreground);
    }

    .sidebar p {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      line-height: 1.4;
    }

    .sidebar-section {
      margin-bottom: 16px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--vscode-panel-border);
    }

    .sidebar-section:last-child {
      border-bottom: none;
    }

    .file-link {
      display: block;
      padding: 4px 8px;
      margin: 4px 0;
      background: var(--vscode-textBlockQuote-background);
      border-radius: 4px;
      font-size: 11px;
      color: var(--vscode-textLink-foreground);
      cursor: pointer;
      text-decoration: none;
    }

    .file-link:hover {
      background: var(--vscode-list-hoverBackground);
      text-decoration: underline;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      font-size: 12px;
    }

    .detail-label {
      color: var(--vscode-descriptionForeground);
    }

    .detail-value {
      color: var(--vscode-foreground);
    }

    .tag {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 10px;
      font-size: 11px;
      margin: 2px;
    }

    .tag-state {
      background: var(--vscode-charts-blue);
      color: white;
    }
    .tag-context {
      background: var(--vscode-charts-purple);
      color: white;
    }
    .tag-props {
      background: var(--vscode-charts-green);
      color: white;
    }

    .legend {
      display: flex;
      gap: 16px;
      padding: 8px 16px;
      background: var(--vscode-sideBar-background);
      border-top: 1px solid var(--vscode-panel-border);
      font-size: 11px;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .legend-color {
      width: 10px;
      height: 10px;
      border-radius: 2px;
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
      fill: var(--vscode-charts-green);
    }

    .node-component-state {
      fill: var(--vscode-charts-blue);
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
      stroke: var(--vscode-charts-green);
    }

    .edge-context {
      stroke: var(--vscode-charts-purple);
      stroke-dasharray: 5, 5;
    }

    .edge-props-subtle {
      stroke: var(--vscode-panel-border);
      stroke-width: 1;
      opacity: 0.5;
    }

    .edge-drilling {
      stroke: var(--vscode-charts-red);
      stroke-width: 3;
    }

    .context-boundary {
      fill: color-mix(in srgb, var(--vscode-charts-purple) 10%, transparent);
      stroke: var(--vscode-charts-purple);
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
      fill: var(--vscode-foreground) !important;
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
      color: var(--vscode-descriptionForeground);
      text-align: center;
      padding: 20px;
    }

    .empty-state h2 {
      font-size: 16px;
      margin-bottom: 8px;
      color: var(--vscode-foreground);
    }

    .warning-badge {
      background: var(--vscode-inputValidation-warningBackground);
      color: var(--vscode-inputValidation-warningForeground);
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      margin-left: 8px;
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
  const refreshBtn = document.getElementById('refreshBtn');
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

    refreshBtn.addEventListener('click', () => {
      vscode.postMessage({ command: 'refresh' });
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

  // Store dagre graph globally for edge routing (declared at top)

  // Find connected components using Union-Find
  function findConnectedComponents(nodeIds, edges) {
    const parent = {};
    const rank = {};

    // Initialize each node as its own parent
    nodeIds.forEach(id => {
      parent[id] = id;
      rank[id] = 0;
    });

    function find(x) {
      if (parent[x] !== x) {
        parent[x] = find(parent[x]); // Path compression
      }
      return parent[x];
    }

    function union(x, y) {
      const px = find(x);
      const py = find(y);
      if (px === py) return;
      // Union by rank
      if (rank[px] < rank[py]) {
        parent[px] = py;
      } else if (rank[px] > rank[py]) {
        parent[py] = px;
      } else {
        parent[py] = px;
        rank[px]++;
      }
    }

    // Union nodes connected by edges
    edges.forEach(edge => {
      if (parent[edge.from] !== undefined && parent[edge.to] !== undefined) {
        union(edge.from, edge.to);
      }
    });

    // Group nodes by their root parent
    const components = {};
    nodeIds.forEach(id => {
      const root = find(id);
      if (!components[root]) {
        components[root] = [];
      }
      components[root].push(id);
    });

    return Object.values(components);
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
      for (const boundary of graphData.contextBoundaries) {
        if (boundary.providerComponent === node.id) {
          return 'ctx:' + boundary.contextName;
        }
      }
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
    text.setAttribute('fill', 'var(--vscode-descriptionForeground)');
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
      // User can zoom out with scroll wheel to see everything
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
        drawClusterBoundary(g, clusterInfo, clusterId.replace('dir:', ''), 'var(--vscode-panel-border)');
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
        label.setAttribute('fill', 'var(--vscode-charts-purple)');
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
      drawNode(g, node, isProvider ? 'var(--vscode-charts-purple)' : null);
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
      text.setAttribute('fill', 'var(--vscode-charts-green)');
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
        <path d="M0,0 L0,6 L8,3 z" fill="var(--vscode-charts-red)" />
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
      label.setAttribute('fill', 'var(--vscode-charts-red)');
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
          fillColor = 'var(--vscode-charts-blue)'; // Blue - origin/defines state
        } else if (node.isLast) {
          fillColor = 'var(--vscode-charts-green)'; // Green - actually uses it
        } else {
          fillColor = 'var(--vscode-charts-yellow)'; // Yellow/orange - pass-through
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
        indicator.setAttribute('fill', 'var(--vscode-descriptionForeground)');
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
            badge.setAttribute('fill', 'var(--vscode-charts-yellow)');
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
          <path d="M0,0 L0,6 L8,3 z" fill="var(--vscode-charts-green)" />
        </marker>
        <marker id="arrow-purple" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="var(--vscode-charts-purple)" />
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
        // Use dagre's calculated path points
        const points = dagreEdge.points;
        d = 'M' + points[0].x + ',' + points[0].y;

        if (points.length === 2) {
          // Simple line
          d += ' L' + points[1].x + ',' + points[1].y;
        } else if (points.length >= 3) {
          // Create smooth curve through all points
          for (let i = 1; i < points.length - 1; i++) {
            const p0 = points[i - 1];
            const p1 = points[i];
            const p2 = points[i + 1];
            // Quadratic bezier through midpoints
            d += ' Q' + p1.x + ',' + p1.y + ' ' +
              ((p1.x + p2.x) / 2) + ',' + ((p1.y + p2.y) / 2);
          }
          // Final line to last point
          d += ' L' + points[points.length - 1].x + ',' + points[points.length - 1].y;
        }
      }
    }

    // Fallback if dagre path not available
    if (!d) {
      const dx = target.x - source.x;
      const dy = target.y - source.y;

      let startX = source.x;
      let startY = source.y + nodeHeight; // Bottom of source
      let endX = target.x;
      let endY = target.y - nodeHeight; // Top of target

      // If target is above source, flip
      if (dy < 0) {
        startY = source.y - nodeHeight;
        endY = target.y + nodeHeight;
      }

      // If mostly horizontal, use sides
      if (Math.abs(dx) > Math.abs(dy) * 2) {
        startY = source.y;
        endY = target.y;
        startX = source.x + (dx > 0 ? sourceWidth : -sourceWidth);
        endX = target.x + (dx > 0 ? -targetWidth : targetWidth);
      }

      // Create smooth bezier curve
      const midY = (startY + endY) / 2;
      d = \`M\${startX},\${startY} C\${startX},\${midY} \${endX},\${midY} \${endX},\${endY}\`;
    }

    path.setAttribute('d', d);
    path.setAttribute('class', \`edge edge-\${edge.mechanism}\`);
    path.setAttribute('marker-end', edge.mechanism === 'context' ? 'url(#arrow-purple)' : 'url(#arrow-green)');

    g.insertBefore(path, g.firstChild);
  }

  function drawContextBoundary(g, provider, consumers, name, index, total) {
    // Include provider in the boundary nodes
    const allNodes = [provider, ...consumers].filter(n => n !== undefined);
    if (allNodes.length === 0) return;

    const basePadding = 50;
    const offset = (total - 1 - index) * 30; // Outer contexts have more padding

    // Calculate bounding box with node widths considered
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

    // Position label at top-left corner of its own boundary
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', rectX + 10);
    label.setAttribute('y', rectY + 16);
    label.setAttribute('fill', 'var(--vscode-charts-purple)');
    label.setAttribute('font-size', '11');
    label.setAttribute('font-weight', '500');
    label.textContent = name + '.Provider';

    // Add background for label readability
    const labelBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    const labelWidth = name.length * 7 + 60;
    labelBg.setAttribute('x', rectX + 6);
    labelBg.setAttribute('y', rectY + 3);
    labelBg.setAttribute('width', labelWidth);
    labelBg.setAttribute('height', 18);
    labelBg.setAttribute('fill', 'var(--vscode-editor-background)');
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
          <a class="file-link" data-path="\${comp.filePath}" data-line="\${comp.line}">
            \${fileName}:\${comp.line}
          </a>
        </div>
    \`;

    if (comp.stateProvided.length > 0) {
      html += \`
        <div class="sidebar-section">
          <h3>State Defined</h3>
          \${comp.stateProvided.map(s => \`
            <span class="tag tag-state">\${s.name}</span>
            <span style="font-size:10px;color:var(--vscode-descriptionForeground)">(\${s.type})</span>
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

    // Add click handlers for file links
    sidebar.querySelectorAll('.file-link').forEach(link => {
      link.addEventListener('click', () => {
        const filePath = link.getAttribute('data-path');
        const line = parseInt(link.getAttribute('data-line'), 10);
        vscode.postMessage({
          command: 'openFile',
          filePath,
          line
        });
      });
    });
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
          <div class="legend-color" style="background: var(--vscode-charts-blue)"></div>
          <span>Defines State</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: var(--vscode-charts-yellow)"></div>
          <span>Pass-through</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: var(--vscode-charts-green)"></div>
          <span>Uses State</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: var(--vscode-charts-red)"></div>
          <span>Drilling Path</span>
        </div>
      \`;
    } else if (currentView === 'context') {
      legendEl.innerHTML = \`
        <div class="legend-item">
          <div class="legend-color" style="background: var(--vscode-charts-green)"></div>
          <span>Component</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: var(--vscode-charts-blue)"></div>
          <span>Has State</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: var(--vscode-charts-purple); border: 2px solid var(--vscode-charts-purple);"></div>
          <span>Context Provider</span>
        </div>
        <div class="legend-item">
          <svg width="20" height="12"><line x1="0" y1="6" x2="20" y2="6" stroke="var(--vscode-charts-purple)" stroke-width="2" stroke-dasharray="4,2"/></svg>
          <span>Context Flow</span>
        </div>
      \`;
    } else {
      legendEl.innerHTML = \`
        <div class="legend-item">
          <div class="legend-color" style="background: var(--vscode-charts-green)"></div>
          <span>Component</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: var(--vscode-charts-blue)"></div>
          <span>Has State</span>
        </div>
        <div class="legend-item">
          <svg width="20" height="12"><line x1="0" y1="6" x2="20" y2="6" stroke="var(--vscode-charts-green)" stroke-width="2"/><polygon points="16,3 20,6 16,9" fill="var(--vscode-charts-green)"/></svg>
          <span>Props</span>
        </div>
        <div class="legend-item">
          <svg width="20" height="12"><line x1="0" y1="6" x2="20" y2="6" stroke="var(--vscode-charts-purple)" stroke-width="2" stroke-dasharray="4,2"/></svg>
          <span>Context</span>
        </div>
      \`;
    }
  }
})();
  `;
}
