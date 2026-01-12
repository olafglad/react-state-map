# Changelog

All notable changes to @react-state-map/cli will be documented in this file.

## [0.1.2] - 2025-01-06

### Fixed
- **Large Project Support**: Fixed HTML output visualization for large projects
  - Added automatic fit-to-view that zooms out to show all nodes
  - Dynamic spacing based on component count (1.2x for 20+ nodes, 1.5x for 50+ nodes)
  - Removed viewport clamping that caused nodes to be cut off
  - Added more collision detection iterations for dense graphs
- Includes all @react-state-map/core v0.1.2 fixes (context detection, prop drilling)

### Added
- **Fit to View Button**: New button in HTML output to reset zoom and center the graph

## [0.1.1] - 2025-01-05

### Fixed
- Minor bug fixes

## [0.1.0] - 2025-01-05

### Added
- Initial release
- CLI tool for React state visualization
- HTML output with interactive graph
- JSON output for programmatic use
- Watch mode for development
- Configurable include/exclude patterns
- Configurable prop drilling threshold
