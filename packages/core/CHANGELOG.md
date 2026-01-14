# Changelog

All notable changes to @react-state-map/core will be documented in this file.

## [0.1.6] - 2025-01-14

### Added
- **Pass-Through Ratio Analysis**: New component role classification
  - Components classified as: consumer, passthrough, transformer, or mixed
  - Tracks how props are used: consumed, passed through, transformed, or ignored
  - `ComponentPropMetrics` type with detailed prop usage statistics
  - Analyzer methods: `getComponentMetrics()`, `getPassthroughComponents()`, `getComponentsByRole()`

- **Bundle Detection**: Detect large object props being passed through components
  - Identifies inline object literals with 3+ properties
  - Tracks bundles through component chains
  - Warns about bundles with 5+ properties
  - `PropBundle` type and analyzer methods: `getBundles()`, `getLargeBundles()`, `getBundleWarnings()`

- **Context Leak Detection**: Detect anti-pattern of extracting context and re-passing as props
  - Finds components that use `useContext` then pass values as props to children
  - Handles destructured context values and non-null assertions
  - Provides fix suggestions
  - `ContextLeak` type and analyzer methods: `getContextLeaks()`, `getContextLeakSummary()`

- **Rename Tracking**: Track props through rename chains
  - Detects destructuring renames: `const { id: dealId } = props`
  - Detects assignment renames: `const newName = oldProp`
  - Builds scope maps to trace variable origins
  - `PropChain` and `PropRename` types with analyzer methods

### Fixed
- `getHookStateName` now handles non-null assertions (`!`) and object destructuring
- Enhanced context usage extraction to navigate through wrapper nodes

## [0.1.5] - 2025-01-13

### Changed
- Version bump to stay in sync with CLI and VS Code extension releases
- No functional changes to core parsing logic

## [0.1.4] - 2025-01-13

### Changed
- Version bump to stay in sync with CLI and VS Code extension releases
- No functional changes to core parsing logic

## [0.1.3] - 2025-01-07

### Changed
- Updated README with correct API usage examples
- Fixed VS Code extension marketplace link

## [0.1.2] - 2025-01-06

### Fixed
- **Context Detection**: Expanded provider detection patterns
  - Added `KNOWN_PROVIDER_NAMES` set for common providers (ThemeProvider, Provider, AuthProvider, QueryClientProvider, etc.)
  - Now detects any component ending in `Provider`
  - Checks multiple provider props (`value`, `store`, `client`, `theme`, `config`)
- **Prop Drilling Detection**: Fixed false negatives
  - Added iterative refinement pass to correctly update hop counts through component chains
  - Fixed `countUnusedHops` to identify true pass-through components (receive AND pass state)
  - Props are now correctly traced through intermediate components
- **State Tracking**: Improved `findStateByName` to check `stateUsed` for props received from parent components

## [0.1.1] - 2025-01-05

### Fixed
- Minor bug fixes

## [0.1.0] - 2025-01-05

### Added
- Initial release
- React component parsing with ts-morph
- State detection: useState, useReducer, useContext, Redux, Zustand, custom hooks
- Context boundary detection
- Prop drilling detection with configurable threshold
- Graph serialization for visualization
