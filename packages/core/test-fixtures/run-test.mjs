import { ReactParser, GraphAnalyzer, serializeGraph } from '../dist/index.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log('Testing React State Map Core Parser\n');
  console.log('='.repeat(50));

  const parser = new ReactParser({
    rootDir: path.join(__dirname, 'sample-app'),
  });

  const result = parser.parse();

  console.log('\n📁 Parsed Files:');
  console.log('-'.repeat(30));

  const components = Array.from(result.graph.components.values());
  console.log(`Found ${components.length} components:\n`);

  for (const comp of components) {
    console.log(`  📦 ${comp.name}`);
    console.log(`     File: ${path.basename(comp.filePath)}:${comp.line}`);
    console.log(`     State defined: ${comp.stateProvided.map(s => `${s.name} (${s.type})`).join(', ') || 'none'}`);
    console.log(`     Context providers: ${comp.contextProviders.map(c => c.contextName).join(', ') || 'none'}`);
    console.log(`     Context consumers: ${comp.contextConsumers.join(', ') || 'none'}`);
    console.log(`     Props: ${comp.props.map(p => p.name).join(', ') || 'none'}`);
    console.log();
  }

  console.log('\n🔗 State Nodes:');
  console.log('-'.repeat(30));

  const stateNodes = Array.from(result.graph.stateNodes.values());
  console.log(`Found ${stateNodes.length} state nodes:\n`);

  for (const state of stateNodes) {
    console.log(`  🔹 ${state.name} (${state.type})`);
    console.log(`     File: ${path.basename(state.filePath)}:${state.line}`);
    if (state.initialValue) {
      console.log(`     Initial: ${state.initialValue}`);
    }
    console.log();
  }

  console.log('\n➡️  State Flow Edges:');
  console.log('-'.repeat(30));
  console.log(`Found ${result.graph.edges.length} edges:\n`);

  for (const edge of result.graph.edges) {
    const from = result.graph.components.get(edge.from);
    const to = result.graph.components.get(edge.to);
    console.log(`  ${from?.name || edge.from} → ${to?.name || edge.to}`);
    console.log(`     Mechanism: ${edge.mechanism}${edge.propName ? ` (prop: ${edge.propName})` : ''}`);
    console.log();
  }

  console.log('\n🎯 Context Boundaries:');
  console.log('-'.repeat(30));
  console.log(`Found ${result.graph.contextBoundaries.length} context boundaries:\n`);

  for (const boundary of result.graph.contextBoundaries) {
    console.log(`  📍 ${boundary.contextName}`);
    console.log(`     Provider: ${result.graph.components.get(boundary.providerComponent)?.name}`);
    console.log(`     Consumers: ${boundary.childComponents.map(id => result.graph.components.get(id)?.name).join(', ')}`);
    console.log();
  }

  console.log('\n⚠️  Prop Drilling Paths:');
  console.log('-'.repeat(30));

  if (result.graph.propDrillingPaths.length === 0) {
    console.log('No prop drilling detected (threshold: 3 hops)\n');
  } else {
    for (const drilling of result.graph.propDrillingPaths) {
      console.log(`  🔴 "${drilling.stateName}" drilled through ${drilling.hops} components:`);
      console.log(`     Path: ${drilling.path.join(' → ')}`);
      console.log();
    }
  }

  // Test analyzer
  console.log('\n📊 Graph Analysis:');
  console.log('-'.repeat(30));

  const analyzer = new GraphAnalyzer(result.graph);
  const summary = analyzer.getSummary();

  console.log(`  Components: ${summary.components.totalComponents}`);
  console.log(`  With State: ${summary.components.componentsWithState}`);
  console.log(`  With Context: ${summary.components.componentsWithContext}`);
  console.log(`  State Nodes: ${summary.state.totalStateNodes}`);
  console.log(`  State by Type:`, summary.state.byType);
  console.log(`  Flow Edges: ${summary.flow.totalEdges}`);
  console.log(`  Context Boundaries: ${summary.contextBoundaries}`);

  // Output serialized JSON
  console.log('\n📄 Serialized JSON Preview (first 500 chars):');
  console.log('-'.repeat(30));
  const json = JSON.stringify(serializeGraph(result.graph), null, 2);
  console.log(json.slice(0, 500) + '...\n');

  if (result.errors.length > 0) {
    console.log('\n❌ Errors:');
    for (const err of result.errors) {
      console.log(`  ${err.filePath}: ${err.message}`);
    }
  }

  if (result.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    for (const warn of result.warnings) {
      console.log(`  [${warn.code}] ${warn.filePath}:${warn.line} - ${warn.message}`);
    }
  }

  console.log('\n✅ Test completed successfully!');
}

main().catch(console.error);
