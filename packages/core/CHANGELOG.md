# Changelog

All notable changes to @react-state-map/core will be documented in this file.

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
