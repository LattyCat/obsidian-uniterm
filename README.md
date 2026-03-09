# Obsidian Terminal

Obsidian内にVSCode風の統合ターミナルを提供するコミュニティプラグイン。

OSネイティブシェルを直接実行し、AIコーディングエージェント（Claude Code / Codex CLI / Gemini CLI）の快適な操作を第一級でサポートする。

## Features

- **ネイティブシェル統合** — node-pty + xterm.jsによる完全なターミナルエミュレーション
- **AIエージェント最適化** — Shift+Enter、TUIレンダリング、大量出力のフロー制御を設計段階からサポート
- **WebGLレンダラー** — GPU加速レンダリング（Canvas自動フォールバック付き）
- **テーマ同期** — Obsidianのダーク/ライトテーマに自動追従、カスタムテーマも対応
- **シェルプロファイル** — Default Shell / Claude Code / Codex CLI / Gemini CLI / Git のプリセット
- **フォーカス管理** — Ctrl+Escape でフォーカス解除、Cmd/Ctrl キーはObsidianに転送
- **ターミナル内検索** — Ctrl+Shift+F / Cmd+Shift+F
- **設定GUI** — フォント、カーソル、テーマ、スクロールバック等をObsidian設定画面から変更
- **アクセシビリティ** — ARIA属性、スクリーンリーダーモード対応

## Installation

### BRAT (Beta)

1. [BRAT](https://github.com/TfTHacker/obsidian42-brat) プラグインをインストール
2. BRAT設定で `LattyCat/obsidian-terminal` を追加
3. プラグインを有効化

### Manual

1. [Releases](https://github.com/LattyCat/obsidian-terminal/releases) から `main.js`, `manifest.json`, `styles.css` をダウンロード
2. Vault の `.obsidian/plugins/obsidian-terminal/` に配置
3. Obsidianを再起動し、プラグインを有効化

## Usage

### ターミナルを開く

- コマンドパレット: `Terminal: Toggle terminal panel`
- リボンアイコン（ターミナルアイコン）をクリック

### キーバインド

| キー | 動作 |
|------|------|
| `Ctrl+Shift+F` / `Cmd+Shift+F` | ターミナル内検索 |
| `Ctrl+Shift+K` / `Cmd+Shift+K` | ターミナルクリア |
| `Ctrl+Shift+C` / `Cmd+C` | コピー |
| `Ctrl+Shift+V` / `Cmd+V` | ペースト |
| `Ctrl+Escape` | フォーカス解除（Obsidianに戻る） |
| `Shift+Enter` | ESC+CR シーケンス送信（AIエージェント用） |

### コマンドパレット

- `Terminal: Toggle terminal panel` — パネルの表示/非表示
- `Terminal: Focus terminal` — ターミナルにフォーカス移動
- `Terminal: Unfocus terminal` — フォーカス解除
- `Terminal: Clear terminal` — 画面クリア
- `Terminal: Find in terminal` — 検索バー表示

## Status

**v1.0.0-beta** — Phase 1〜3 実装完了。実機検証中。

仕様書は [`spec/SPEC.md`](spec/SPEC.md) を参照。

### Roadmap

| バージョン | スコープ | 状態 |
|-----------|---------|------|
| **v1.0** | 単一ターミナル + AIエージェント対応 + 設定UI | beta |
| v1.1 | タブ管理、D&D、出力コピー | planned |
| v1.2+ | セッション復元、分割ペイン、SSH接続 | planned |

## Requirements

- Obsidian v1.5.0+（デスクトップ版のみ）
- macOS 12+ / Windows 10+ / Linux

> **Note:** Intel Mac (darwin-x64) は非サポート。Apple Silicon (arm64) のみ対応。

## Architecture

```
src/
├── main.ts                       # Plugin entry point
├── types.ts                      # Type definitions
├── constants.ts                  # Constants & defaults
├── core/
│   ├── electron-bridge.ts        # node-pty dynamic loading
│   ├── shell-detector.ts         # OS-specific shell detection
│   ├── pty-manager.ts            # PTY process management
│   ├── session-manager.ts        # Session lifecycle
│   └── logger.ts                 # Logging utility
├── ui/
│   ├── terminal-view.ts          # Obsidian ItemView (integration hub)
│   ├── terminal-renderer.ts      # xterm.js wrapper
│   ├── theme-manager.ts          # Theme sync & custom themes
│   ├── focus-manager.ts          # Focus state management
│   ├── keybinding-handler.ts     # Key event routing
│   ├── search-bar.ts             # In-terminal search UI
│   ├── consent-dialog.ts         # First-run security consent
│   └── error-display.ts          # Error UI with retry
├── settings/
│   ├── settings-tab.ts           # Obsidian PluginSettingTab
│   ├── settings-data.ts          # Load/save persistence
│   └── profile-manager.ts        # Shell profile CRUD
└── integration/
    └── obsidian-commands.ts       # Command palette registration
```

## Tech Stack

- [xterm.js](https://xtermjs.org/) v5.x — ターミナルエミュレータ
- [node-pty](https://github.com/microsoft/node-pty) — PTYプロセス管理
- TypeScript (strict) + esbuild
- vitest — テストフレームワーク (300+ tests)

## Development

```bash
# 依存インストール
npm install

# ビルド
npm run build

# 開発モード（ウォッチ）
npm run dev

# テスト実行
npm run test

# テスト（ウォッチモード）
npm run test:watch
```

## License

MIT
