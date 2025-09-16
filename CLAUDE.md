# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RiSA is an Electron-based desktop application for RSA encryption and decryption with a clean and intuitive GUI interface. The application provides text encryption/decryption capabilities and includes a comprehensive settings management system.

## Architecture

### Multi-Process Architecture
- **Main Process** (`src/main/`): Electron main process handling IPC, file operations, and RSA cryptography
- **Renderer Process** (`src/renderer/`): React-based UI with Ant Design components
- **Preload Script** (`src/main/preload.ts`): Secure communication bridge between main and renderer processes

### Key Components
- **Settings Management**: Uses `electron-store` for persistent settings with GUI configuration panel
- **RSA Operations**: Implemented using `node-rsa` library in the main process
- **Chain Builder**: Sequential operation system for complex workflows (encoding, encryption, HTTP parsing)
- **HTTP Parser**: URL template-based parsing and building with reusable templates
- **IPC Communication**: Defined channels in `src/shared/constants.ts` for secure process communication
- **State Management**: React Context API for settings, chains, keys, history, and HTTP templates

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
- Node.js 18+ and Electron dependencies required

### Building and Development
```bash
# Install dependencies
pnpm install

# Development mode (runs both main and renderer processes)
pnpm run dev

# Build for production (builds main, renderer, and preload)
pnpm run build

# Build individual components
pnpm run build:main      # Main process only
pnpm run build:renderer  # Renderer process only
pnpm run build:preload   # Preload script only

# Run built application
pnpm run start

# Package for distribution
pnpm run package        # All platforms
pnpm run package:mac    # macOS only

# TypeScript type checking
pnpm exec tsc --noEmit
```

## Technical Notes

### TypeScript Configuration
- Uses path aliases (`@/*` maps to `src/*`)
- Targets ES2020 with React JSX support
- Strict TypeScript checking enabled

### IPC Architecture
All communication between main and renderer processes goes through predefined IPC channels defined in `src/shared/constants.ts`. The main process handles:
- Settings persistence via electron-store
- RSA key generation and cryptographic operations
- Chain execution via `chainExecutor.ts` (URL encoding, Base64, RSA, HTTP parsing/building)
- HTTP template management and URL parsing/building
- File system operations (folder/file selection)
- History tracking for all operations
- Settings import/export functionality

### Security Considerations
- Context isolation enabled in Electron
- Node integration disabled in renderer process
- All Node.js APIs accessed through secure preload script

### UI Framework
Uses Ant Design components with:
- Clean sidebar navigation
- Tabbed interface for encrypt/decrypt operations
- Theme support (light/dark mode)
- React Router for page navigation

## Feature Areas

### Implemented Features
- RSA encryption/decryption with multiple key sizes and algorithms
- Key generation and management with import/export
- Chain Builder for sequential operations
- HTTP Parser with template-based URL parsing and building
- Base64 and URL encoding/decoding tools
- Operation history with filtering
- Auto-update system for macOS

### Chain Builder Operations
The Chain Builder (`ChainBuilderPage.tsx`) supports sequential operations with input/output mapping:
- URL encoding/decoding
- Base64 encoding/decoding
- RSA encryption/decryption
- HTTP parsing (extract path/query parameters from URLs)
- HTTP building (construct URLs from templates and parameters)

### HTTP Templates
HTTP templates (`HttpTemplateContext.tsx`) enable reusable URL patterns:
- Path parameters using `:param` or `{param}` syntax
- Query parameters with validation patterns
- Template-based parsing and building in Chain Builder
- Input/output field mapping for chain operations