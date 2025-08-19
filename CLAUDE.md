# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RiSA is an Electron-based desktop application for RSA encryption and decryption with a Postman-style GUI interface. The application provides text encryption/decryption capabilities and includes a comprehensive settings management system.

## Architecture

### Multi-Process Architecture
- **Main Process** (`src/main/`): Electron main process handling IPC, file operations, and RSA cryptography
- **Renderer Process** (`src/renderer/`): React-based UI with Ant Design components
- **Preload Script** (`src/main/preload.ts`): Secure communication bridge between main and renderer processes

### Key Components
- **Settings Management**: Uses `electron-store` for persistent settings with GUI configuration panel
- **RSA Operations**: Implemented using `node-rsa` library in the main process
- **IPC Communication**: Defined channels in `src/shared/constants.ts` for secure process communication
- **State Management**: React Context API for settings state across the renderer process

### Project Structure
```
src/
├── main/           # Electron main process
├── renderer/       # React frontend
│   ├── components/ # Reusable UI components
│   ├── pages/      # Main application pages
│   └── store/      # React context providers
└── shared/         # Shared types and constants
```

## Development Commands

### Prerequisites
- Uses `pnpm` as package manager
- Requires Node.js and Electron dependencies

### Building and Development
```bash
# Install dependencies
pnpm install

# Development mode (needs to be set up)
NODE_ENV=development pnpm run dev

# Build for production
pnpm run build

# TypeScript compilation
pnpm exec tsc --noEmit
```

### Current Development Status
The project is in early development with basic structure set up. Missing components include:
- Build scripts in package.json
- Settings page implementation
- Key manager page implementation
- Webpack build configuration for both main and renderer processes

## Technical Notes

### TypeScript Configuration
- Uses path aliases (`@/*` maps to `src/*`)
- Targets ES2020 with React JSX support
- Strict TypeScript checking enabled

### IPC Architecture
All communication between main and renderer processes goes through predefined IPC channels defined in `src/shared/constants.ts`. The main process handles:
- Settings persistence via electron-store
- RSA key generation and cryptographic operations
- File system operations (folder/file selection)
- Settings import/export functionality

### Security Considerations
- Context isolation enabled in Electron
- Node integration disabled in renderer process
- All Node.js APIs accessed through secure preload script

### UI Framework
Uses Ant Design components with:
- Sidebar navigation (Postman-style)
- Tabbed interface for encrypt/decrypt operations
- Theme support (light/dark mode)
- React Router for page navigation

## Known Issues

### Current TypeScript Errors
- `electron-store` usage needs proper typing
- Missing CSS loader dependencies for webpack
- Build scripts not configured in package.json

### Missing Implementation
- Settings page UI and functionality
- Key manager page
- File encryption/decryption features
- Proper webpack dev server setup