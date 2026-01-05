import type { SerializedStateFlowGraph, GraphSummary, ParseWarning } from '@react-state-map/core';

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

  let currentView = 'flow';
  let transform = { x: 0, y: 0, scale: 1 };
  let isDragging = false;
  let dragStart = { x: 0, y: 0 };
  let nodes = [];

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
        render();
      });
    });

    refreshBtn.addEventListener('click', () => {
      vscode.postMessage({ command: 'refresh' });
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
    transform.scale = Math.max(0.1, Math.min(3, transform.scale));
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

  function layoutNodes() {
    const width = svg.clientWidth || 800;
    const height = svg.clientHeight || 600;
    const nodeWidth = 120;
    const nodeHeight = 50;
    const horizontalGap = 60;
    const verticalGap = 80;

    const children = new Map();
    const parents = new Map();

    nodes.forEach(n => {
      children.set(n.id, []);
      parents.set(n.id, []);
    });

    graphData.edges.forEach(edge => {
      if (edge.mechanism === 'props') {
        const c = children.get(edge.from) || [];
        c.push(edge.to);
        children.set(edge.from, c);
        const p = parents.get(edge.to) || [];
        p.push(edge.from);
        parents.set(edge.to, p);
      }
    });

    const roots = nodes.filter(n => {
      const p = parents.get(n.id) || [];
      return p.length === 0 || n.data.contextProviders.length > 0;
    });

    if (roots.length === 0 && nodes.length > 0) {
      const sorted = [...nodes].sort((a, b) => {
        const aOut = (children.get(a.id) || []).length;
        const bOut = (children.get(b.id) || []).length;
        return bOut - aOut;
      });
      roots.push(sorted[0]);
    }

    const levels = new Map();
    const visited = new Set();
    let maxLevel = 0;

    roots.forEach(root => {
      if (!visited.has(root.id)) {
        const queue = [{ node: root, level: 0 }];
        while (queue.length > 0) {
          const { node, level } = queue.shift();
          if (visited.has(node.id)) continue;
          visited.add(node.id);
          levels.set(node.id, level);
          maxLevel = Math.max(maxLevel, level);
          const childIds = children.get(node.id) || [];
          childIds.forEach(childId => {
            const childNode = nodes.find(n => n.id === childId);
            if (childNode && !visited.has(childId)) {
              queue.push({ node: childNode, level: level + 1 });
            }
          });
        }
      }
    });

    nodes.forEach(node => {
      if (!levels.has(node.id)) {
        maxLevel++;
        levels.set(node.id, maxLevel);
      }
    });

    const levelGroups = new Map();
    nodes.forEach(node => {
      const level = levels.get(node.id) || 0;
      const group = levelGroups.get(level) || [];
      group.push(node);
      levelGroups.set(level, group);
    });

    const startY = 80;
    levelGroups.forEach((group, level) => {
      const y = startY + level * (nodeHeight + verticalGap);
      const totalWidth = group.length * nodeWidth + (group.length - 1) * horizontalGap;
      const startX = (width - totalWidth) / 2 + nodeWidth / 2;
      group.forEach((node, i) => {
        node.x = startX + i * (nodeWidth + horizontalGap);
        node.y = y;
      });
    });

    for (let iter = 0; iter < 50; iter++) {
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = nodeWidth + 20;
          if (dist < minDist && dist > 0) {
            const push = (minDist - dist) / 2;
            const px = (dx / dist) * push;
            const py = (dy / dist) * push * 0.3;
            a.x -= px;
            b.x += px;
            a.y -= py;
            b.y += py;
          }
        }
      }
      nodes.forEach(node => {
        node.x = Math.max(80, Math.min(width - 80, node.x));
        node.y = Math.max(60, Math.min(height - 60, node.y));
      });
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
    graphData.edges.forEach(edge => {
      const source = nodes.find(n => n.id === edge.from);
      const target = nodes.find(n => n.id === edge.to);
      if (source && target) {
        drawEdge(g, source, target, edge);
      }
    });

    nodes.forEach(node => drawNode(g, node));
  }

  function renderContextView(g) {
    const total = graphData.contextBoundaries.length;
    graphData.contextBoundaries.forEach((boundary, index) => {
      const provider = nodes.find(n => n.id === boundary.providerComponent);

      // Find all consumers - match by ID
      const consumers = boundary.childComponents
        .map(id => nodes.find(n => n.id === id))
        .filter(n => n !== undefined);

      // Draw boundary if we have provider
      if (provider) {
        // Include ALL nodes that consume this context by checking their data
        const contextConsumers = nodes.filter(n =>
          n.data.contextConsumers &&
          n.data.contextConsumers.includes(boundary.contextName)
        );

        const allConsumers = [...new Set([...consumers, ...contextConsumers])];

        if (allConsumers.length > 0) {
          drawContextBoundary(g, provider, allConsumers, boundary.contextName, index, total);
        }
      }
    });

    graphData.edges
      .filter(e => e.mechanism === 'context')
      .forEach(edge => {
        const source = nodes.find(n => n.id === edge.from);
        const target = nodes.find(n => n.id === edge.to);
        if (source && target) drawEdge(g, source, target, edge);
      });

    nodes.forEach(node => drawNode(g, node));
  }

  function renderDrillingView(g) {
    if (graphData.propDrillingPaths.length === 0) {
      nodes.forEach(node => drawNode(g, node));

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', svg.clientWidth / 2);
      text.setAttribute('y', 40);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('fill', 'var(--vscode-charts-green)');
      text.setAttribute('font-size', '14');
      text.textContent = '✓ No prop drilling detected';
      g.appendChild(text);
      return;
    }

    graphData.propDrillingPaths.forEach(path => {
      for (let i = 0; i < path.path.length - 1; i++) {
        const source = nodes.find(n => n.name === path.path[i]);
        const target = nodes.find(n => n.name === path.path[i + 1]);
        if (source && target) {
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', source.x);
          line.setAttribute('y1', source.y);
          line.setAttribute('x2', target.x);
          line.setAttribute('y2', target.y);
          line.setAttribute('class', 'edge edge-drilling');
          g.appendChild(line);
        }
      }
    });

    nodes.forEach(node => drawNode(g, node));
  }

  function drawNode(g, node) {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', 'node');
    group.setAttribute('transform', \`translate(\${node.x}, \${node.y})\`);

    const width = Math.max(80, node.name.length * 7 + 16);
    const height = 32;

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
    const nodeHeight = 18;

    // Calculate edge points from node edges, not centers
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
      startX = source.x + (dx > 0 ? 50 : -50);
      endX = target.x + (dx > 0 ? -50 : 50);
    }

    // Create smooth bezier curve
    const midY = (startY + endY) / 2;

    let d;
    if (Math.abs(dx) < 20) {
      // Nearly vertical - straight line
      d = \`M\${startX},\${startY} L\${endX},\${endY}\`;
    } else {
      // Curved path
      d = \`M\${startX},\${startY} C\${startX},\${midY} \${endX},\${midY} \${endX},\${endY}\`;
    }

    path.setAttribute('d', d);
    path.setAttribute('class', \`edge edge-\${edge.mechanism}\`);
    path.setAttribute('marker-end', edge.mechanism === 'context' ? 'url(#arrow-purple)' : 'url(#arrow-green)');

    g.insertBefore(path, g.firstChild);
  }

  function drawContextBoundary(g, provider, consumers, name, index, total) {
    const allNodes = [provider, ...consumers];
    const basePadding = 50;
    const offset = (total - 1 - index) * 30; // Outer contexts have more padding

    const minX = Math.min(...allNodes.map(n => n.x)) - basePadding - offset;
    const minY = Math.min(...allNodes.map(n => n.y)) - basePadding - offset;
    const maxX = Math.max(...allNodes.map(n => n.x)) + basePadding + offset;
    const maxY = Math.max(...allNodes.map(n => n.y)) + basePadding + offset;

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
        <div class="legend-color" style="background: var(--vscode-charts-purple)"></div>
        <span>Context</span>
      </div>
      <div class="legend-item">
        <div class="legend-color" style="background: var(--vscode-charts-red)"></div>
        <span>Drilling</span>
      </div>
    \`;
  }
})();
  `;
}
