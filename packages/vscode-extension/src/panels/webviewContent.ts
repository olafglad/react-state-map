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

  function layoutNodes() {
    if (nodes.length === 0) return;

    const nodeMap = {};
    nodes.forEach(n => { nodeMap[n.id] = n; });

    // Get max node width for spacing calculations
    let maxNodeWidth = 0;
    nodes.forEach(n => {
      maxNodeWidth = Math.max(maxNodeWidth, getNodeWidth(n));
    });

    // Spacing constants
    const HORIZONTAL_GAP = maxNodeWidth + 50;
    const VERTICAL_GAP = 80;

    // Collect edges
    const allEdges = graphData.edges.filter(e =>
      e.mechanism === 'props' || e.mechanism === 'context'
    );

    // Build adjacency lists
    const children = {};
    const parents = {};
    nodes.forEach(n => {
      children[n.id] = [];
      parents[n.id] = [];
    });

    allEdges.forEach(edge => {
      if (children[edge.from] && parents[edge.to]) {
        if (!children[edge.from].includes(edge.to)) {
          children[edge.from].push(edge.to);
        }
        if (!parents[edge.to].includes(edge.from)) {
          parents[edge.to].push(edge.from);
        }
      }
    });

    // Calculate depth using BFS
    const depth = {};
    nodes.forEach(n => { depth[n.id] = -1; });

    // Find roots (nodes with no parents)
    const roots = nodes.filter(n => parents[n.id].length === 0);

    // BFS to assign depths
    const queue = [];
    roots.forEach(r => {
      depth[r.id] = 0;
      queue.push(r.id);
    });

    while (queue.length > 0) {
      const nodeId = queue.shift();
      const nodeDepth = depth[nodeId];
      children[nodeId].forEach(childId => {
        if (depth[childId] < nodeDepth + 1) {
          depth[childId] = nodeDepth + 1;
          queue.push(childId);
        }
      });
    }

    // Assign depth 0 to disconnected nodes
    nodes.forEach(n => {
      if (depth[n.id] === -1) depth[n.id] = 0;
    });

    // Group by depth
    const nodesByDepth = {};
    let maxDepth = 0;
    nodes.forEach(n => {
      const d = depth[n.id];
      if (!nodesByDepth[d]) nodesByDepth[d] = [];
      nodesByDepth[d].push(n);
      maxDepth = Math.max(maxDepth, d);
    });

    // Position nodes level by level
    // Limit nodes per row to prevent extremely wide layouts
    const MAX_NODES_PER_ROW = 20;
    let currentY = 0;

    for (let d = 0; d <= maxDepth; d++) {
      const levelNodes = nodesByDepth[d] || [];

      // Split level into multiple rows if needed
      const numRows = Math.ceil(levelNodes.length / MAX_NODES_PER_ROW);

      for (let rowIndex = 0; rowIndex < numRows; rowIndex++) {
        const startIdx = rowIndex * MAX_NODES_PER_ROW;
        const endIdx = Math.min(startIdx + MAX_NODES_PER_ROW, levelNodes.length);
        const rowNodes = levelNodes.slice(startIdx, endIdx);

        const rowWidth = rowNodes.length * HORIZONTAL_GAP;
        const startX = -rowWidth / 2 + HORIZONTAL_GAP / 2;

        rowNodes.forEach((node, index) => {
          node.x = startX + index * HORIZONTAL_GAP;
          node.y = currentY;
        });

        currentY += VERTICAL_GAP;
      }

      // Add extra gap between depth levels
      if (numRows > 0 && d < maxDepth) {
        currentY += VERTICAL_GAP / 2;
      }
    }

    // Center the entire graph (find bounds and shift)
    let minX = Infinity, maxX = -Infinity;
    nodes.forEach(n => {
      minX = Math.min(minX, n.x);
      maxX = Math.max(maxX, n.x);
    });
    const offsetX = -minX + HORIZONTAL_GAP / 2;
    nodes.forEach(n => { n.x += offsetX; });

    // Create dagreGraph for edge routing
    dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setGraph({ rankdir: 'TB' });
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    nodes.forEach(node => {
      dagreGraph.setNode(node.id, {
        x: node.x,
        y: node.y,
        width: getNodeWidth(node),
        height: 40
      });
    });

    // Fit the view
    fitToView();
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
    // Draw edges first (behind nodes)
    try {
      graphData.edges.forEach(edge => {
        const source = nodes.find(n => n.id === edge.from);
        const target = nodes.find(n => n.id === edge.to);
        if (source && target) {
          drawEdge(g, source, target, edge);
        }
      });
    } catch (e) {
      console.error('Error drawing edges:', e);
    }

    // Always draw nodes
    nodes.forEach(node => drawNode(g, node));
  }

  function renderContextView(g) {
    const total = graphData.contextBoundaries.length;

    // Helper to normalize context names for matching
    function normalizeContextName(name) {
      return name.toLowerCase()
        .replace(/context$/i, '')
        .replace(/provider$/i, '')
        .replace(/consumer$/i, '');
    }

    graphData.contextBoundaries.forEach((boundary, index) => {
      const provider = nodes.find(n => n.id === boundary.providerComponent);

      // Find all consumers - match by ID
      const consumers = boundary.childComponents
        .map(id => nodes.find(n => n.id === id))
        .filter(n => n !== undefined);

      // Draw boundary if we have provider
      if (provider) {
        const normalizedBoundaryName = normalizeContextName(boundary.contextName);

        // Include ALL nodes that consume this context by checking their data
        // Use flexible matching to handle different naming conventions
        const contextConsumers = nodes.filter(n => {
          if (!n.data.contextConsumers || n.data.contextConsumers.length === 0) return false;

          return n.data.contextConsumers.some(consumerContext => {
            const normalizedConsumer = normalizeContextName(consumerContext);
            // Check if names match (either exactly or normalized)
            return consumerContext === boundary.contextName ||
                   normalizedConsumer === normalizedBoundaryName ||
                   normalizedConsumer.includes(normalizedBoundaryName) ||
                   normalizedBoundaryName.includes(normalizedConsumer);
          });
        });

        const allConsumers = [...new Set([...consumers, ...contextConsumers])];

        // Even if there are no direct consumers, show the boundary for the provider
        drawContextBoundary(g, provider, allConsumers, boundary.contextName, index, total);
      }
    });

    graphData.edges
      .filter(e => e.mechanism === 'context')
      .forEach(edge => {
        const source = nodes.find(n => n.id === edge.from);
        const target = nodes.find(n => n.id === edge.to);
        if (source && target) drawEdge(g, source, target, edge);
      });

    // Draw nodes with purple border for providers
    nodes.forEach(node => {
      const isProvider = node.data.contextProviders && node.data.contextProviders.length > 0;
      drawNode(g, node, isProvider ? 'var(--vscode-charts-purple)' : null);
    });
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
