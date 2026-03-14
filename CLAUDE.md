# UniTerm — Obsidian Terminal Plugin

## Project Overview
Obsidian内にVSCode風の統合ターミナルを提供するコミュニティプラグイン。
node-pty + xterm.js でネイティブシェルを実行し、AIエージェント（Claude Code等）の快適な操作を実現。

## Tech Stack
- **Language:** TypeScript (strict mode)
- **Terminal:** @xterm/xterm v5.x + addons (fit, web-links, unicode11)
- **PTY:** node-pty (native module, dynamically loaded via electron-bridge)
- **Build:** esbuild (node-pty is external)
- **Test:** vitest
- **Platform:** Obsidian desktop only (Electron, nodeIntegration: true)

## Directory Structure
```
src/
├── main.ts                  # Plugin entry point
├── types.ts                 # Type definitions
├── constants.ts             # Constants (VIEW_TYPE, defaults)
├── core/
│   ├── electron-bridge.ts   # node-pty dynamic loading
│   ├── shell-detector.ts    # OS-specific shell detection
│   ├── pty-manager.ts       # PTY process management
│   └── session-manager.ts   # Session lifecycle
├── ui/
│   ├── terminal-view.ts     # Obsidian ItemView
│   └── terminal-renderer.ts # xterm.js wrapper
└── __tests__/               # Tests colocated with modules
styles/
└── terminal.css
```

## TDD Workflow (MANDATORY)
All implementation follows strict Red-Green-Refactor:
1. **RED:** Write failing tests first (`npm run test` must fail)
2. **GREEN:** Write minimum code to pass tests
3. **REFACTOR:** Clean up while keeping tests green

Use `/tdd` skill to guide the cycle.

## Testing
- Framework: vitest
- Mock all externals: node-pty, xterm.js, Obsidian API via `vi.mock()`
- Test files: `src/**/__tests__/*.test.ts`
- Run: `npm run test` / `npm run test:watch`
- Coverage target: core/ 90%+, ui/ 80%+

## Build
```bash
npm run build    # esbuild production bundle
npm run dev      # esbuild watch mode
npm run test     # vitest run
```

## Coding Conventions
- No default exports except `src/main.ts` (Obsidian requirement)
- Prefer composition over inheritance
- All public APIs must have TypeScript types
- Log format: `[obsidian-uniterm] {level}: {message}`
- Error handling: return null + error message, don't throw in library code
