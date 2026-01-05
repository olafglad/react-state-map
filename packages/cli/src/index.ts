#!/usr/bin/env node

import { Command } from 'commander';
import { analyzeCommand } from './commands/analyze.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getVersion(): string {
  try {
    const pkgPath = path.join(__dirname, '..', 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    return pkg.version;
  } catch {
    return '0.1.0';
  }
}

const program = new Command();

program
  .name('react-state-map')
  .description('Visualize React state flow through static analysis')
  .version(getVersion());

program
  .argument('[directory]', 'Directory to analyze', '.')
  .option('-o, --output <file>', 'Output file path', 'state-map.html')
  .option('-f, --format <format>', 'Output format (html, json)', 'html')
  .option('-w, --watch', 'Watch for file changes')
  .option('-t, --threshold <number>', 'Prop drilling threshold', '3')
  .option('--no-open', 'Do not open the output file in browser')
  .option('-e, --exclude <patterns...>', 'Glob patterns to exclude')
  .option('-i, --include <patterns...>', 'Glob patterns to include')
  .action(analyzeCommand);

program.parse();
