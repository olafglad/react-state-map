import type { SerializedStateFlowGraph } from '@react-state-map/core';

export function generateHTML(graph: SerializedStateFlowGraph): string {
  const graphJSON = JSON.stringify(graph);

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
      <h1>React State Map</h1>
      <nav class="tabs">
        <button class="tab active" data-view="flow">State Flow</button>
        <button class="tab" data-view="context">Context Boundaries</button>
        <button class="tab" data-view="drilling">Prop Drilling</button>
      </nav>
      <div class="stats" id="stats"></div>
    </header>
    <main class="main">
      <div class="canvas-container">
        <svg id="graph" width="100%" height="100%"></svg>
      </div>
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-content">
          <h3>Select a node</h3>
          <p>Click on a component or state node to see details</p>
        </div>
      </aside>
    </main>
    <div class="legend" id="legend"></div>
  </div>
  <script>
const graphData = ${graphJSON};
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
      gap: 24px;
      padding: 12px 24px;
      background: #161b22;
      border-bottom: 1px solid #30363d;
    }

    .header h1 {
      font-size: 18px;
      font-weight: 600;
      color: #58a6ff;
    }

    .tabs {
      display: flex;
      gap: 4px;
    }

    .tab {
      padding: 8px 16px;
      border: none;
      background: transparent;
      color: #8b949e;
      font-size: 14px;
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
      margin-left: auto;
      font-size: 13px;
      color: #8b949e;
    }

    .stats span {
      margin-left: 16px;
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
      width: 320px;
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
      margin-bottom: 12px;
      color: #f0f6fc;
    }

    .sidebar p {
      font-size: 13px;
      color: #8b949e;
      line-height: 1.5;
    }

    .sidebar-section {
      margin-bottom: 20px;
      padding-bottom: 20px;
      border-bottom: 1px solid #30363d;
    }

    .sidebar-section:last-child {
      border-bottom: none;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      font-size: 13px;
    }

    .detail-label {
      color: #8b949e;
    }

    .detail-value {
      color: #c9d1d9;
      text-align: right;
    }

    .tag {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      margin: 2px;
    }

    .tag-state { background: #1f6feb33; color: #58a6ff; }
    .tag-context { background: #8957e533; color: #bc8cff; }
    .tag-props { background: #3fb95033; color: #56d364; }

    .legend {
      display: flex;
      gap: 24px;
      padding: 12px 24px;
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

    /* Graph node styles */
    .node {
      cursor: pointer;
    }

    .node rect {
      transition: filter 0.15s, stroke 0.15s;
    }

    .node:hover rect {
      filter: brightness(1.2);
      stroke: white;
      stroke-width: 2;
    }

    .node-component {
      fill: #238636;
    }

    .node-component-state {
      fill: #1f6feb;
    }

    .node-state {
      fill: #8957e5;
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

    .edge-drilling {
      stroke: #f85149;
      stroke-width: 3;
    }

    .edge-arrow {
      fill: #3fb950;
    }

    .context-boundary {
      fill: #8957e520;
      stroke: #8957e5;
      stroke-width: 2;
      stroke-dasharray: 8, 4;
      rx: 12;
    }

    .drilling-path {
      stroke: #f85149;
      stroke-width: 4;
      opacity: 0.6;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #8b949e;
      text-align: center;
    }

    .empty-state h2 {
      font-size: 18px;
      margin-bottom: 8px;
      color: #c9d1d9;
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

  let currentView = 'flow';
  let transform = { x: 0, y: 0, scale: 1 };
  let isDragging = false;
  let dragStart = { x: 0, y: 0 };
  let nodes = [];
  let simulation = null;

  // Initialize
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

    svg.addEventListener('mousedown', handleMouseDown);
    svg.addEventListener('mousemove', handleMouseMove);
    svg.addEventListener('mouseup', handleMouseUp);
    svg.addEventListener('mouseleave', handleMouseUp);
    svg.addEventListener('wheel', handleWheel);
  }

  function handleMouseDown(e) {
    if (e.target === svg || e.target.tagName === 'g') {
      isDragging = true;
      dragStart = { x: e.clientX - transform.x, y: e.clientY - transform.y };
      svg.style.cursor = 'grabbing';
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

    // Create component nodes
    components.forEach((comp, i) => {
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

    // Use hierarchical layout
    layoutNodes();
  }

  function layoutNodes() {
    const width = svg.clientWidth || 800;
    const height = svg.clientHeight || 600;
    const nodeWidth = 120;
    const nodeHeight = 50;
    const horizontalGap = 60;
    const verticalGap = 80;

    // Build adjacency for hierarchy
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

    // Find root nodes (no parents or context providers)
    const roots = nodes.filter(n => {
      const p = parents.get(n.id) || [];
      return p.length === 0 || n.data.contextProviders.length > 0;
    });

    // If no clear roots, pick nodes with most outgoing edges
    if (roots.length === 0) {
      const sorted = [...nodes].sort((a, b) => {
        const aOut = (children.get(a.id) || []).length;
        const bOut = (children.get(b.id) || []).length;
        return bOut - aOut;
      });
      roots.push(sorted[0]);
    }

    // Assign levels using BFS
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

    // Assign levels to unvisited nodes
    nodes.forEach(node => {
      if (!levels.has(node.id)) {
        maxLevel++;
        levels.set(node.id, maxLevel);
      }
    });

    // Group nodes by level
    const levelGroups = new Map();
    nodes.forEach(node => {
      const level = levels.get(node.id) || 0;
      const group = levelGroups.get(level) || [];
      group.push(node);
      levelGroups.set(level, group);
    });

    // Position nodes
    const totalLevels = maxLevel + 1;
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

    // Run a few iterations to reduce edge crossings
    for (let iter = 0; iter < 50; iter++) {
      // Push overlapping nodes apart horizontally
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
            const py = (dy / dist) * push * 0.3; // Less vertical push
            a.x -= px;
            b.x += px;
            a.y -= py;
            b.y += py;
          }
        }
      }

      // Keep nodes on screen
      nodes.forEach(node => {
        node.x = Math.max(80, Math.min(width - 80, node.x));
        node.y = Math.max(60, Math.min(height - 60, node.y));
      });
    }

    transform.x = 0;
    transform.y = 0;
    transform.scale = 1;
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
        <h2>No components found</h2>
        <p>Make sure you're analyzing a React project with .tsx or .jsx files</p>
      </div>
    \`;
  }

  function renderFlowView(g) {
    // Draw edges
    graphData.edges.forEach(edge => {
      const source = nodes.find(n => n.id === edge.from);
      const target = nodes.find(n => n.id === edge.to);
      if (source && target) {
        drawEdge(g, source, target, edge);
      }
    });

    // Draw nodes
    nodes.forEach(node => {
      drawNode(g, node);
    });
  }

  function renderContextView(g) {
    // Draw context boundaries with increasing padding to avoid overlap
    const total = graphData.contextBoundaries.length;
    graphData.contextBoundaries.forEach((boundary, index) => {
      const provider = nodes.find(n => n.id === boundary.providerComponent);

      // Find all consumers - match by ID
      const consumers = boundary.childComponents
        .map(id => nodes.find(n => n.id === id))
        .filter(n => n !== undefined);

      // Debug: log if we can't find consumers
      if (boundary.childComponents.length !== consumers.length) {
        console.log('Context boundary mismatch:', boundary.contextName,
          'expected', boundary.childComponents.length,
          'found', consumers.length);
      }

      // Draw boundary if we have provider (even with no consumers found by ID)
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

    // Draw edges (only context)
    graphData.edges
      .filter(e => e.mechanism === 'context')
      .forEach(edge => {
        const source = nodes.find(n => n.id === edge.from);
        const target = nodes.find(n => n.id === edge.to);
        if (source && target) {
          drawEdge(g, source, target, edge);
        }
      });

    // Draw nodes
    nodes.forEach(node => {
      drawNode(g, node);
    });
  }

  function renderDrillingView(g) {
    if (graphData.propDrillingPaths.length === 0) {
      // Draw all nodes but show message
      nodes.forEach(node => drawNode(g, node));

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', svg.clientWidth / 2);
      text.setAttribute('y', 50);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('fill', '#3fb950');
      text.setAttribute('font-size', '16');
      text.textContent = '✓ No prop drilling detected';
      g.appendChild(text);
      return;
    }

    // Highlight drilling paths
    graphData.propDrillingPaths.forEach(path => {
      for (let i = 0; i < path.path.length - 1; i++) {
        const sourceName = path.path[i];
        const targetName = path.path[i + 1];
        const source = nodes.find(n => n.name === sourceName);
        const target = nodes.find(n => n.name === targetName);
        if (source && target) {
          drawDrillingEdge(g, source, target);
        }
      }
    });

    nodes.forEach(node => drawNode(g, node));
  }

  function drawNode(g, node) {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', 'node');
    group.setAttribute('transform', \`translate(\${node.x}, \${node.y})\`);

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    const width = Math.max(80, node.name.length * 8 + 20);
    const height = 36;
    rect.setAttribute('x', -width / 2);
    rect.setAttribute('y', -height / 2);
    rect.setAttribute('width', width);
    rect.setAttribute('height', height);
    rect.setAttribute('rx', 6);
    rect.setAttribute('class', node.hasState ? 'node-component-state' : 'node-component');

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
          <path d="M0,0 L0,6 L8,3 z" fill="#3fb950" />
        </marker>
        <marker id="arrow-purple" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#8957e5" />
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
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    const curvature = Math.min(30, Math.abs(dx) * 0.2);

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
    label.setAttribute('fill', '#bc8cff');
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
    labelBg.setAttribute('fill', '#0d1117');
    labelBg.setAttribute('rx', '3');

    g.insertBefore(label, g.firstChild);
    g.insertBefore(labelBg, g.firstChild);
    g.insertBefore(rect, g.firstChild);
  }

  function drawDrillingEdge(g, source, target) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', source.x);
    line.setAttribute('y1', source.y);
    line.setAttribute('x2', target.x);
    line.setAttribute('y2', target.y);
    line.setAttribute('class', 'drilling-path');
    g.insertBefore(line, g.firstChild);
  }

  function showNodeDetails(node) {
    const comp = node.data;
    const incoming = graphData.edges.filter(e => e.to === node.id);
    const outgoing = graphData.edges.filter(e => e.from === node.id);

    let html = \`
      <div class="sidebar-content">
        <div class="sidebar-section">
          <h3>\${comp.name}</h3>
          <div class="detail-row">
            <span class="detail-label">File</span>
            <span class="detail-value">\${comp.filePath.split('/').pop()}:\${comp.line}</span>
          </div>
        </div>
    \`;

    if (comp.stateProvided.length > 0) {
      html += \`
        <div class="sidebar-section">
          <h3>State Defined</h3>
          \${comp.stateProvided.map(s => \`<span class="tag tag-state">\${s.name} (\${s.type})</span>\`).join('')}
        </div>
      \`;
    }

    if (comp.contextProviders.length > 0) {
      html += \`
        <div class="sidebar-section">
          <h3>Context Providers</h3>
          \${comp.contextProviders.map(c => \`<span class="tag tag-context">\${c.contextName}</span>\`).join('')}
        </div>
      \`;
    }

    if (comp.contextConsumers.length > 0) {
      html += \`
        <div class="sidebar-section">
          <h3>Context Consumers</h3>
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

    if (incoming.length > 0) {
      html += \`
        <div class="sidebar-section">
          <h3>Incoming State</h3>
          \${incoming.map(e => {
            const from = graphData.components[e.from];
            return \`<div class="detail-row">
              <span class="detail-label">\${e.mechanism}\${e.propName ? ' (' + e.propName + ')' : ''}</span>
              <span class="detail-value">from \${from?.name || 'Unknown'}</span>
            </div>\`;
          }).join('')}
        </div>
      \`;
    }

    if (outgoing.length > 0) {
      html += \`
        <div class="sidebar-section">
          <h3>Outgoing State</h3>
          \${outgoing.map(e => {
            const to = graphData.components[e.to];
            return \`<div class="detail-row">
              <span class="detail-label">\${e.mechanism}\${e.propName ? ' (' + e.propName + ')' : ''}</span>
              <span class="detail-value">to \${to?.name || 'Unknown'}</span>
            </div>\`;
          }).join('')}
        </div>
      \`;
    }

    html += '</div>';
    sidebar.innerHTML = html;
  }

  function updateStats() {
    const componentCount = Object.keys(graphData.components).length;
    const stateCount = Object.keys(graphData.stateNodes).length;
    const edgeCount = graphData.edges.length;

    statsEl.innerHTML = \`
      <span>📦 \${componentCount} components</span>
      <span>🔗 \${stateCount} state nodes</span>
      <span>➡️ \${edgeCount} edges</span>
    \`;
  }

  function updateLegend() {
    legendEl.innerHTML = \`
      <div class="legend-item">
        <div class="legend-color" style="background: #238636"></div>
        <span>Component</span>
      </div>
      <div class="legend-item">
        <div class="legend-color" style="background: #1f6feb"></div>
        <span>Component with State</span>
      </div>
      <div class="legend-item">
        <div class="legend-color" style="background: #3fb950"></div>
        <span>Props Flow</span>
      </div>
      <div class="legend-item">
        <div class="legend-color" style="background: #8957e5"></div>
        <span>Context Flow</span>
      </div>
      <div class="legend-item">
        <div class="legend-color" style="background: #f85149"></div>
        <span>Prop Drilling</span>
      </div>
    \`;
  }
})();
  `;
}
