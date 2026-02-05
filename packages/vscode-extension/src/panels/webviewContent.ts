import type { SerializedStateFlowGraph, GraphSummary, ParseWarning } from '@react-state-map/core';
// @ts-ignore - esbuild imports this as text
import elkBundleCode from './elk.bundle.js';
// @ts-ignore - esbuild imports this as text
import cytoscapeBundleCode from './cytoscape.bundle.js';

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
      <div class="header-center">
        <div class="search-container">
          <input type="text" class="search-input" id="searchInput" placeholder="Search components..." autocomplete="off">
          <div class="search-results" id="searchResults"></div>
        </div>
      </div>
      <div class="header-right">
        <div class="stats-container">
          <button class="stats-toggle" id="statsToggle" title="Toggle stats">
            <span class="stats-summary" id="statsSummary"></span>
            <span class="stats-arrow">▼</span>
          </button>
          <div class="stats-dropdown" id="statsDropdown">
            <div class="stats" id="stats"></div>
          </div>
        </div>
        <button class="path-btn" id="pathBtn" title="Find path">⤳</button>
        <button class="refresh-btn" id="fitBtn" title="Fit to View">⊡</button>
        <button class="refresh-btn" id="refreshBtn" title="Refresh">↻</button>
      </div>
    </header>
    <div class="path-mode-banner" id="pathModeBanner">
      <span class="path-mode-text">Click two components to find the path</span>
      <span class="path-mode-selection" id="pathSelection"></span>
      <button class="path-mode-cancel" id="pathCancel">Cancel</button>
    </div>
    <main class="main">
      <div class="canvas-wrapper">
        <div class="canvas-container" id="cy"></div>
        <div class="floating-panel" id="floatingPanel">
          <div class="floating-panel-header" id="panelHeader">
            <span>Layers</span>
            <button class="panel-collapse-btn" id="panelCollapseBtn">−</button>
          </div>
          <div class="floating-panel-content" id="panelContent">
            <label class="toggle-label" id="togglePropsLabel">
              <input type="checkbox" id="toggleProps" checked>
              <span class="toggle-indicator toggle-props"></span>
              Props
            </label>
            <label class="toggle-label" id="toggleHierarchyLabel">
              <input type="checkbox" id="toggleHierarchy" checked>
              <span class="toggle-indicator toggle-hierarchy"></span>
              Hierarchy
            </label>
            <label class="toggle-label" id="toggleContextLabel">
              <input type="checkbox" id="toggleContext" checked>
              <span class="toggle-indicator toggle-context"></span>
              Context
            </label>
            <label class="toggle-label" id="toggleDrillingLabel">
              <input type="checkbox" id="toggleDrilling" checked>
              <span class="toggle-indicator toggle-drilling"></span>
              Drilling
            </label>
          </div>
        </div>
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
  <script>${elkBundleCode}</script>
  <script>${cytoscapeBundleCode}</script>
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
      flex-wrap: wrap;
      gap: 8px;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .header-center {
      flex: 1;
      display: flex;
      justify-content: center;
      min-width: 150px;
      max-width: 300px;
      transition: max-width 0.2s ease;
    }

    .header-center.expanded {
      max-width: 500px;
    }

    .search-container {
      position: relative;
      width: 100%;
    }

    .search-input {
      width: 100%;
      padding: 6px 10px;
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      font-size: 12px;
      outline: none;
    }

    .search-input:focus {
      border-color: var(--vscode-focusBorder);
    }

    .search-input::placeholder {
      color: var(--vscode-input-placeholderForeground);
    }

    .search-results {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: var(--vscode-dropdown-background);
      border: 1px solid var(--vscode-dropdown-border);
      border-radius: 4px;
      margin-top: 4px;
      max-height: 250px;
      overflow-y: auto;
      z-index: 1000;
      display: none;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }

    .search-results.visible {
      display: block;
    }

    .search-result-item {
      padding: 8px 10px;
      cursor: pointer;
      border-bottom: 1px solid var(--vscode-dropdown-border);
    }

    .search-result-item:last-child {
      border-bottom: none;
    }

    .search-result-item:hover {
      background: var(--vscode-list-hoverBackground);
    }

    .search-result-item.selected {
      background: var(--vscode-list-activeSelectionBackground);
      color: var(--vscode-list-activeSelectionForeground);
    }

    .search-result-name {
      font-weight: 500;
      margin-bottom: 2px;
    }

    .search-result-path {
      font-size: 10px;
      color: var(--vscode-descriptionForeground);
    }

    .search-result-badge {
      display: inline-block;
      padding: 1px 5px;
      border-radius: 3px;
      font-size: 9px;
      margin-left: 6px;
    }

    .search-result-badge.stateful {
      background: var(--vscode-charts-blue);
      color: white;
    }

    .search-result-badge.provider {
      background: var(--vscode-charts-green);
      color: white;
    }

    .search-no-results {
      padding: 10px;
      text-align: center;
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
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

    .floating-panel {
      position: absolute;
      top: 12px;
      left: 12px;
      background: var(--vscode-sideBar-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 1000;
      min-width: 110px;
    }

    .floating-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 10px;
      background: var(--vscode-input-background);
      border-radius: 6px 6px 0 0;
      cursor: move;
      user-select: none;
      font-size: 10px;
      font-weight: 600;
      color: var(--vscode-descriptionForeground);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .panel-collapse-btn {
      background: none;
      border: none;
      color: var(--vscode-descriptionForeground);
      font-size: 14px;
      cursor: pointer;
      padding: 0 4px;
      line-height: 1;
    }

    .panel-collapse-btn:hover {
      color: var(--vscode-foreground);
    }

    .floating-panel-content {
      padding: 8px 10px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .floating-panel-content.collapsed {
      display: none;
    }

    .toggle-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      color: var(--vscode-foreground);
      cursor: pointer;
      user-select: none;
      padding: 2px 0;
    }

    .toggle-label:hover {
      color: var(--vscode-foreground);
    }

    .toggle-label input {
      display: none;
    }

    .toggle-indicator {
      width: 12px;
      height: 12px;
      border-radius: 3px;
      border: 2px solid currentColor;
      transition: all 0.15s;
    }

    .toggle-label input:checked + .toggle-indicator {
      background: currentColor;
    }

    .toggle-props { color: var(--vscode-charts-green); }
    .toggle-context { color: var(--vscode-charts-purple); }
    .toggle-hierarchy { color: var(--vscode-descriptionForeground); }
    .toggle-drilling { color: var(--vscode-charts-red); }

    .stats {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
    }

    .stats span {
      margin-left: 12px;
    }

    .stats-container {
      position: relative;
    }

    .stats-toggle {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border: none;
      background: var(--vscode-input-background);
      color: var(--vscode-descriptionForeground);
      font-size: 11px;
      cursor: pointer;
      border-radius: 4px;
      transition: all 0.2s;
    }

    .stats-toggle:hover {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-foreground);
    }

    .stats-arrow {
      font-size: 9px;
      transition: transform 0.2s;
    }

    .stats-container.open .stats-arrow {
      transform: rotate(180deg);
    }

    .stats-dropdown {
      display: none;
      position: absolute;
      top: 100%;
      right: 0;
      margin-top: 4px;
      padding: 10px 14px;
      background: var(--vscode-dropdown-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
      min-width: 180px;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }

    .stats-container.open .stats-dropdown {
      display: block;
    }

    .stats-dropdown .stats {
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    /* Top 3 stats in a bordered group */
    .stats-dropdown .stats > span:not([class*="badge"]) {
      display: block;
      padding: 8px 12px;
      background: transparent;
      border-left: 2px solid var(--vscode-panel-border);
      margin-left: 4px;
    }

    .stats-dropdown .stats > span:not([class*="badge"]):first-child {
      padding-top: 10px;
      border-top-left-radius: 2px;
    }

    .stats-dropdown .stats > span:not([class*="badge"]):nth-child(3) {
      padding-bottom: 10px;
      margin-bottom: 10px;
      border-bottom-left-radius: 2px;
    }

    /* Badge styles inside dropdown - keep original colors */
    .stats-dropdown .warning-badge,
    .stats-dropdown .passthrough-badge,
    .stats-dropdown .bundle-badge,
    .stats-dropdown .leak-badge,
    .stats-dropdown .rename-badge {
      display: block;
      margin: 2px 0;
      padding: 8px 12px;
      font-size: 11px;
      border-radius: 4px;
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

    .path-btn {
      padding: 4px 8px;
      border: none;
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      font-size: 14px;
      cursor: pointer;
      border-radius: 4px;
    }

    .path-btn:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }

    .path-btn.active {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }

    .path-mode-banner {
      display: none;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 8px 16px;
      background: var(--vscode-inputValidation-infoBackground);
      border-bottom: 1px solid var(--vscode-inputValidation-infoBorder);
      color: var(--vscode-inputValidation-infoForeground);
      font-size: 12px;
    }

    .path-mode-banner.visible {
      display: flex;
    }

    .path-mode-selection {
      font-weight: 600;
    }

    .path-mode-cancel {
      padding: 3px 8px;
      border: 1px solid var(--vscode-button-secondaryBackground);
      background: transparent;
      color: var(--vscode-foreground);
      font-size: 11px;
      cursor: pointer;
      border-radius: 3px;
    }

    .path-mode-cancel:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }

    .main {
      display: flex;
      flex: 1;
      overflow: hidden;
    }

    .canvas-wrapper {
      flex: 1;
      position: relative;
      overflow: hidden;
    }

    .canvas-container {
      width: 100%;
      height: 100%;
      background: var(--vscode-editor-background);
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

    .sidebar-actions {
      display: flex;
      gap: 6px;
      margin-top: 8px;
    }

    .sidebar-btn {
      padding: 4px 10px;
      border: none;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      font-size: 11px;
      cursor: pointer;
      border-radius: 4px;
    }

    .sidebar-btn:hover {
      background: var(--vscode-button-hoverBackground);
    }

    .sidebar-btn.secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }

    .sidebar-btn.secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground);
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

    .warning-badge {
      background: var(--vscode-inputValidation-warningBackground);
      color: var(--vscode-inputValidation-warningForeground);
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      margin-left: 8px;
    }

    .passthrough-badge {
      background: var(--vscode-charts-yellow);
      color: #000;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      margin-left: 8px;
    }

    .bundle-badge {
      background: var(--vscode-charts-orange, #f97316);
      color: white;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      margin-left: 8px;
    }

    .leak-badge {
      background: var(--vscode-charts-red, #da3633);
      color: white;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      margin-left: 8px;
    }

    .rename-badge {
      background: var(--vscode-descriptionForeground, #6e7681);
      color: var(--vscode-editor-background, white);
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      margin-left: 8px;
    }

    /* Role badges */
    .role-badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 10px;
      font-size: 10px;
      font-weight: 500;
      margin-left: 8px;
    }

    .role-consumer {
      background: var(--vscode-charts-green);
      color: white;
    }

    .role-passthrough {
      background: var(--vscode-charts-yellow);
      color: #000;
    }

    .role-transformer {
      background: var(--vscode-charts-blue);
      color: white;
    }

    .role-mixed {
      background: var(--vscode-charts-purple);
      color: white;
    }

    /* Metrics visualization */
    .metrics-section {
      margin-top: 12px;
    }

    .metrics-bar-container {
      display: flex;
      height: 8px;
      border-radius: 4px;
      overflow: hidden;
      background: var(--vscode-input-background);
      margin: 8px 0;
    }

    .metrics-bar-segment {
      height: 100%;
      transition: width 0.3s ease;
    }

    .metrics-bar-consumed {
      background: var(--vscode-charts-green);
    }

    .metrics-bar-passed {
      background: var(--vscode-charts-yellow);
    }

    .metrics-bar-transformed {
      background: var(--vscode-charts-blue);
    }

    .metrics-bar-ignored {
      background: var(--vscode-charts-red);
    }

    .metrics-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 8px;
      font-size: 10px;
    }

    .metrics-legend-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .metrics-legend-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
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
  `;
}

function getScript(): string {
  return `
(function() {
  const sidebar = document.getElementById('sidebar');
  const statsEl = document.getElementById('stats');
  const legendEl = document.getElementById('legend');
  const tabs = document.querySelectorAll('.tab');
  const refreshBtn = document.getElementById('refreshBtn');
  const fitBtn = document.getElementById('fitBtn');
  const toggleProps = document.getElementById('toggleProps');
  const toggleContext = document.getElementById('toggleContext');
  const toggleHierarchy = document.getElementById('toggleHierarchy');
  const toggleDrilling = document.getElementById('toggleDrilling');
  const togglePropsLabel = document.getElementById('togglePropsLabel');
  const toggleHierarchyLabel = document.getElementById('toggleHierarchyLabel');
  const toggleContextLabel = document.getElementById('toggleContextLabel');
  const toggleDrillingLabel = document.getElementById('toggleDrillingLabel');
  const statsToggle = document.getElementById('statsToggle');
  const statsContainer = document.querySelector('.stats-container');
  const statsSummary = document.getElementById('statsSummary');
  const headerCenter = document.querySelector('.header-center');
  const searchInput = document.getElementById('searchInput');
  const searchResults = document.getElementById('searchResults');
  const floatingPanel = document.getElementById('floatingPanel');
  const panelHeader = document.getElementById('panelHeader');
  const panelContent = document.getElementById('panelContent');
  const panelCollapseBtn = document.getElementById('panelCollapseBtn');

  let currentView = 'flow';
  let cy = null;
  let nodes = [];
  let collapsedNodes = new Set();
  let hoveredNodeId = null;
  let searchDebounceTimer = null;
  let selectedSearchIndex = -1;
  let currentSearchResults = [];

  // Path finding state
  let pathMode = false;
  let pathStart = null;
  let pathEnd = null;
  const pathBtn = document.getElementById('pathBtn');
  const pathModeBanner = document.getElementById('pathModeBanner');
  const pathSelection = document.getElementById('pathSelection');
  const pathCancel = document.getElementById('pathCancel');

  // Semantic zoom state
  const ZOOM_THRESHOLD_FAR = 0.4;
  const ZOOM_THRESHOLD_CLOSE = 0.8;
  let currentZoomLevel = 'close';
  let directories = new Map();
  let lastZoomUpdate = 0;

  // Edge visibility state
  let edgeVisibility = {
    props: true,
    context: true,
    hierarchy: true,
    drilling: true
  };

  // Context color palette
  const CONTEXT_COLORS = [
    { name: 'purple', fill: '#8957e5', light: '#bc8cff' },
    { name: 'teal', fill: '#39d353', light: '#56d364' },
    { name: 'orange', fill: '#d29922', light: '#e3b341' },
    { name: 'pink', fill: '#db61a2', light: '#f778ba' },
    { name: 'cyan', fill: '#33b3ae', light: '#79c0ff' },
    { name: 'red', fill: '#f85149', light: '#ff7b72' },
  ];
  let contextColorMap = new Map();

  // Assign colors to contexts
  function assignContextColors() {
    contextColorMap.clear();
    const contexts = new Set();
    graphData.contextBoundaries.forEach(b => contexts.add(b.contextName));
    graphData.edges.filter(e => e.mechanism === 'context').forEach(e => {
      if (e.propName) contexts.add(e.propName);
    });
    Object.values(graphData.components).forEach(comp => {
      if (comp.contextProviders) {
        comp.contextProviders.forEach(p => contexts.add(p.contextName));
      }
      if (comp.contextConsumers) {
        comp.contextConsumers.forEach(c => contexts.add(c));
      }
    });
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
    return CONTEXT_COLORS[0];
  }

  // Initialize
  init();

  async function init() {
    processGraph();
    assignContextColors();
    setupEventListeners();
    setupFloatingPanel();
    updateStats();
    updateLegend();
    updateLayerToggles();
    await initCytoscape();
  }

  function setupFloatingPanel() {
    let isDragging = false;
    let startX, startY, initialX, initialY;

    panelCollapseBtn.addEventListener('click', () => {
      panelContent.classList.toggle('collapsed');
      panelCollapseBtn.textContent = panelContent.classList.contains('collapsed') ? '+' : '−';
    });

    panelHeader.addEventListener('mousedown', (e) => {
      if (e.target === panelCollapseBtn) return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = floatingPanel.getBoundingClientRect();
      initialX = rect.left;
      initialY = rect.top;
      floatingPanel.style.transition = 'none';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      e.preventDefault();
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      floatingPanel.style.left = (initialX + dx) + 'px';
      floatingPanel.style.top = (initialY + dy) + 'px';
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
      floatingPanel.style.transition = '';
    });
  }

  function updateLayerToggles() {
    // Show/hide toggles based on current view
    if (currentView === 'flow') {
      togglePropsLabel.style.display = 'flex';
      toggleHierarchyLabel.style.display = 'none';
      toggleContextLabel.style.display = 'flex';
      toggleDrillingLabel.style.display = 'none';
      floatingPanel.style.display = 'block';
    } else if (currentView === 'context') {
      togglePropsLabel.style.display = 'none';
      toggleHierarchyLabel.style.display = 'flex';
      toggleContextLabel.style.display = 'flex';
      toggleDrillingLabel.style.display = 'none';
      floatingPanel.style.display = 'block';
    } else if (currentView === 'drilling') {
      // Hide the panel in drilling view - it's a focused view
      floatingPanel.style.display = 'none';
    }
  }

  function setupEventListeners() {
    tabs.forEach(tab => {
      tab.addEventListener('click', async () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentView = tab.dataset.view;
        updateLegend();
        updateLayerToggles();
        await initCytoscape();
      });
    });

    refreshBtn.addEventListener('click', () => {
      vscode.postMessage({ command: 'refresh' });
    });

    fitBtn.addEventListener('click', () => {
      if (cy) cy.fit(50);
    });

    // Stats toggle
    if (statsToggle && statsContainer) {
      statsToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        statsContainer.classList.toggle('open');
      });

      // Close stats dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!statsContainer.contains(e.target)) {
          statsContainer.classList.remove('open');
        }
      });
    }

    // Search input expansion on focus
    if (searchInput && headerCenter) {
      searchInput.addEventListener('focus', () => {
        headerCenter.classList.add('expanded');
      });

      searchInput.addEventListener('blur', () => {
        // Delay to allow click on results
        setTimeout(() => {
          if (!searchInput.value) {
            headerCenter.classList.remove('expanded');
          }
        }, 200);
      });
    }

    // Edge toggle listeners
    toggleProps.addEventListener('change', () => {
      edgeVisibility.props = toggleProps.checked;
      updateEdgeVisibility();
    });
    toggleContext.addEventListener('change', () => {
      edgeVisibility.context = toggleContext.checked;
      updateEdgeVisibility();
    });
    toggleHierarchy.addEventListener('change', () => {
      edgeVisibility.hierarchy = toggleHierarchy.checked;
      updateEdgeVisibility();
    });
    toggleDrilling.addEventListener('change', () => {
      edgeVisibility.drilling = toggleDrilling.checked;
      updateEdgeVisibility();
    });

    // Search input listeners
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        performSearch(e.target.value);
      }, 100);
    });

    searchInput.addEventListener('focus', () => {
      if (searchInput.value.trim()) {
        performSearch(searchInput.value);
      }
    });

    searchInput.addEventListener('keydown', (e) => {
      if (!searchResults.classList.contains('visible')) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedSearchIndex = Math.min(selectedSearchIndex + 1, currentSearchResults.length - 1);
        updateSearchSelection();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedSearchIndex = Math.max(selectedSearchIndex - 1, 0);
        updateSearchSelection();
      } else if (e.key === 'Enter' && selectedSearchIndex >= 0) {
        e.preventDefault();
        selectSearchResult(currentSearchResults[selectedSearchIndex]);
      } else if (e.key === 'Escape') {
        hideSearchResults();
        searchInput.blur();
      }
    });

    // Close search results when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-container')) {
        hideSearchResults();
      }
    });

    // Path finding
    pathBtn.addEventListener('click', () => {
      togglePathMode();
    });

    pathCancel.addEventListener('click', () => {
      exitPathMode();
    });
  }

  // Path finding functions
  function togglePathMode() {
    if (pathMode) {
      exitPathMode();
    } else {
      enterPathMode();
    }
  }

  function enterPathMode() {
    pathMode = true;
    pathStart = null;
    pathEnd = null;
    pathBtn.classList.add('active');
    pathModeBanner.classList.add('visible');
    pathSelection.textContent = '';

    // Clear any existing path highlight
    if (cy) {
      cy.elements().removeClass('path-highlight path-start path-end');
    }
  }

  function exitPathMode() {
    pathMode = false;
    pathStart = null;
    pathEnd = null;
    pathBtn.classList.remove('active');
    pathModeBanner.classList.remove('visible');

    // Clear path highlight
    if (cy) {
      cy.elements().removeClass('path-highlight path-start path-end');
    }
  }

  function handlePathModeClick(nodeData) {
    const nodeId = nodeData.id || nodeData.componentData?.id;
    const nodeName = nodeData.label || nodeData.name;

    if (!pathStart) {
      pathStart = nodeId;
      pathSelection.textContent = nodeName + ' → ?';
      if (cy) {
        cy.getElementById(nodeId).addClass('path-start');
      }
    } else if (!pathEnd && nodeId !== pathStart) {
      pathEnd = nodeId;
      const startNode = nodes.find(n => n.id === pathStart);
      pathSelection.textContent = (startNode?.name || pathStart) + ' → ' + nodeName;
      if (cy) {
        cy.getElementById(nodeId).addClass('path-end');
      }
      // Find and highlight the path
      findAndHighlightPath();
    }
  }

  function findAndHighlightPath() {
    if (!cy || !pathStart || !pathEnd) return;

    // Build adjacency list from edges
    const adjacency = new Map();
    cy.edges().forEach(edge => {
      const source = edge.data('source');
      const target = edge.data('target');
      if (!adjacency.has(source)) adjacency.set(source, []);
      if (!adjacency.has(target)) adjacency.set(target, []);
      adjacency.get(source).push({ node: target, edge: edge.id() });
      adjacency.get(target).push({ node: source, edge: edge.id() }); // Treat as undirected
    });

    // BFS to find shortest path
    const queue = [{ node: pathStart, path: [pathStart], edges: [] }];
    const visited = new Set([pathStart]);

    while (queue.length > 0) {
      const { node, path, edges } = queue.shift();

      if (node === pathEnd) {
        // Found the path!
        highlightPath(path, edges);
        return;
      }

      const neighbors = adjacency.get(node) || [];
      for (const { node: neighbor, edge } of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push({
            node: neighbor,
            path: [...path, neighbor],
            edges: [...edges, edge]
          });
        }
      }
    }

    // No path found
    pathSelection.textContent += ' (no path found)';
  }

  function highlightPath(nodePath, edgePath) {
    if (!cy) return;

    // Highlight nodes in path
    nodePath.forEach(nodeId => {
      const node = cy.getElementById(nodeId);
      if (node.length > 0) {
        node.addClass('path-highlight');
      }
    });

    // Highlight edges in path
    edgePath.forEach(edgeId => {
      const edge = cy.getElementById(edgeId);
      if (edge.length > 0) {
        edge.addClass('path-highlight');
      }
    });

    // Fit view to show the path
    const pathElements = cy.elements('.path-highlight');
    if (pathElements.length > 0) {
      cy.animate({
        fit: { eles: pathElements, padding: 50 }
      }, {
        duration: 300,
        easing: 'ease-out'
      });
    }

    pathSelection.textContent += ' (' + (nodePath.length - 1) + ' hops)';
  }

  // Focus functions - expose globally for onclick handlers
  let focusedNodeId = null;

  window.focusOnNode = function(nodeId) {
    if (!cy) return;

    focusedNodeId = nodeId;
    const node = cy.getElementById(nodeId);
    if (node.length === 0) return;

    // Get all connected nodes (1-hop neighbors)
    const connectedEdges = cy.edges().filter(edge =>
      edge.data('source') === nodeId || edge.data('target') === nodeId
    );
    const connectedNodes = new Set([nodeId]);
    connectedEdges.forEach(edge => {
      connectedNodes.add(edge.data('source'));
      connectedNodes.add(edge.data('target'));
    });

    // Add focus class to connected elements, dim others
    cy.nodes().forEach(n => {
      if (connectedNodes.has(n.id())) {
        n.addClass('focused');
        n.removeClass('dimmed');
      } else {
        n.removeClass('focused');
        n.addClass('dimmed');
      }
    });

    cy.edges().forEach(e => {
      if (connectedNodes.has(e.data('source')) && connectedNodes.has(e.data('target'))) {
        e.addClass('focused');
        e.removeClass('dimmed');
      } else {
        e.removeClass('focused');
        e.addClass('dimmed');
      }
    });

    // Fit to focused elements
    const focusedElements = cy.elements('.focused');
    if (focusedElements.length > 0) {
      cy.animate({
        fit: { eles: focusedElements, padding: 50 }
      }, {
        duration: 300,
        easing: 'ease-out'
      });
    }

    // Refresh sidebar to show clear button
    showNodeDetails(node.data());
  };

  window.clearFocus = function() {
    focusedNodeId = null;
    if (cy) {
      cy.elements().removeClass('focused dimmed');
    }
  };

  // Search functions
  function performSearch(query) {
    query = query.trim().toLowerCase();
    if (!query) {
      hideSearchResults();
      return;
    }

    // Search through all components
    currentSearchResults = nodes
      .filter(node => node.type === 'component')
      .map(node => {
        const name = node.name.toLowerCase();
        const path = (node.data.filePath || '').toLowerCase();
        const props = (node.data.propsReceived || []).join(' ').toLowerCase();

        // Calculate match score
        let score = 0;
        if (name === query) score = 100;
        else if (name.startsWith(query)) score = 80;
        else if (name.includes(query)) score = 60;
        else if (path.includes(query)) score = 40;
        else if (props.includes(query)) score = 20;
        else return null;

        return { ...node, score };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    selectedSearchIndex = currentSearchResults.length > 0 ? 0 : -1;
    renderSearchResults();
  }

  function renderSearchResults() {
    if (currentSearchResults.length === 0) {
      searchResults.innerHTML = '<div class="search-no-results">No components found</div>';
    } else {
      searchResults.innerHTML = currentSearchResults.map((result, index) => {
        const hasState = result.hasState;
        const isProvider = result.data.contextProviders && result.data.contextProviders.length > 0;
        let badges = '';
        if (hasState) badges += '<span class="search-result-badge stateful">stateful</span>';
        if (isProvider) badges += '<span class="search-result-badge provider">provider</span>';

        return \`
          <div class="search-result-item\${index === selectedSearchIndex ? ' selected' : ''}" data-index="\${index}">
            <div class="search-result-name">\${result.name}\${badges}</div>
            <div class="search-result-path">\${result.data.filePath || ''}</div>
          </div>
        \`;
      }).join('');

      // Add click handlers
      searchResults.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
          const index = parseInt(item.dataset.index);
          selectSearchResult(currentSearchResults[index]);
        });
      });
    }
    searchResults.classList.add('visible');
  }

  function updateSearchSelection() {
    searchResults.querySelectorAll('.search-result-item').forEach((item, index) => {
      item.classList.toggle('selected', index === selectedSearchIndex);
    });
  }

  function hideSearchResults() {
    searchResults.classList.remove('visible');
    selectedSearchIndex = -1;
  }

  function selectSearchResult(result) {
    hideSearchResults();
    searchInput.value = result.name;
    searchInput.blur();

    // Find and focus on the node in Cytoscape
    if (cy) {
      const node = cy.getElementById(result.id);
      if (node.length > 0) {
        // Make sure we're at a zoom level that shows components
        if (currentZoomLevel === 'far') {
          currentZoomLevel = 'close';
          applySemanticZoom();
        }

        // Center on the node with animation
        cy.animate({
          center: { eles: node },
          zoom: Math.max(cy.zoom(), 1)
        }, {
          duration: 300,
          easing: 'ease-out',
          complete: () => {
            // Highlight the node
            node.addClass('search-highlight');
            setTimeout(() => node.removeClass('search-highlight'), 2000);

            // Show node details
            showNodeDetails(node.data());
          }
        });
      }
    }
  }

  function updateEdgeVisibility() {
    if (!cy) return;
    cy.edges().forEach(edge => {
      const type = edge.data('edgeType');
      let visible = true;
      if (type === 'props' && !edgeVisibility.props) visible = false;
      if (type === 'context' && !edgeVisibility.context) visible = false;
      if (type === 'hierarchy' && !edgeVisibility.hierarchy) visible = false;
      if (type === 'drilling' && !edgeVisibility.drilling) visible = false;

      if (visible) {
        edge.removeClass('hidden');
      } else {
        edge.addClass('hidden');
      }
    });
  }

  function processGraph() {
    nodes = [];
    directories.clear();
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

      // Group by directory for semantic zoom
      const dirPath = getDirectoryPath(comp.filePath);
      if (!directories.has(dirPath)) {
        directories.set(dirPath, {
          path: dirPath,
          name: dirPath.split('/').pop() || dirPath,
          components: [],
          componentIds: new Set(),
          statefulCount: 0,
          totalProps: 0,
          hasProvider: false
        });
      }
      const dir = directories.get(dirPath);
      dir.components.push(comp);
      dir.componentIds.add(comp.id);
      if (hasState) dir.statefulCount++;
      if (comp.props) dir.totalProps += comp.props.length;
      if (comp.contextProviders && comp.contextProviders.length > 0) dir.hasProvider = true;
    });

    // Compute inter-directory edges
    directories.forEach((dir, dirPath) => {
      dir.incomingDirs = new Map();
      dir.outgoingDirs = new Map();
    });

    graphData.edges.forEach(edge => {
      const fromComp = graphData.components[edge.from];
      const toComp = graphData.components[edge.to];
      if (!fromComp || !toComp) return;

      const fromDir = getDirectoryPath(fromComp.filePath);
      const toDir = getDirectoryPath(toComp.filePath);

      if (fromDir !== toDir) {
        const fromDirData = directories.get(fromDir);
        const toDirData = directories.get(toDir);
        if (fromDirData && toDirData) {
          fromDirData.outgoingDirs.set(toDir, (fromDirData.outgoingDirs.get(toDir) || 0) + 1);
          toDirData.incomingDirs.set(fromDir, (toDirData.incomingDirs.get(fromDir) || 0) + 1);
        }
      }
    });
  }

  function getDirectoryPath(filePath) {
    const parts = filePath.split('/');
    parts.pop();
    return parts.slice(-2).join('/') || 'root';
  }

  function getNodeWidth(node) {
    return Math.max(100, node.name.length * 8 + 24);
  }

  // Get descendants for collapse
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

  // Get visible nodes
  function getVisibleNodes() {
    const hidden = new Set();
    collapsedNodes.forEach(nodeId => {
      getDescendants(nodeId).forEach(id => hidden.add(id));
    });
    return nodes.filter(n => !hidden.has(n.id));
  }

  // ELK layout
  async function layoutWithElk(elkNodes, elkEdges) {
    if (typeof ELK === 'undefined') {
      // Fallback to grid layout
      return elkNodes.map((n, i) => ({
        ...n,
        x: (i % 10) * 150 + 100,
        y: Math.floor(i / 10) * 80 + 100
      }));
    }

    const elk = new ELK.default();
    const elkGraph = {
      id: 'root',
      layoutOptions: {
        'elk.algorithm': 'layered',
        'elk.direction': 'DOWN',
        'elk.layered.spacing.nodeNodeBetweenLayers': '100',
        'elk.spacing.nodeNode': '60',
        'elk.padding': '[left=40, top=40, right=40, bottom=40]',
        'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
        'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      },
      children: elkNodes.map(n => ({
        id: n.id,
        width: n.width,
        height: n.height,
      })),
      edges: elkEdges.map((e, i) => ({
        id: 'e' + i,
        sources: [e.source],
        targets: [e.target],
      })),
    };

    try {
      const result = await elk.layout(elkGraph);
      const positions = {};
      if (result.children) {
        result.children.forEach(child => {
          positions[child.id] = {
            x: (child.x || 0) + (child.width || 0) / 2,
            y: (child.y || 0) + (child.height || 0) / 2
          };
        });
      }
      return elkNodes.map(n => ({
        ...n,
        x: positions[n.id]?.x || n.x,
        y: positions[n.id]?.y || n.y
      }));
    } catch (err) {
      console.error('ELK layout error:', err);
      return elkNodes;
    }
  }

  // Initialize Cytoscape
  async function initCytoscape() {
    const container = document.getElementById('cy');

    if (nodes.length === 0) {
      container.innerHTML = '<div class="empty-state"><h2>No React components found</h2><p>Make sure your workspace contains .tsx or .jsx files with React components</p></div>';
      return;
    }

    // Build elements based on current view
    const elements = await buildElements();

    // Create or update Cytoscape instance
    if (cy) {
      cy.destroy();
    }

    cy = cytoscape({
      container: container,
      elements: elements,
      style: getCytoscapeStyles(),
      layout: { name: 'preset' },
      minZoom: 0.02,
      maxZoom: 3,
      wheelSensitivity: 0.3,
      // Performance options for large graphs
      hideEdgesOnViewport: nodes.length > 100,
      textureOnViewport: nodes.length > 200,
      pixelRatio: 'auto',
    });

    // Set up interactions
    setupCytoscapeInteractions();

    // Set up semantic zoom
    setupSemanticZoom();

    // Fit to view
    cy.fit(50);
  }

  function setupSemanticZoom() {
    if (!cy) return;

    cy.on('zoom', function() {
      const now = Date.now();
      if (now - lastZoomUpdate < 100) return;
      lastZoomUpdate = now;

      const zoom = cy.zoom();
      let newLevel = 'close';
      if (zoom < ZOOM_THRESHOLD_FAR) {
        newLevel = 'far';
      } else if (zoom < ZOOM_THRESHOLD_CLOSE) {
        newLevel = 'medium';
      }

      if (newLevel !== currentZoomLevel) {
        currentZoomLevel = newLevel;
        applySemanticZoom();
      }
    });
  }

  function applySemanticZoom() {
    if (!cy || currentView === 'drilling') return;

    const componentNodes = cy.nodes('[nodeType="component"], [nodeType="stateful"], [nodeType="provider"]');
    const directoryNodes = cy.nodes('[nodeType="directory"]');
    const componentEdges = cy.edges('[edgeType="props"], [edgeType="context"], [edgeType="hierarchy"]');
    const directoryEdges = cy.edges('[edgeType="directory"]');

    // Apply classes based on zoom level with smooth transitions
    if (currentZoomLevel === 'far') {
      // Far: Show only directories
      componentNodes.addClass('zoom-hidden').removeClass('zoom-medium');
      directoryNodes.removeClass('zoom-hidden');
      componentEdges.addClass('zoom-hidden');
      directoryEdges.removeClass('zoom-hidden');
    } else if (currentZoomLevel === 'medium') {
      // Medium: Show components with reduced detail
      componentNodes.removeClass('zoom-hidden').addClass('zoom-medium');
      directoryNodes.addClass('zoom-hidden');
      componentEdges.removeClass('zoom-hidden');
      directoryEdges.addClass('zoom-hidden');
    } else {
      // Close: Full detail
      componentNodes.removeClass('zoom-hidden').removeClass('zoom-medium');
      directoryNodes.addClass('zoom-hidden');
      componentEdges.removeClass('zoom-hidden');
      directoryEdges.addClass('zoom-hidden');
    }

    // Update zoom indicator
    updateEdgeVisibility();
  }

  async function buildElements() {
    const visibleNodes = getVisibleNodes();
    const elements = [];

    // Prepare nodes for ELK layout
    const elkNodes = visibleNodes.map(node => ({
      id: node.id,
      width: getNodeWidth(node),
      height: 40,
      name: node.name,
      hasState: node.hasState,
      data: node.data
    }));

    // Prepare directory nodes for semantic zoom
    // Make them larger so they're visible when zoomed out
    const dirNodes = [];
    directories.forEach((dir, dirPath) => {
      dirNodes.push({
        id: 'dir_' + dirPath.replace(/[^a-zA-Z0-9]/g, '_'),
        width: Math.max(600, dir.name.length * 30 + 300),
        height: 250,
        name: dir.name,
        dirPath: dirPath,
        data: dir
      });
    });

    // Get edges for layout
    const layoutEdges = graphData.edges
      .filter(e => e.mechanism === 'props' || e.mechanism === 'context')
      .filter(e => visibleNodes.some(n => n.id === e.from) && visibleNodes.some(n => n.id === e.to))
      .map(e => ({ source: e.from, target: e.to }));

    // Get directory edges
    const dirEdges = [];
    const dirEdgeSet = new Set();
    directories.forEach((dir, dirPath) => {
      dir.outgoingDirs.forEach((count, targetDir) => {
        const edgeKey = dirPath + '->' + targetDir;
        if (!dirEdgeSet.has(edgeKey)) {
          dirEdgeSet.add(edgeKey);
          dirEdges.push({
            source: 'dir_' + dirPath.replace(/[^a-zA-Z0-9]/g, '_'),
            target: 'dir_' + targetDir.replace(/[^a-zA-Z0-9]/g, '_'),
            weight: count
          });
        }
      });
    });

    // Run ELK layout for components
    const positionedNodes = await layoutWithElk(elkNodes, layoutEdges);

    // Run ELK layout for directories
    const positionedDirNodes = await layoutWithElk(dirNodes, dirEdges);

    // Create Cytoscape node elements for components
    positionedNodes.forEach(node => {
      const hasChildren = graphData.edges.some(e => e.from === node.id && e.mechanism === 'props');
      const isCollapsed = collapsedNodes.has(node.id);
      const descendantCount = isCollapsed ? getDescendants(node.id).size : 0;

      // Determine node type/color
      let nodeType = 'component';
      if (node.hasState) nodeType = 'stateful';
      if (node.data.contextProviders && node.data.contextProviders.length > 0) {
        nodeType = 'provider';
      }

      elements.push({
        group: 'nodes',
        data: {
          id: node.id,
          label: node.name + (isCollapsed && descendantCount > 0 ? ' (+' + descendantCount + ')' : ''),
          nodeType: nodeType,
          hasChildren: hasChildren,
          isCollapsed: isCollapsed,
          componentData: node.data,
          width: node.width,
          height: 40
        },
        position: { x: node.x, y: node.y }
      });
    });

    // Create directory nodes for semantic zoom
    positionedDirNodes.forEach(dirNode => {
      const dir = dirNode.data;
      const label = dir.name + ' (' + dir.components.length + ')';

      elements.push({
        group: 'nodes',
        data: {
          id: dirNode.id,
          label: label,
          nodeType: 'directory',
          dirPath: dirNode.dirPath,
          componentCount: dir.components.length,
          statefulCount: dir.statefulCount,
          hasProvider: dir.hasProvider,
          width: dirNode.width,
          height: 250
        },
        position: { x: dirNode.x, y: dirNode.y },
        classes: currentZoomLevel !== 'far' ? 'zoom-hidden' : ''
      });
    });

    // Create directory edges
    dirEdges.forEach((edge, i) => {
      elements.push({
        group: 'edges',
        data: {
          id: 'dir_e_' + i,
          source: edge.source,
          target: edge.target,
          edgeType: 'directory',
          weight: edge.weight
        },
        classes: currentZoomLevel !== 'far' ? 'zoom-hidden' : ''
      });
    });

    // Create edge elements based on view
    if (currentView === 'flow') {
      graphData.edges.forEach((edge, i) => {
        if (!visibleNodes.some(n => n.id === edge.from) || !visibleNodes.some(n => n.id === edge.to)) return;

        elements.push({
          group: 'edges',
          data: {
            id: 'e' + i,
            source: edge.from,
            target: edge.to,
            edgeType: edge.mechanism,
            propName: edge.propName
          }
        });
      });
    } else if (currentView === 'context') {
      // Show hierarchy edges (subtle) and context edges (prominent)
      graphData.edges.forEach((edge, i) => {
        if (!visibleNodes.some(n => n.id === edge.from) || !visibleNodes.some(n => n.id === edge.to)) return;

        if (edge.mechanism === 'props') {
          elements.push({
            group: 'edges',
            data: {
              id: 'eh' + i,
              source: edge.from,
              target: edge.to,
              edgeType: 'hierarchy',
              propName: edge.propName
            }
          });
        } else if (edge.mechanism === 'context') {
          elements.push({
            group: 'edges',
            data: {
              id: 'ec' + i,
              source: edge.from,
              target: edge.to,
              edgeType: 'context',
              propName: edge.propName
            }
          });
        }
      });
    } else if (currentView === 'drilling') {
      // Show drilling paths
      if (graphData.propDrillingPaths.length === 0) {
        // No drilling paths - just show nodes
      } else {
        // Layout drilling paths
        const VERTICAL_GAP = 70;
        const HORIZONTAL_GAP = 250;
        const START_X = 150;
        const START_Y = 80;

        // Clear and rebuild elements for drilling view
        elements.length = 0;

        graphData.propDrillingPaths.forEach((drillingPath, pathIndex) => {
          const chainX = START_X + pathIndex * HORIZONTAL_GAP;

          drillingPath.path.forEach((componentName, index) => {
            const originalNode = nodes.find(n => n.name === componentName);
            if (!originalNode) return;

            const nodeId = 'drill_' + pathIndex + '_' + index;
            let nodeType = 'passthrough';
            if (index === 0) nodeType = 'origin';
            else if (index === drillingPath.path.length - 1) nodeType = 'consumer';

            elements.push({
              group: 'nodes',
              data: {
                id: nodeId,
                label: componentName,
                nodeType: nodeType,
                componentData: originalNode.data,
                width: getNodeWidth(originalNode),
                height: 40,
                pathIndex: pathIndex,
                stateName: drillingPath.stateName,
                hops: drillingPath.hops
              },
              position: { x: chainX, y: START_Y + index * VERTICAL_GAP }
            });

            // Add edge to next node in chain
            if (index < drillingPath.path.length - 1) {
              elements.push({
                group: 'edges',
                data: {
                  id: 'drill_e_' + pathIndex + '_' + index,
                  source: nodeId,
                  target: 'drill_' + pathIndex + '_' + (index + 1),
                  edgeType: 'drilling'
                }
              });
            }
          });
        });
      }
    }

    return elements;
  }

  function getCytoscapeStyles() {
    return [
      // Node base styles (stateless components - gray)
      {
        selector: 'node',
        style: {
          'shape': 'roundrectangle',
          'width': 'data(width)',
          'height': 'data(height)',
          'label': 'data(label)',
          'text-valign': 'center',
          'text-halign': 'center',
          'font-size': '11px',
          'font-family': 'var(--vscode-font-family)',
          'color': '#ffffff',
          'text-wrap': 'none',
          'background-color': '#0d9488',
          'border-width': 0,
          'text-max-width': '150px',
          'text-overflow-wrap': 'ellipsis',
        }
      },
      // Stateful nodes (blue)
      {
        selector: 'node[nodeType="stateful"]',
        style: {
          'background-color': '#1f6feb'
        }
      },
      // Provider nodes (purple border)
      {
        selector: 'node[nodeType="provider"]',
        style: {
          'background-color': '#1f6feb',
          'border-width': 3,
          'border-color': '#8957e5'
        }
      },
      // Drilling view - origin (blue)
      {
        selector: 'node[nodeType="origin"]',
        style: {
          'background-color': '#1f6feb'
        }
      },
      // Drilling view - passthrough (yellow)
      {
        selector: 'node[nodeType="passthrough"]',
        style: {
          'background-color': '#d29922',
          'color': '#0d1117'
        }
      },
      // Drilling view - consumer (green)
      {
        selector: 'node[nodeType="consumer"]',
        style: {
          'background-color': '#238636'
        }
      },
      // Selected node
      {
        selector: 'node:selected',
        style: {
          'border-width': 3,
          'border-color': '#58a6ff'
        }
      },
      // Hovered node
      {
        selector: 'node.hover',
        style: {
          'border-width': 2,
          'border-color': '#ffffff'
        }
      },
      // Edge base styles - dimmed by default
      {
        selector: 'edge',
        style: {
          'width': 2,
          'line-color': '#3fb950',
          'target-arrow-color': '#3fb950',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          'opacity': 0.2,
          'arrow-scale': 0.8
        }
      },
      // Props edges (green, dimmed)
      {
        selector: 'edge[edgeType="props"]',
        style: {
          'line-color': '#3fb950',
          'target-arrow-color': '#3fb950',
          'opacity': 0.2
        }
      },
      // Context edges (purple, slightly more visible)
      {
        selector: 'edge[edgeType="context"]',
        style: {
          'line-color': '#8957e5',
          'target-arrow-color': '#8957e5',
          'line-style': 'dashed',
          'opacity': 0.3
        }
      },
      // Hierarchy edges (gray, more visible)
      {
        selector: 'edge[edgeType="hierarchy"]',
        style: {
          'line-color': '#8b949e',
          'target-arrow-color': '#8b949e',
          'opacity': 0.5,
          'width': 1.5
        }
      },
      // Drilling edges (red, full opacity)
      {
        selector: 'edge[edgeType="drilling"]',
        style: {
          'line-color': '#f85149',
          'target-arrow-color': '#f85149',
          'width': 3,
          'opacity': 1
        }
      },
      // Highlighted edges (direct connections on hover)
      {
        selector: 'edge.highlight-direct',
        style: {
          'opacity': 1,
          'width': 2.5
        }
      },
      // 2-hop connections
      {
        selector: 'edge.highlight-2hop',
        style: {
          'opacity': 0.5
        }
      },
      // Hidden edges
      {
        selector: 'edge.hidden',
        style: {
          'display': 'none'
        }
      },
      // Connected nodes highlight
      {
        selector: 'node.connected',
        style: {
          'border-width': 2,
          'border-color': '#58a6ff'
        }
      },
      // Directory nodes (for semantic zoom)
      {
        selector: 'node[nodeType="directory"]',
        style: {
          'shape': 'roundrectangle',
          'background-color': '#30363d',
          'border-width': 5,
          'border-color': '#8b949e',
          'color': '#ffffff',
          'font-size': '40px',
          'font-weight': 'bold',
          'text-valign': 'center',
          'text-halign': 'center',
          'padding': '30px'
        }
      },
      // Directory with stateful components
      {
        selector: 'node[nodeType="directory"][statefulCount > 0]',
        style: {
          'border-color': '#1f6feb',
          'border-width': 3
        }
      },
      // Directory with providers
      {
        selector: 'node[nodeType="directory"][?hasProvider]',
        style: {
          'border-color': '#8957e5',
          'border-width': 3
        }
      },
      // Directory edges - show connection count between directories
      {
        selector: 'edge[edgeType="directory"]',
        style: {
          'line-color': '#58a6ff',
          'target-arrow-color': '#58a6ff',
          'target-arrow-shape': 'triangle',
          'arrow-scale': 2,
          'width': 'mapData(weight, 1, 10, 4, 12)',
          'opacity': 0.8,
          'curve-style': 'bezier',
          'label': 'data(weight)',
          'font-size': '24px',
          'font-weight': 'bold',
          'color': '#ffffff',
          'text-background-color': '#1f6feb',
          'text-background-opacity': 1,
          'text-background-padding': '6px',
          'text-background-shape': 'roundrectangle',
          'text-border-color': '#58a6ff',
          'text-border-width': 2,
          'text-border-opacity': 1
        }
      },
      // Zoom-hidden elements
      {
        selector: '.zoom-hidden',
        style: {
          'display': 'none'
        }
      },
      // Medium zoom - reduced detail
      {
        selector: '.zoom-medium',
        style: {
          'font-size': '9px',
          'text-opacity': 0.7,
          'border-width': 1,
          'height': 28,
          'padding': '4px'
        }
      },
      {
        selector: '.zoom-medium[nodeType="stateful"]',
        style: {
          'border-width': 2
        }
      },
      // Search highlight
      {
        selector: '.search-highlight',
        style: {
          'border-width': 4,
          'border-color': '#f0883e',
          'background-color': '#f0883e22',
          'z-index': 9999
        }
      },
      // Path finding highlights
      {
        selector: '.path-start',
        style: {
          'border-width': 4,
          'border-color': '#3fb950',
          'background-color': '#3fb95033',
          'z-index': 9999
        }
      },
      {
        selector: '.path-end',
        style: {
          'border-width': 4,
          'border-color': '#f85149',
          'background-color': '#f8514933',
          'z-index': 9999
        }
      },
      {
        selector: '.path-highlight',
        style: {
          'border-width': 3,
          'border-color': '#a371f7',
          'background-color': '#a371f733',
          'z-index': 9998
        }
      },
      {
        selector: 'edge.path-highlight',
        style: {
          'line-color': '#a371f7',
          'target-arrow-color': '#a371f7',
          'width': 4,
          'opacity': 1,
          'z-index': 9998
        }
      },
      // Focus mode styles
      {
        selector: '.focused',
        style: {
          'opacity': 1
        }
      },
      {
        selector: '.dimmed',
        style: {
          'opacity': 0.15
        }
      }
    ];
  }

  function setupCytoscapeInteractions() {
    // Node click - show details or handle path mode
    cy.on('tap', 'node', function(evt) {
      const node = evt.target;
      if (pathMode) {
        handlePathModeClick(node.data());
      } else {
        showNodeDetails(node.data());
      }
    });

    // Node hover - highlight connections
    cy.on('mouseover', 'node', function(evt) {
      const node = evt.target;
      hoveredNodeId = node.id();
      highlightConnections(node);
    });

    cy.on('mouseout', 'node', function(evt) {
      hoveredNodeId = null;
      clearHighlights();
    });

    // Double-click to collapse/expand
    cy.on('dbltap', 'node', async function(evt) {
      const node = evt.target;
      const nodeId = node.data('id').replace(/^drill_\\d+_\\d+$/, (m) => {
        const parts = m.split('_');
        return nodes[parseInt(parts[2])]?.id || m;
      });

      const originalId = node.data('componentData')?.id || nodeId;

      if (collapsedNodes.has(originalId)) {
        collapsedNodes.delete(originalId);
      } else {
        collapsedNodes.add(originalId);
      }

      await initCytoscape();
    });
  }

  function highlightConnections(node) {
    const nodeId = node.id();

    // Get direct connections
    const directEdges = cy.edges().filter(edge =>
      edge.data('source') === nodeId || edge.data('target') === nodeId
    );

    // Get directly connected nodes
    const directNodeIds = new Set();
    directEdges.forEach(edge => {
      directNodeIds.add(edge.data('source'));
      directNodeIds.add(edge.data('target'));
    });
    directNodeIds.delete(nodeId);

    // Get 2-hop connections
    const twoHopEdges = cy.edges().filter(edge => {
      const source = edge.data('source');
      const target = edge.data('target');
      return (directNodeIds.has(source) || directNodeIds.has(target)) &&
             source !== nodeId && target !== nodeId &&
             !directEdges.contains(edge);
    });

    // Apply highlights
    directEdges.addClass('highlight-direct');
    twoHopEdges.addClass('highlight-2hop');

    // Highlight connected nodes
    directNodeIds.forEach(id => {
      cy.getElementById(id).addClass('connected');
    });
  }

  function clearHighlights() {
    cy.edges().removeClass('highlight-direct highlight-2hop');
    cy.nodes().removeClass('connected');
  }

  function showNodeDetails(data) {
    const comp = data.componentData;
    if (!comp) return;

    const fileName = comp.filePath.split('/').pop();

    // Find metrics for this component
    const metrics = graphData.componentMetrics?.find(m => m.componentId === comp.id);

    let roleHtml = '';
    if (metrics) {
      const roleColors = {
        consumer: 'role-consumer',
        passthrough: 'role-passthrough',
        transformer: 'role-transformer',
        mixed: 'role-mixed'
      };
      roleHtml = \`<span class="role-badge \${roleColors[metrics.role]}">\${metrics.role}</span>\`;
    }

    let html = \`
      <div class="sidebar-content">
        <div class="sidebar-section">
          <h3>\${comp.name}\${roleHtml}</h3>
          <a class="file-link" data-path="\${comp.filePath}" data-line="\${comp.line}">
            \${fileName}:\${comp.line}
          </a>
          <div class="sidebar-actions">
            <button class="sidebar-btn" onclick="window.focusOnNode('\${comp.id}')" title="Focus on this component and its neighbors">
              Focus
            </button>
            \${focusedNodeId ? '<button class="sidebar-btn secondary" onclick="window.clearFocus()">Clear Focus</button>' : ''}
          </div>
        </div>
    \`;

    if (comp.stateProvided && comp.stateProvided.length > 0) {
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

    if (comp.contextProviders && comp.contextProviders.length > 0) {
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

    if (comp.contextConsumers && comp.contextConsumers.length > 0) {
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

    if (comp.props && comp.props.length > 0) {
      html += \`
        <div class="sidebar-section">
          <h3>Props</h3>
          \${comp.props.map(p => \`<span class="tag tag-props">\${p.name}</span>\`).join('')}
        </div>
      \`;
    }

    // Add prop metrics visualization
    if (metrics && metrics.totalPropsReceived > 0) {
      const total = metrics.totalPropsReceived;
      const consumedPct = (metrics.propsConsumed / total * 100).toFixed(0);
      const passedPct = (metrics.propsPassed / total * 100).toFixed(0);
      const transformedPct = (metrics.propsTransformed / total * 100).toFixed(0);
      const ignoredPct = (metrics.propsIgnored / total * 100).toFixed(0);

      html += \`
        <div class="sidebar-section metrics-section">
          <h3>Prop Usage</h3>
          <div class="detail-row">
            <span class="detail-label">Total Props</span>
            <span class="detail-value">\${total}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Passthrough Ratio</span>
            <span class="detail-value">\${(metrics.passthroughRatio * 100).toFixed(0)}%</span>
          </div>
          <div class="metrics-bar-container">
            <div class="metrics-bar-segment metrics-bar-consumed" style="width: \${consumedPct}%"></div>
            <div class="metrics-bar-segment metrics-bar-passed" style="width: \${passedPct}%"></div>
            <div class="metrics-bar-segment metrics-bar-transformed" style="width: \${transformedPct}%"></div>
            <div class="metrics-bar-segment metrics-bar-ignored" style="width: \${ignoredPct}%"></div>
          </div>
          <div class="metrics-legend">
            <div class="metrics-legend-item">
              <div class="metrics-legend-dot" style="background: var(--vscode-charts-green)"></div>
              <span>Consumed (\${metrics.propsConsumed})</span>
            </div>
            <div class="metrics-legend-item">
              <div class="metrics-legend-dot" style="background: var(--vscode-charts-yellow)"></div>
              <span>Passed (\${metrics.propsPassed})</span>
            </div>
            <div class="metrics-legend-item">
              <div class="metrics-legend-dot" style="background: var(--vscode-charts-blue)"></div>
              <span>Transformed (\${metrics.propsTransformed})</span>
            </div>
            <div class="metrics-legend-item">
              <div class="metrics-legend-dot" style="background: var(--vscode-charts-red)"></div>
              <span>Ignored (\${metrics.propsIgnored})</span>
            </div>
          </div>
        </div>
      \`;
    }

    const incoming = graphData.edges.filter(e => e.to === comp.id);
    const outgoing = graphData.edges.filter(e => e.from === comp.id);

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

    // Count passthrough components
    let passthroughBadge = '';
    if (graphData.componentMetrics) {
      const passthroughCount = graphData.componentMetrics.filter(m => m.role === 'passthrough').length;
      if (passthroughCount > 0) {
        passthroughBadge = \`<span class="passthrough-badge">\${passthroughCount} passthrough</span>\`;
      }
    }

    // Count bundle warnings
    let bundleBadge = '';
    if (graphData.bundles) {
      const largeBundles = graphData.bundles.filter(b => b.estimatedSize >= 5 || b.passedThrough.length >= 2).length;
      if (largeBundles > 0) {
        bundleBadge = \`<span class="bundle-badge">\${largeBundles} bundles</span>\`;
      }
    }

    // Count context leaks
    let leakBadge = '';
    if (graphData.contextLeaks) {
      const leakCount = graphData.contextLeaks.length;
      if (leakCount > 0) {
        leakBadge = \`<span class="leak-badge">\${leakCount} leaks</span>\`;
      }
    }

    // Count prop renames
    let renameBadge = '';
    if (graphData.propChains) {
      const complexChains = graphData.propChains.filter(c => c.depth >= 2).length;
      if (complexChains > 0) {
        renameBadge = \`<span class="rename-badge">\${complexChains} renames</span>\`;
      }
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

    // Update compact summary for the toggle button
    if (statsSummary) {
      const issues = [];
      if (summaryData.components.drillingComponents > 0) issues.push(\`\${summaryData.components.drillingComponents} drilling\`);
      if (summaryData.components.passthroughComponents > 0) issues.push(\`\${summaryData.components.passthroughComponents} passthrough\`);
      statsSummary.textContent = \`\${summaryData.components.totalComponents} components\` + (issues.length ? \` · \${issues.join(', ')}\` : '');
    }
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
      let contextLegendItems = '';
      contextColorMap.forEach((colorIndex, contextName) => {
        const color = CONTEXT_COLORS[colorIndex];
        contextLegendItems += \`
          <div class="legend-item">
            <div class="legend-color" style="background: \${color.fill}; border: 2px solid \${color.fill};"></div>
            <span>\${contextName}</span>
          </div>
        \`;
      });

      if (contextLegendItems === '') {
        contextLegendItems = \`
          <div class="legend-item">
            <div class="legend-color" style="background: transparent; border: 2px dashed #8957e5;"></div>
            <span>Context Flow</span>
          </div>
        \`;
      }

      legendEl.innerHTML = \`
        <div class="legend-item">
          <div class="legend-color" style="background: #0d9488"></div>
          <span>Component</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #1f6feb"></div>
          <span>Stateful</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #8b949e"></div>
          <span>Hierarchy</span>
        </div>
        \${contextLegendItems}
      \`;
    } else {
      // State Flow view - no Hierarchy (that's Context view only)
      legendEl.innerHTML = \`
        <div class="legend-item">
          <div class="legend-color" style="background: #0d9488"></div>
          <span>Component</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #1f6feb"></div>
          <span>Stateful</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #3fb950"></div>
          <span>Props Flow</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: transparent; border: 2px dashed #8957e5;"></div>
          <span>Context</span>
        </div>
      \`;
    }
  }
})();
  `;
}
