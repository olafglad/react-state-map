import type { SerializedStateFlowGraph } from '@react-state-map/core';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load dagre bundle at runtime (kept for fallback)
function getDagreBundle(): string {
  const bundlePath = path.join(__dirname, 'dagre.bundle.js');
  const srcBundlePath = path.join(__dirname, '..', '..', 'src', 'renderers', 'dagre.bundle.js');

  if (fs.existsSync(bundlePath)) {
    return fs.readFileSync(bundlePath, 'utf-8');
  } else if (fs.existsSync(srcBundlePath)) {
    return fs.readFileSync(srcBundlePath, 'utf-8');
  }

  return '/* dagre bundle not found */';
}

// ELK CDN URL - load from CDN instead of embedding to avoid memory issues
const ELK_CDN_URL = 'https://unpkg.com/elkjs@0.9.3/lib/elk.bundled.js';

export function generateHTML(graph: SerializedStateFlowGraph): string {
  const graphJSON = JSON.stringify(graph);
  const dagreBundle = getDagreBundle();

  // Calculate summary stats
  const components = Object.values(graph.components);
  const stateCount = Object.keys(graph.stateNodes).length;
  const edgeCount = graph.edges.length;
  const drillingCount = graph.propDrillingPaths.length;

  // Build metrics lookup map
  const metricsMap: Record<string, typeof graph.componentMetrics[0]> = {};
  for (const metric of graph.componentMetrics) {
    metricsMap[metric.componentId] = metric;
  }

  // Count roles
  const roleDistribution = { passthrough: 0, consumer: 0, transformer: 0, mixed: 0 };
  for (const metric of graph.componentMetrics) {
    roleDistribution[metric.role]++;
  }

  // Count bundles
  const bundleCount = graph.bundles.length;
  const largeBundles = graph.bundles.filter(b => b.estimatedSize >= 5).length;

  // Count context leaks
  const contextLeakCount = graph.contextLeaks?.length || 0;
  const highSeverityLeaks = graph.contextLeaks?.filter(l => l.severity === 'high').length || 0;

  // Count prop chains (renames)
  const propChainCount = graph.propChains?.length || 0;
  const complexChains = graph.propChains?.filter(c => c.depth >= 2).length || 0;

  const summaryJSON = JSON.stringify({
    components: { totalComponents: components.length },
    state: { totalStateNodes: stateCount },
    flow: { totalEdges: edgeCount },
    roleDistribution,
    componentMetrics: metricsMap,
    bundles: graph.bundles,
    bundleStats: { total: bundleCount, large: largeBundles },
    contextLeaks: graph.contextLeaks || [],
    contextLeakStats: { total: contextLeakCount, highSeverity: highSeverityLeaks },
    propChains: graph.propChains || [],
    propChainStats: { total: propChainCount, complex: complexChains }
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
  <script src="${ELK_CDN_URL}"></script>
  <script>${dagreBundle}</script>
  <script>
const graphData = ${graphJSON};
const summaryData = ${summaryJSON};
const USE_ELK = typeof ELK !== 'undefined';
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
      stroke: #586069;
      stroke-width: 1.5;
      opacity: 0.7;
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

    .passthrough-badge {
      background: #d29922;
      color: #0d1117;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 9px;
      margin-left: 6px;
    }

    .role-badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 10px;
      font-weight: 500;
    }

    .role-passthrough {
      background: #d29922;
      color: #0d1117;
    }

    .role-consumer {
      background: #238636;
      color: white;
    }

    .role-transformer {
      background: #8957e5;
      color: white;
    }

    .role-mixed {
      background: #30363d;
      color: #c9d1d9;
    }

    .metrics-bar {
      display: flex;
      height: 6px;
      border-radius: 3px;
      overflow: hidden;
      margin: 8px 0;
      background: #21262d;
    }

    .metrics-bar-consumed {
      background: #238636;
    }

    .metrics-bar-passed {
      background: #d29922;
    }

    .metrics-bar-ignored {
      background: #f85149;
    }

    .bundle-badge {
      background: #a371f7;
      color: #0d1117;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 9px;
      margin-left: 6px;
    }

    .leak-badge {
      background: #da3633;
      color: white;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 9px;
      margin-left: 6px;
    }

    .rename-badge {
      background: #6e7681;
      color: white;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 9px;
      margin-left: 6px;
    }

    .bundle-item {
      padding: 8px;
      margin: 6px 0;
      background: #21262d;
      border-radius: 6px;
      border-left: 3px solid #a371f7;
    }

    .bundle-name {
      font-weight: 600;
      color: #a371f7;
    }

    .bundle-props {
      font-size: 11px;
      color: #8b949e;
      margin-top: 4px;
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

  // Context color palette - distinct, accessible colors
  const CONTEXT_COLORS = [
    { name: 'purple', fill: '#8957e5', light: '#bc8cff' },
    { name: 'teal', fill: '#39d353', light: '#56d364' },
    { name: 'orange', fill: '#d29922', light: '#e3b341' },
    { name: 'pink', fill: '#db61a2', light: '#f778ba' },
    { name: 'cyan', fill: '#33b3ae', light: '#79c0ff' },
    { name: 'red', fill: '#f85149', light: '#ff7b72' },
  ];
  let contextColorMap = new Map(); // contextName -> color index

  // Assign colors to all contexts
  function assignContextColors() {
    contextColorMap.clear();
    const contexts = new Set();
    // Collect all unique context names
    graphData.contextBoundaries.forEach(b => contexts.add(b.contextName));
    graphData.edges.filter(e => e.mechanism === 'context').forEach(e => {
      if (e.propName) contexts.add(e.propName);
    });
    // Also check component context providers/consumers
    Object.values(graphData.components).forEach(comp => {
      if (comp.contextProviders) {
        comp.contextProviders.forEach(p => contexts.add(p.contextName));
      }
      if (comp.contextConsumers) {
        comp.contextConsumers.forEach(c => contexts.add(c));
      }
    });
    // Assign colors
    let colorIndex = 0;
    contexts.forEach(name => {
      contextColorMap.set(name, colorIndex % CONTEXT_COLORS.length);
      colorIndex++;
    });
  }

  function getContextColor(contextName) {
    const index = contextColorMap.get(contextName);
    if (index !== undefined) {
      return CONTEXT_COLORS[index];
    }
    return CONTEXT_COLORS[0]; // fallback to purple
  }

  // Initialize when ready - use requestAnimationFrame to ensure DOM layout is complete
  requestAnimationFrame(() => {
    init().catch(err => console.error('Init error:', err));
  });

  async function init() {
    setupEventListeners();
    processGraph();
    assignContextColors();
    updateStats();
    updateLegend();
    await render();
    // Force a second fitToView after render to ensure proper positioning
    requestAnimationFrame(() => {
      fitToView();
      updateTransform();
    });
  }

  function setupEventListeners() {
    tabs.forEach(tab => {
      tab.addEventListener('click', async () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentView = tab.dataset.view;
        updateLegend();
        await render();
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
  async function toggleCollapse(nodeId) {
    if (collapsedNodes.has(nodeId)) {
      collapsedNodes.delete(nodeId);
    } else {
      collapsedNodes.add(nodeId);
    }
    await render();
  }

  // ELK layout options
  const elkOptions = {
    'elk.algorithm': 'layered',
    'elk.direction': 'DOWN',
    'elk.layered.spacing.nodeNodeBetweenLayers': '100',
    'elk.spacing.nodeNode': '60',
    'elk.padding': '[left=40, top=40, right=40, bottom=40]',
    'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
    'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
    'elk.layered.nodePlacement.bk.fixedAlignment': 'BALANCED',
  };

  // Store ELK edge points for drawing
  let elkEdgePoints = new Map();

  // Basic layout (uses ELK if available, falls back to Dagre)
  function layoutNodes() {
    if (nodes.length === 0) return;

    if (USE_ELK) {
      layoutNodesElk();
    } else if (typeof dagre !== 'undefined') {
      layoutNodesDagre();
    } else {
      layoutNodesFallback();
    }
  }

  // ELK layout (async)
  async function layoutNodesElk() {
    const elk = new ELK.default();

    // Build ELK graph
    const elkChildren = nodes.map(node => ({
      id: node.id,
      width: getNodeWidth(node),
      height: 40,
      labels: [{ text: node.name }],
    }));

    const elkEdges = graphData.edges
      .filter(e => e.mechanism === 'props' || e.mechanism === 'context')
      .filter(e => nodes.some(n => n.id === e.from) && nodes.some(n => n.id === e.to))
      .map((edge, i) => ({
        id: 'e' + i,
        sources: [edge.from],
        targets: [edge.to],
      }));

    const elkGraph = {
      id: 'root',
      layoutOptions: elkOptions,
      children: elkChildren,
      edges: elkEdges,
    };

    try {
      const result = await elk.layout(elkGraph);

      // Extract node positions
      if (result.children) {
        for (const child of result.children) {
          const node = nodes.find(n => n.id === child.id);
          if (node) {
            node.x = (child.x || 0) + (child.width || 0) / 2;
            node.y = (child.y || 0) + (child.height || 0) / 2;
          }
        }
      }

      // Extract edge points
      elkEdgePoints = new Map();
      if (result.edges) {
        for (const edge of result.edges) {
          if (edge.sections) {
            const points = [];
            for (const section of edge.sections) {
              if (section.startPoint) points.push(section.startPoint);
              if (section.bendPoints) points.push(...section.bendPoints);
              if (section.endPoint) points.push(section.endPoint);
            }
            // Map back to original edge
            const origEdge = graphData.edges.find(e =>
              edge.sources.includes(e.from) && edge.targets.includes(e.to)
            );
            if (origEdge) {
              elkEdgePoints.set(origEdge.from + '->' + origEdge.to, points);
            }
          }
        }
      }

      currentClusters = new Map();
      fitToView();
      updateTransform();
    } catch (error) {
      console.error('ELK layout error:', error);
      layoutNodesFallback();
    }
  }

  // Dagre layout (synchronous, fallback)
  function layoutNodesDagre() {
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

    nodes.forEach(node => {
      dagreGraph.setNode(node.id, {
        label: node.name,
        width: getNodeWidth(node),
        height: 40
      });
    });

    graphData.edges
      .filter(e => e.mechanism === 'props' || e.mechanism === 'context')
      .forEach(edge => {
        if (dagreGraph.hasNode(edge.from) && dagreGraph.hasNode(edge.to)) {
          dagreGraph.setEdge(edge.from, edge.to);
        }
      });

    dagre.layout(dagreGraph);

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

  // Layout with clustering support (uses ELK compound nodes or Dagre)
  async function layoutWithClustering(getClusterForNode) {
    if (nodes.length === 0) return new Map();

    // Identify clusters first
    const clusters = new Map();
    nodes.forEach(node => {
      const clusterId = getClusterForNode(node);
      if (clusterId) {
        if (!clusters.has(clusterId)) clusters.set(clusterId, []);
        clusters.get(clusterId).push(node);
      }
    });

    if (USE_ELK) {
      await layoutWithClusteringElk(clusters);
    } else if (typeof dagre !== 'undefined') {
      layoutWithClusteringDagre(getClusterForNode, clusters);
    } else {
      layoutNodesFallback();
    }

    return clusters;
  }

  // ELK layout with compound nodes (async)
  async function layoutWithClusteringElk(clusters) {
    const elk = new ELK.default();
    const processedNodes = new Set();

    // Build ELK graph with compound nodes for clusters
    const elkChildren = [];

    // Add cluster compound nodes with their children
    clusters.forEach((clusterNodes, clusterId) => {
      const children = clusterNodes.map(node => {
        processedNodes.add(node.id);
        return {
          id: node.id,
          width: getNodeWidth(node),
          height: 40,
          labels: [{ text: node.name }],
        };
      });

      elkChildren.push({
        id: clusterId,
        labels: [{ text: clusterId.replace(/^(ctx:|dir:)/, '') }],
        children: children,
        layoutOptions: {
          'elk.padding': '[left=20, top=35, right=20, bottom=20]',
        },
      });
    });

    // Add unclustered nodes
    nodes.forEach(node => {
      if (!processedNodes.has(node.id)) {
        elkChildren.push({
          id: node.id,
          width: getNodeWidth(node),
          height: 40,
          labels: [{ text: node.name }],
        });
      }
    });

    // Build edges
    const elkEdges = graphData.edges
      .filter(e => e.mechanism === 'props' || e.mechanism === 'context')
      .filter(e => nodes.some(n => n.id === e.from) && nodes.some(n => n.id === e.to))
      .map((edge, i) => ({
        id: 'e' + i,
        sources: [edge.from],
        targets: [edge.to],
      }));

    const elkGraph = {
      id: 'root',
      layoutOptions: elkOptions,
      children: elkChildren,
      edges: elkEdges,
    };

    try {
      const result = await elk.layout(elkGraph);

      // Extract positions recursively
      elkEdgePoints = new Map();

      function processElkChildren(children, offsetX = 0, offsetY = 0) {
        for (const child of children) {
          const x = (child.x || 0) + offsetX;
          const y = (child.y || 0) + offsetY;

          if (child.children && child.children.length > 0) {
            // This is a cluster - store its bounds
            const clusterData = currentClusters.get(child.id);
            if (clusterData) {
              // Store cluster bounds for drawing
              child._bounds = { x, y, width: child.width, height: child.height };
            }
            // Process children with offset
            processElkChildren(child.children, x, y);
          } else {
            // Regular node
            const node = nodes.find(n => n.id === child.id);
            if (node) {
              node.x = x + (child.width || 0) / 2;
              node.y = y + (child.height || 0) / 2;
            }
          }
        }
      }

      if (result.children) {
        processElkChildren(result.children);

        // Store cluster bounds for drawing boundaries
        for (const child of result.children) {
          if (child.children && child.children.length > 0) {
            const existing = clusters.get(child.id);
            if (existing) {
              existing._elkBounds = {
                x: child.x || 0,
                y: child.y || 0,
                width: child.width || 0,
                height: child.height || 0,
              };
            }
          }
        }
      }

      // Extract edge points
      function extractEdgePoints(container, offsetX = 0, offsetY = 0) {
        if (container.edges) {
          for (const edge of container.edges) {
            if (edge.sections) {
              const points = [];
              for (const section of edge.sections) {
                if (section.startPoint) {
                  points.push({ x: section.startPoint.x + offsetX, y: section.startPoint.y + offsetY });
                }
                if (section.bendPoints) {
                  for (const bp of section.bendPoints) {
                    points.push({ x: bp.x + offsetX, y: bp.y + offsetY });
                  }
                }
                if (section.endPoint) {
                  points.push({ x: section.endPoint.x + offsetX, y: section.endPoint.y + offsetY });
                }
              }
              const origEdge = graphData.edges.find(e =>
                edge.sources.includes(e.from) && edge.targets.includes(e.to)
              );
              if (origEdge) {
                elkEdgePoints.set(origEdge.from + '->' + origEdge.to, points);
              }
            }
          }
        }
        if (container.children) {
          for (const child of container.children) {
            if (child.children) {
              extractEdgePoints(child, offsetX + (child.x || 0), offsetY + (child.y || 0));
            }
          }
        }
      }
      extractEdgePoints(result);

      currentClusters = clusters;
      fitToView();
      updateTransform();
    } catch (error) {
      console.error('ELK clustering layout error:', error);
      layoutNodesFallback();
    }
  }

  // Dagre layout with clustering (synchronous, fallback)
  function layoutWithClusteringDagre(getClusterForNode, clusters) {
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
  }

  // Layout for State Flow view - directory-based clustering
  async function layoutForStateFlow() {
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

    return await layoutWithClustering(getDirectoryCluster);
  }

  // Layout for Context view - context boundary clustering
  async function layoutForContextView() {
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

    return await layoutWithClustering(getContextCluster);
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

  async function render() {
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
        await renderFlowView(g);
        break;
      case 'context':
        await renderContextView(g);
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

  async function renderFlowView(g) {
    // Layout with directory clustering
    const clusters = await layoutForStateFlow();

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

  async function renderContextView(g) {
    // Layout with context boundary clustering
    const clusters = await layoutForContextView();

    // Add context-colored arrow markers
    addContextArrowMarkers(g);

    // Draw context boundaries with context-specific colors
    graphData.contextBoundaries.forEach((boundary, index) => {
      const contextColor = getContextColor(boundary.contextName);
      const provider = nodes.find(n => n.id === boundary.providerComponent);
      const consumers = boundary.childComponents
        .map(id => nodes.find(n => n.id === id))
        .filter(n => n !== undefined);

      if (provider) {
        // Find additional consumers that use this context
        const normalizedBoundaryName = boundary.contextName.toLowerCase()
          .replace(/context$/i, '')
          .replace(/provider$/i, '')
          .replace(/consumer$/i, '');

        const contextConsumers = nodes.filter(n => {
          if (!n.data.contextConsumers || n.data.contextConsumers.length === 0) return false;
          return n.data.contextConsumers.some(consumerContext => {
            const normalizedConsumer = consumerContext.toLowerCase()
              .replace(/context$/i, '')
              .replace(/provider$/i, '')
              .replace(/consumer$/i, '');
            return consumerContext === boundary.contextName ||
                   normalizedConsumer === normalizedBoundaryName ||
                   normalizedConsumer.includes(normalizedBoundaryName) ||
                   normalizedBoundaryName.includes(normalizedConsumer);
          });
        });
        const allConsumers = [...new Set([...consumers, ...contextConsumers])];
        drawContextBoundaryColored(g, provider, allConsumers, boundary.contextName, contextColor, index);
      }
    });

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

    // Draw context edges with context-specific colors
    graphData.edges
      .filter(e => e.mechanism === 'context')
      .forEach(edge => {
        const source = nodes.find(n => n.id === edge.from);
        const target = nodes.find(n => n.id === edge.to);
        if (source && target && !isHiddenByCollapse(source.id) && !isHiddenByCollapse(target.id)) {
          // Determine which context this edge belongs to
          let contextName = edge.propName; // propName often contains context name
          if (!contextName && source.data.contextProviders) {
            // Get first context the source provides
            contextName = source.data.contextProviders[0]?.contextName;
          }
          const contextColor = contextName ? getContextColor(contextName) : CONTEXT_COLORS[0];
          drawContextEdge(g, source, target, contextColor);
        }
      });

    // Draw visible nodes with context-colored borders for providers
    getVisibleNodes().forEach(node => {
      const providers = node.data.contextProviders || [];
      if (providers.length > 0) {
        // Get colors for all contexts this node provides
        const borderColors = providers.map(p => getContextColor(p.contextName).fill);
        drawNodeWithMultipleBorders(g, node, borderColors);
      } else {
        drawNode(g, node, null);
      }
    });
  }

  // Add arrow markers for each context color
  function addContextArrowMarkers(g) {
    if (g.querySelector('#arrow-ctx-0')) return; // Already added

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    let markersHtml = '';
    CONTEXT_COLORS.forEach((color, index) => {
      markersHtml += \`
        <marker id="arrow-ctx-\${index}" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L0,10 L10,5 z" fill="\${color.fill}" />
        </marker>
      \`;
    });
    defs.innerHTML = markersHtml;
    g.appendChild(defs);
  }

  // Draw context edge with specific color
  function drawContextEdge(g, source, target, contextColor) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const nodeHalfHeight = 16;
    const sourceHalfWidth = getNodeWidth(source) / 2;
    const targetHalfWidth = getNodeWidth(target) / 2;

    const dx = target.x - source.x;
    const dy = target.y - source.y;

    let startX, startY, endX, endY;

    if (Math.abs(dy) > Math.abs(dx) * 0.5) {
      if (dy > 0) {
        startX = source.x;
        startY = source.y + nodeHalfHeight;
        endX = target.x;
        endY = target.y - nodeHalfHeight;
      } else {
        startX = source.x;
        startY = source.y - nodeHalfHeight;
        endX = target.x;
        endY = target.y + nodeHalfHeight;
      }
    } else {
      if (dx > 0) {
        startX = source.x + sourceHalfWidth;
        startY = source.y;
        endX = target.x - targetHalfWidth;
        endY = target.y;
      } else {
        startX = source.x - sourceHalfWidth;
        startY = source.y;
        endX = target.x + targetHalfWidth;
        endY = target.y;
      }
    }

    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;

    let d;
    if (Math.abs(dy) > Math.abs(dx) * 0.5) {
      d = \`M\${startX},\${startY} C\${startX},\${midY} \${endX},\${midY} \${endX},\${endY}\`;
    } else {
      d = \`M\${startX},\${startY} C\${midX},\${startY} \${midX},\${endY} \${endX},\${endY}\`;
    }

    path.setAttribute('d', d);
    path.setAttribute('stroke', contextColor.fill);
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-dasharray', '5, 5');
    path.setAttribute('fill', 'none');

    const colorIndex = CONTEXT_COLORS.indexOf(contextColor);
    path.setAttribute('marker-end', \`url(#arrow-ctx-\${colorIndex})\`);

    g.insertBefore(path, g.firstChild);
  }

  // Draw context boundary with specific color
  function drawContextBoundaryColored(g, provider, consumers, contextName, contextColor, index) {
    const allNodes = [provider, ...consumers].filter(n => n !== undefined);
    if (allNodes.length === 0) return;

    const basePadding = 40;
    const offset = index * 25; // More offset for nested boundaries to avoid overlap

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    allNodes.forEach(n => {
      const nodeWidth = getNodeWidth(n);
      minX = Math.min(minX, n.x - nodeWidth / 2);
      maxX = Math.max(maxX, n.x + nodeWidth / 2);
      minY = Math.min(minY, n.y - 20);
      maxY = Math.max(maxY, n.y + 20);
    });

    minX = minX - basePadding - offset;
    minY = minY - basePadding - offset - 20; // Extra space at top for label
    maxX = maxX + basePadding + offset;
    maxY = maxY + basePadding + offset;

    const rectX = minX;
    const rectY = minY;
    const rectWidth = maxX - minX;
    const rectHeight = maxY - minY;

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', rectX);
    rect.setAttribute('y', rectY);
    rect.setAttribute('width', rectWidth);
    rect.setAttribute('height', rectHeight);
    rect.setAttribute('rx', 8);
    rect.setAttribute('fill', contextColor.fill + '08'); // 8% opacity - more subtle
    rect.setAttribute('stroke', contextColor.fill);
    rect.setAttribute('stroke-width', '2');
    rect.setAttribute('stroke-dasharray', '8, 4');
    rect.setAttribute('pointer-events', 'none'); // Don't block clicks

    // Position label at top-left corner, outside the boundary
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', rectX + 8);
    label.setAttribute('y', rectY - 6);
    label.setAttribute('fill', contextColor.light);
    label.setAttribute('font-size', '11');
    label.setAttribute('font-weight', '500');
    label.textContent = contextName + '.Provider';

    // Label background
    const labelBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    const labelWidth = contextName.length * 7 + 60;
    labelBg.setAttribute('x', rectX + 4);
    labelBg.setAttribute('y', rectY - 20);
    labelBg.setAttribute('width', labelWidth);
    labelBg.setAttribute('height', 18);
    labelBg.setAttribute('fill', '#0d1117');
    labelBg.setAttribute('rx', '3');
    labelBg.setAttribute('pointer-events', 'none');

    // Insert in correct order: rect at back, then label bg, then label
    g.insertBefore(label, g.firstChild);
    g.insertBefore(labelBg, g.firstChild);
    g.insertBefore(rect, g.firstChild);
  }

  // Draw node with multiple colored borders (for multiple context providers)
  function drawNodeWithMultipleBorders(g, node, borderColors) {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', 'node');
    group.setAttribute('transform', \`translate(\${node.x}, \${node.y})\`);

    const width = getNodeWidth(node);
    const height = 32;

    // Draw border rings for each context (outer to inner)
    borderColors.forEach((color, i) => {
      const borderRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      const offset = (borderColors.length - 1 - i) * 3;
      borderRect.setAttribute('x', -width / 2 - offset - 2);
      borderRect.setAttribute('y', -height / 2 - offset - 2);
      borderRect.setAttribute('width', width + (offset + 2) * 2);
      borderRect.setAttribute('height', height + (offset + 2) * 2);
      borderRect.setAttribute('rx', 6);
      borderRect.setAttribute('fill', 'none');
      borderRect.setAttribute('stroke', color);
      borderRect.setAttribute('stroke-width', '2');
      group.appendChild(borderRect);
    });

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', -width / 2);
    rect.setAttribute('y', -height / 2);
    rect.setAttribute('width', width);
    rect.setAttribute('height', height);
    rect.setAttribute('rx', 4);
    rect.setAttribute('class', \`node-rect \${node.hasState ? 'node-component-state' : 'node-component'}\`);

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('class', 'node-label');
    text.textContent = node.name;

    group.appendChild(rect);
    group.appendChild(text);

    // Add collapse indicator if node has children
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

    group.addEventListener('click', () => showNodeDetails(node));
    g.appendChild(group);
  }

  // Draw subtle edge for showing hierarchy in context view
  function drawEdgeSubtle(g, source, target) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const nodeHalfHeight = 16;
    const sourceHalfWidth = getNodeWidth(source) / 2;
    const targetHalfWidth = getNodeWidth(target) / 2;

    const dx = target.x - source.x;
    const dy = target.y - source.y;

    let startX, startY, endX, endY;

    if (Math.abs(dy) > Math.abs(dx) * 0.5) {
      // Primarily vertical
      if (dy > 0) {
        startX = source.x;
        startY = source.y + nodeHalfHeight;
        endX = target.x;
        endY = target.y - nodeHalfHeight;
      } else {
        startX = source.x;
        startY = source.y - nodeHalfHeight;
        endX = target.x;
        endY = target.y + nodeHalfHeight;
      }
    } else {
      // Primarily horizontal
      if (dx > 0) {
        startX = source.x + sourceHalfWidth;
        startY = source.y;
        endX = target.x - targetHalfWidth;
        endY = target.y;
      } else {
        startX = source.x - sourceHalfWidth;
        startY = source.y;
        endX = target.x + targetHalfWidth;
        endY = target.y;
      }
    }

    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;

    let d;
    if (Math.abs(dy) > Math.abs(dx) * 0.5) {
      d = \`M\${startX},\${startY} C\${startX},\${midY} \${endX},\${midY} \${endX},\${endY}\`;
    } else {
      d = \`M\${startX},\${startY} C\${midX},\${startY} \${midX},\${endY} \${endX},\${endY}\`;
    }

    path.setAttribute('d', d);
    path.setAttribute('class', 'edge edge-props-subtle');
    path.setAttribute('fill', 'none');

    // Add subtle arrow marker if not exists
    if (!g.querySelector('#arrow-subtle')) {
      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      defs.innerHTML = \`
        <marker id="arrow-subtle" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L0,6 L6,3 z" fill="#586069" opacity="0.7" />
        </marker>
      \`;
      g.appendChild(defs);
    }
    path.setAttribute('marker-end', 'url(#arrow-subtle)');

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
        <marker id="arrow-green" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L0,10 L10,5 z" fill="#3fb950" />
        </marker>
        <marker id="arrow-purple" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L0,10 L10,5 z" fill="#8957e5" />
        </marker>
      \`;
      g.appendChild(defs);
    }

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

    // Use actual node dimensions (nodes are drawn with height=32, so half=16)
    const nodeHalfHeight = 16;
    const sourceHalfWidth = getNodeWidth(source) / 2;
    const targetHalfWidth = getNodeWidth(target) / 2;

    // Always calculate edge path based on actual node positions for reliability
    const dx = target.x - source.x;
    const dy = target.y - source.y;

    let startX, startY, endX, endY;

    // Determine connection points based on relative positions
    if (Math.abs(dy) > Math.abs(dx) * 0.5) {
      // Primarily vertical - connect top/bottom
      if (dy > 0) {
        // Target is below source
        startX = source.x;
        startY = source.y + nodeHalfHeight;
        endX = target.x;
        endY = target.y - nodeHalfHeight;
      } else {
        // Target is above source
        startX = source.x;
        startY = source.y - nodeHalfHeight;
        endX = target.x;
        endY = target.y + nodeHalfHeight;
      }
    } else {
      // Primarily horizontal - connect left/right
      if (dx > 0) {
        // Target is to the right
        startX = source.x + sourceHalfWidth;
        startY = source.y;
        endX = target.x - targetHalfWidth;
        endY = target.y;
      } else {
        // Target is to the left
        startX = source.x - sourceHalfWidth;
        startY = source.y;
        endX = target.x + targetHalfWidth;
        endY = target.y;
      }
    }

    // Create smooth bezier curve
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;

    let d;
    if (Math.abs(dy) > Math.abs(dx) * 0.5) {
      // Vertical connection - use vertical bezier
      d = \`M\${startX},\${startY} C\${startX},\${midY} \${endX},\${midY} \${endX},\${endY}\`;
    } else {
      // Horizontal connection - use horizontal bezier
      d = \`M\${startX},\${startY} C\${midX},\${startY} \${midX},\${endY} \${endX},\${endY}\`;
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
    const metrics = summaryData.componentMetrics?.[node.id];

    let html = \`
      <div class="sidebar-content">
        <div class="sidebar-section">
          <h3>\${comp.name}</h3>
          <div class="file-link">\${fileName}:\${comp.line}</div>
        </div>
    \`;

    // Show prop metrics if available
    if (metrics) {
      const roleLabels = {
        passthrough: 'Pass-through',
        consumer: 'Consumer',
        transformer: 'Transformer',
        mixed: 'Mixed'
      };
      const roleLabel = roleLabels[metrics.role] || metrics.role;

      html += \`
        <div class="sidebar-section">
          <h3>Prop Metrics</h3>
          <div class="detail-row">
            <span class="detail-label">Role</span>
            <span class="role-badge role-\${metrics.role}">\${roleLabel}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Total Props</span>
            <span class="detail-value">\${metrics.totalPropsReceived}</span>
          </div>
          <div class="metrics-bar">
            <div class="metrics-bar-consumed" style="width: \${metrics.consumptionRatio * 100}%"></div>
            <div class="metrics-bar-passed" style="width: \${metrics.passthroughRatio * 100}%"></div>
            <div class="metrics-bar-ignored" style="width: \${(metrics.propsIgnored / metrics.totalPropsReceived) * 100}%"></div>
          </div>
          <div class="detail-row">
            <span class="detail-label">Consumed</span>
            <span class="detail-value">\${metrics.propsConsumed} (\${Math.round(metrics.consumptionRatio * 100)}%)</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Passed</span>
            <span class="detail-value">\${metrics.propsPassed} (\${Math.round(metrics.passthroughRatio * 100)}%)</span>
          </div>
          \${metrics.propsIgnored > 0 ? \`
          <div class="detail-row">
            <span class="detail-label">Ignored</span>
            <span class="detail-value" style="color: #f85149">\${metrics.propsIgnored}</span>
          </div>
          \` : ''}
          \${metrics.propsTransformed > 0 ? \`
          <div class="detail-row">
            <span class="detail-label">Transformed</span>
            <span class="detail-value">\${metrics.propsTransformed}</span>
          </div>
          \` : ''}
        </div>
      \`;
    }

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
          \${comp.contextProviders.map(c => {
            const color = getContextColor(c.contextName);
            return \`<span class="tag" style="background: \${color.fill}; color: white;">\${c.contextName}</span>\`;
          }).join('')}
        </div>
      \`;
    }

    if (comp.contextConsumers.length > 0) {
      html += \`
        <div class="sidebar-section">
          <h3>Consumes Context</h3>
          \${comp.contextConsumers.map(c => {
            const color = getContextColor(c);
            return \`<span class="tag" style="background: \${color.fill}; color: white;">\${c}</span>\`;
          }).join('')}
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

    let passthroughBadge = '';
    const passthroughCount = summaryData.roleDistribution?.passthrough || 0;
    if (passthroughCount > 0) {
      passthroughBadge = \`<span class="passthrough-badge">\${passthroughCount} passthrough</span>\`;
    }

    let bundleBadge = '';
    const largeBundleCount = summaryData.bundleStats?.large || 0;
    if (largeBundleCount > 0) {
      bundleBadge = \`<span class="bundle-badge">\${largeBundleCount} bundles</span>\`;
    }

    let leakBadge = '';
    const leakCount = summaryData.contextLeakStats?.total || 0;
    if (leakCount > 0) {
      leakBadge = \`<span class="leak-badge">\${leakCount} leaks</span>\`;
    }

    let renameBadge = '';
    const renameCount = summaryData.propChainStats?.complex || 0;
    if (renameCount > 0) {
      renameBadge = \`<span class="rename-badge">\${renameCount} renames</span>\`;
    }

    statsEl.innerHTML = \`
      <span>\${summaryData.components.totalComponents} components</span>
      <span>\${summaryData.state.totalStateNodes} state</span>
      <span>\${summaryData.flow.totalEdges} edges</span>
      \${drillingBadge}
      \${passthroughBadge}
      \${bundleBadge}
      \${leakBadge}
      \${renameBadge}
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
      // Build dynamic legend showing each context with its color
      let contextLegendItems = '';
      contextColorMap.forEach((colorIndex, contextName) => {
        const color = CONTEXT_COLORS[colorIndex];
        // Shorten long context names for legend
        const shortName = contextName.replace(/Context$/i, '').replace(/Provider$/i, '');
        contextLegendItems += \`
          <div class="legend-item">
            <svg width="20" height="12">
              <rect x="0" y="1" width="10" height="10" rx="2" fill="none" stroke="\${color.fill}" stroke-width="2"/>
              <line x1="12" y1="6" x2="20" y2="6" stroke="\${color.fill}" stroke-width="2" stroke-dasharray="3,2"/>
            </svg>
            <span>\${shortName}</span>
          </div>
        \`;
      });

      // Fallback if no contexts found
      if (contextLegendItems === '') {
        contextLegendItems = \`
          <div class="legend-item">
            <svg width="20" height="12"><line x1="0" y1="6" x2="20" y2="6" stroke="#8957e5" stroke-width="2" stroke-dasharray="4,2"/></svg>
            <span>Context Flow</span>
          </div>
        \`;
      }

      legendEl.innerHTML = \`
        <div class="legend-item">
          <div class="legend-color" style="background: #238636"></div>
          <span>Component</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #1f6feb"></div>
          <span>Has State</span>
        </div>
        \${contextLegendItems}
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
