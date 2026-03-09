# Obsidian Terminal

Obsidian内にVSCode風の統合ターミナルを提供するコミュニティプラグイン。

OSネイティブシェルを直接実行し、AIコーディングエージェント（Claude Code / Codex CLI / Gemini CLI）の快適な操作を第一級でサポートする。

## Features

- **ネイティブシェル統合** — node-pty + xterm.jsによる完全なターミナルエミュレーション
- **AIエージェント対応** — Shift+Enter、TUIレンダリング、大量出力のフロー制御を設計段階からサポート
- **Obsidian連携** — コードブロック実行、出力キャプチャ、D&D連携（v1.1〜）
- **クロスプラットフォーム** — Windows (x64/arm64)、macOS (Apple Silicon)、Linux (x64/arm64)

## Status

**設計フェーズ** — 仕様書は [`spec/SPEC.md`](spec/SPEC.md) を参照。

### Roadmap

| バージョン | スコープ |
|-----------|---------|
| **v1.0** | 単一ターミナル + AIエージェント対応（4–5週間） |
| v1.1 | タブ管理、コードブロック実行、D&D、出力コピー |
| v1.2+ | セッション復元、分割ペイン、SSH接続 |

## Requirements

- Obsidian v1.5.0+（デスクトップ版のみ）
- macOS 12+ / Windows 10+ / Linux

> **Note:** Intel Mac (darwin-x64) は非サポート。Apple Silicon (arm64) のみ対応。

## Tech Stack

- [xterm.js](https://xtermjs.org/) v5.x — ターミナルエミュレータ
- [node-pty](https://github.com/microsoft/node-pty) — PTYプロセス管理
- TypeScript + esbuild

## Development

```bash
# 依存インストール
npm install

# ビルド
npm run build

# 開発モード（ウォッチ）
npm run dev
```

## License

TBD
