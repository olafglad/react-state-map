import { ReactParser, serializeGraph, GraphAnalyzer } from '@react-state-map/core';
import type { SerializedStateFlowGraph } from '@react-state-map/core';
import { generateHTML } from '../renderers/html-renderer.js';
import { watch } from 'chokidar';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { exec } from 'node:child_process';
import { platform } from 'node:os';

interface AnalyzeOptions {
  output: string;
  format: string;
  watch?: boolean;
  threshold: string;
  open?: boolean;
  exclude?: string[];
  include?: string[];
}

function openInBrowser(filePath: string): void {
  const absolutePath = path.resolve(filePath);
  const cmd = platform() === 'darwin'
    ? `open "${absolutePath}"`
    : platform() === 'win32'
      ? `start "" "${absolutePath}"`
      : `xdg-open "${absolutePath}"`;

  exec(cmd, (error) => {
    if (error) {
      console.log(`  Open manually: file://${absolutePath}`);
    }
  });
}

function analyze(directory: string, options: AnalyzeOptions): SerializedStateFlowGraph | null {
  const rootDir = path.resolve(directory);

  if (!fs.existsSync(rootDir)) {
    console.error(`Error: Directory "${rootDir}" does not exist`);
    return null;
  }

  console.log(`\n📊 Analyzing ${rootDir}...\n`);

  const parser = new ReactParser({
    rootDir,
    drillingThreshold: parseInt(options.threshold, 10),
    exclude: options.exclude,
    include: options.include,
  });

  const result = parser.parse();

  if (result.errors.length > 0) {
    console.log('⚠️  Errors during parsing:');
    for (const error of result.errors) {
      console.log(`   ${error.filePath}: ${error.message}`);
    }
    console.log('');
  }

  const serialized = serializeGraph(result.graph);
  const analyzer = new GraphAnalyzer(result.graph);
  const summary = analyzer.getSummary();

  console.log(`   Components: ${summary.components.totalComponents}`);
  console.log(`   State nodes: ${summary.state.totalStateNodes}`);
  console.log(`   Flow edges: ${summary.flow.totalEdges}`);
  console.log(`   Context boundaries: ${summary.contextBoundaries}`);

  if (summary.propDrillingPaths > 0) {
    console.log(`   ⚠️  Prop drilling paths: ${summary.propDrillingPaths}`);
  }

  if (result.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    for (const warning of result.warnings) {
      console.log(`   [${warning.code}] ${path.basename(warning.filePath)}:${warning.line}`);
      console.log(`      ${warning.message}`);
    }
  }

  return serialized;
}

function writeOutput(
  graph: SerializedStateFlowGraph,
  options: AnalyzeOptions,
  isWatch: boolean = false
): void {
  const outputPath = path.resolve(options.output);

  if (options.format === 'json') {
    fs.writeFileSync(outputPath, JSON.stringify(graph, null, 2));
  } else {
    const html = generateHTML(graph);
    fs.writeFileSync(outputPath, html);
  }

  console.log(`\n✅ Output written to: ${outputPath}`);

  if (options.open !== false && !isWatch) {
    openInBrowser(outputPath);
  }
}

export function analyzeCommand(directory: string, options: AnalyzeOptions): void {
  const graph = analyze(directory, options);

  if (!graph) {
    process.exit(1);
  }

  writeOutput(graph, options);

  if (options.watch) {
    const rootDir = path.resolve(directory);
    const patterns = options.include || ['**/*.tsx', '**/*.jsx', '**/*.ts', '**/*.js'];
    const watchPatterns = patterns.map(p => path.join(rootDir, p));

    console.log('\n👀 Watching for changes...\n');

    const watcher = watch(watchPatterns, {
      ignored: options.exclude || ['**/node_modules/**', '**/dist/**'],
      persistent: true,
      ignoreInitial: true,
    });

    let debounceTimer: NodeJS.Timeout | null = null;

    const handleChange = (changedPath: string) => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      debounceTimer = setTimeout(() => {
        console.log(`\n📝 File changed: ${path.basename(changedPath)}`);
        const newGraph = analyze(directory, options);
        if (newGraph) {
          writeOutput(newGraph, options, true);
        }
      }, 300);
    };

    watcher.on('change', handleChange);
    watcher.on('add', handleChange);
    watcher.on('unlink', handleChange);

    process.on('SIGINT', () => {
      console.log('\n\n👋 Stopping watcher...');
      watcher.close();
      process.exit(0);
    });
  }
}
