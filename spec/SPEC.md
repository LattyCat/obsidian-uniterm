# Obsidian Terminal Plugin 仕様書

**プラグイン名:** Obsidian Terminal (仮称)
**バージョン:** v1.0.0
**最終更新:** 2026-03-09
**ステータス:** 設計フェーズ

---

## 1. 概要

### 1.1 プロダクトビジョン

Obsidian内にVSCode風の統合ターミナルを提供するコミュニティプラグイン。OSネイティブシェルを直接実行し、複数タブによる並行作業、AIコーディングエージェント（Claude Code / Codex CLI / Gemini CLI）の快適な操作、そしてObsidianワークスペースとのシームレスな連携を実現する。

### 1.2 既存プラグインとの差別化

現在コミュニティには複数のターミナルプラグインが存在する（polyipseity/obsidian-terminal、O-Terminal、obsidian-terminal-sidebar等）。本プラグインは以下の点で差別化を図る。

| 観点 | 既存プラグインの課題 | 本プラグインのアプローチ |
|------|---------------------|------------------------|
| AIエージェント対応 | 後付け対応・Shift+Enter問題等 | 設計段階からTUI/AIエージェントを第一級サポート |
| セットアップ | Python依存・手動ビルド必要な場合あり | node-ptyプリビルドバイナリで依存最小化 |
| Obsidian連携 | 限定的（主にファイルパス挿入程度） | コードブロック実行・出力キャプチャ・D&D連携 |
| UI/UX | テーマ設定がJSON直編集 | GUIベースのテーマ・フォント設定 |

### 1.3 対応プラットフォーム

- **Windows** 10/11（PowerShell / cmd.exe / WSL bash）
- **macOS** 12+（zsh / bash）
- **Linux** 主要ディストリビューション（bash / zsh / fish）
- **デスクトップ専用**（`isDesktopOnly: true`）

---

## 2. アーキテクチャ

### 2.1 技術スタック

```
┌─────────────────────────────────────────────┐
│  Obsidian Plugin Layer (TypeScript)         │
│  ┌───────────────────────────────────────┐  │
│  │  UI Layer                             │  │
│  │  - TerminalView (ItemView)            │  │
│  │  - TabManager                         │  │
│  │  - SettingsTab                        │  │
│  │  - CommandPalette Integration         │  │
│  └──────────────┬────────────────────────┘  │
│                 │                            │
│  ┌──────────────▼────────────────────────┐  │
│  │  Terminal Emulator                    │  │
│  │  - @xterm/xterm (v5.x)               │  │
│  │  - @xterm/addon-fit                   │  │
│  │  - @xterm/addon-web-links             │  │
│  │  - @xterm/addon-search                │  │
│  │  - @xterm/addon-webgl (optional)      │  │
│  │  - @xterm/addon-unicode11             │  │
│  └──────────────┬────────────────────────┘  │
│                 │                            │
│  ┌──────────────▼────────────────────────┐  │
│  │  PTY Manager                          │  │
│  │  - node-pty (プリビルドバイナリ)        │  │
│  │  - SessionManager                     │  │
│  │  - ShellDetector (OS別シェル自動検出)   │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  Build: esbuild + prebuild-install          │
└─────────────────────────────────────────────┘
```

#### 2.1.1 electron-bridge.ts の責務

`electron-bridge.ts` はElectronネイティブモジュールへのアクセスを抽象化するレイヤーである。

- **現在の前提:** ObsidianはElectronの `nodeIntegration: true` 環境で動作しており、`require('node-pty')` を直接呼び出し可能
- **責務:**
  - node-ptyモジュールの動的ロードとキャッシュ
  - Electron APIへのアクセス（`remote`、`shell`等）
  - プラットフォーム判定とバイナリパス解決
- **将来のサンドボックス化対応:** ObsidianがCSP強化やサンドボックス化を進めた場合、このレイヤーのみを修正してIPC経由のアクセスに切り替える。プラグインの他のコードはこの抽象レイヤーを通じてのみネイティブモジュールにアクセスする

#### 2.1.2 node-ptyバイナリ配布戦略

- **方式:** 全対応プラットフォームのプリビルドバイナリをプラグインに同梱
- **推定サイズ:** 2–3MB（全プラットフォーム合計）
- **ロード時の動作:** `electron-bridge.ts` がランタイムで `process.platform` + `process.arch` を判定し、適切なバイナリをロード
- **ビルドCI:** GitHub Actionsで各プラットフォーム向けバイナリを自動ビルド（ObsidianのElectronバージョンに合わせた `electron-rebuild`）
- **バージョン管理:** Obsidianのメジャーアップデート（Electronバージョン変更）時にバイナリの再ビルドが必要。`versions.json` でObsidianバージョンとの対応を管理

#### 2.1.3 下部パネルの実装戦略

- **方式:** `WorkspaceLeaf` のhorizontal splitを利用し、ワークスペース下部にターミナルビューを配置
- **パネル高さ制御:** CSS `flex-basis` + `resize` でドラッグリサイズを実現
- **CSSクラス:** `.terminal-panel` をルートコンテナに付与し、Obsidianテーマとの干渉を最小化
- **表示/非表示:** `leaf.detach()` / `workspace.getLeaf('split')` によるトグル（DOMの追加/削除で完全にアンマウント）
```

### 2.2 ターミナルエミュレータ選定：xterm.js

**選定理由:**

- VSCodeと同じ基盤で実績が豊富
- 16Mカラー、Unicode、リガチャ、WebGLレンダリング対応
- node-ptyとの組み合わせが標準的
- 既存Obsidianプラグインでも採用実績があり、Electron環境との互換性が実証済み
- アドオンエコシステムが充実（検索、リンク検出、フィット調整など）

### 2.3 ディレクトリ構成

```
obsidian-terminal/
├── src/
│   ├── main.ts                  # Plugin エントリポイント
│   ├── constants.ts             # 定数定義
│   ├── types.ts                 # 型定義
│   ├── core/
│   │   ├── pty-manager.ts       # PTYプロセス管理
│   │   ├── session-manager.ts   # セッションのライフサイクル管理
│   │   ├── shell-detector.ts    # OS別シェル自動検出
│   │   └── electron-bridge.ts   # Electronネイティブモジュール連携
│   ├── ui/
│   │   ├── terminal-view.ts     # メインのItemView
│   │   ├── tab-manager.ts       # タブ管理UI
│   │   ├── terminal-renderer.ts # xterm.jsラッパー
│   │   ├── theme-manager.ts     # テーマ管理
│   │   └── drag-drop.ts         # D&Dハンドラ
│   ├── integration/
│   │   ├── obsidian-commands.ts  # コマンドパレット登録
│   │   ├── codeblock-runner.ts   # コードブロック実行
│   │   ├── output-capture.ts     # 出力→ノートコピー
│   │   └── ribbon-actions.ts     # リボンアイコン
│   └── settings/
│       ├── settings-tab.ts       # 設定画面
│       ├── settings-data.ts      # 設定データ型
│       └── profile-manager.ts    # シェルプロファイル管理
├── styles/
│   └── terminal.css              # プラグインCSS
├── prebuild/                     # node-ptyプリビルドバイナリ
├── esbuild.config.mjs
├── manifest.json
├── package.json
├── tsconfig.json
└── versions.json
```

---

## 2.A エラーハンドリング仕様

### 2.A.1 node-pty読み込み失敗

- **原因例:** バイナリ不一致、未対応プラットフォーム、ファイル破損
- **挙動:**
  1. ターミナルビュー上にエラーメッセージを表示（「ターミナルバックエンドの初期化に失敗しました」）
  2. 再試行ボタンとトラブルシューティングガイドへのリンクを表示
  3. プラグイン自体は正常にロードされ、設定画面等は引き続き利用可能
- **ログ:** `console.error` で詳細なスタックトレースとプラットフォーム情報を出力

### 2.A.2 シェル起動失敗

- **原因例:** シェルパスが不正、権限不足、シェルが未インストール
- **挙動:**
  1. 該当タブにエラーメッセージを表示（「シェルの起動に失敗しました: {パス}」）
  2. デフォルトシェルへのフォールバックを試行
  3. フォールバックも失敗した場合、シェル選択モーダルを表示
- **ログ:** `console.warn` でシェルパス、引数、エラー内容を出力

### 2.A.3 WebGL初期化失敗

- **原因例:** GPU非対応、ドライバ問題、WebGLコンテキスト喪失
- **挙動:**
  1. 自動的にCanvasレンダラーにフォールバック
  2. 設定画面のWebGLトグルを自動でOFFに更新
  3. ユーザーへの通知（Obsidian Notice、5秒間表示）：「WebGLレンダラーが利用できないため、Canvasレンダラーに切り替えました」
- **ログ:** `console.warn` でWebGLエラー詳細を出力

### 2.A.4 ログ出力方針

- **出力先:** Obsidianの開発者コンソール（`Ctrl+Shift+I`）
- **レベル:**
  - `console.error`: 致命的エラー（PTY初期化失敗、セッション異常終了）
  - `console.warn`: 回復可能なエラー（WebGLフォールバック、シェルフォールバック）
  - `console.info`: 重要なライフサイクルイベント（セッション作成/破棄、プラグインロード/アンロード）
  - `console.debug`: 詳細デバッグ情報（データフロー、リサイズイベント）— デフォルト無効、設定で有効化
- **フォーマット:** `[obsidian-terminal] {レベル}: {メッセージ}` のプレフィックス付き

---

## 2.B セッションライフサイクル管理

### 2.B.1 セッション状態遷移

```
[作成] → [初期化中] → [稼働中] → [シャットダウン中] → [破棄済み]
                          │              ▲
                          │              │
                          └──(異常終了)──┘
```

### 2.B.2 セッション作成フロー

1. `SessionManager.create(profile)` を呼び出し
2. `electron-bridge.ts` 経由でnode-ptyをロード
3. `PtyManager.spawn()` でPTYプロセスを生成
4. xterm.js `Terminal` インスタンスを作成しDOMにマウント
5. PTYの `onData` → xterm.js `write` のパイプを接続
6. xterm.jsの `onData` → PTYの `write` のパイプを接続
7. アドオン（fit、web-links、search、WebGL/Canvas）をロード
8. セッション状態を「稼働中」に遷移

### 2.B.3 Graceful Shutdown手順

タブを閉じる、またはプラグインアンロード時の手順:

1. **SIGTERM送信:** PTYプロセスに `SIGTERM` を送信（Windowsでは `ptyProcess.kill()`）
2. **タイムアウト待機:** 最大3秒間、プロセス終了を待機
3. **SIGKILL送信:** タイムアウト後もプロセスが生存していれば `SIGKILL` を送信
4. **PTY dispose:** `ptyProcess.dispose()` でPTYリソースを解放
5. **xterm.js dispose:** `terminal.dispose()` でターミナルインスタンスを破棄
6. **リスナー解除:** 全イベントリスナー（`onData`、`onResize`、`ResizeObserver` 等）を解除
7. **DOM除去:** ターミナルコンテナ要素をDOMから削除
8. **セッション状態を「破棄済み」に遷移**

### 2.B.4 異常終了ハンドリング

- PTYプロセスが予期せず終了した場合（`onExit` イベント）:
  1. タブにメッセージ表示:「プロセスが終了しました (exit code: {code})」
  2. 「再起動」ボタンを表示（同じプロファイルで新しいセッションを作成）
  3. xterm.jsインスタンスは出力確認のため即座に破棄しない（ユーザーがタブを閉じるまで保持）

---

## 3. 機能仕様

### 3.1 コアターミナル機能

#### 3.1.1 シェル起動

- Vault のルートディレクトリを既定の作業ディレクトリ（`cwd`）とする
- OS判定による既定シェル自動検出:
  - **Windows:** `powershell.exe`（PowerShell 5+）→ フォールバック `cmd.exe`
  - **macOS:** ユーザーの既定シェル（`$SHELL`、通常 `zsh`）
  - **Linux:** ユーザーの既定シェル（`$SHELL`、通常 `bash`）
- 環境変数はシステムの環境を継承（`process.env`）
- 追加環境変数の設定をサポート（設定画面から）

#### 3.1.2 ターミナルエミュレーション

- **xterm.js** による完全なVT100/xterm互換エミュレーション
- 256色 + TrueColor（16Mカラー）対応
- Unicode 11対応（CJK文字幅の正しい処理）
- マウスイベント転送（TUIアプリ対応）
- ブラケットペーストモード対応
- 選択範囲のコピー＆ペースト
- URLの自動検出とクリック可能リンク
- ターミナル内テキスト検索（Ctrl+Shift+F）

#### 3.1.3 AIエージェント対応（重点機能）

Claude Code、Codex CLI、Gemini CLI等のAIコーディングエージェントは対話的なTUIを使用するため、以下を特別に考慮する。

- **Shift+Enter対応:** デフォルトで `\x1b\r`（ESC+CR）シーケンスを送信（Claude Codeが期待する動作）。このシーケンスは設定画面で変更可能（例: `\n` への変更等、エージェントツールごとに異なる要件に対応）
- **大量出力のパフォーマンス:** WebGLレンダラー優先使用。WebGL初期化失敗時はCanvasレンダラーに自動フォールバック（セクション2.A.3参照）
- **大量出力時のフロー制御:** xterm.jsの `onWriteParsed` コールバックを利用し、レンダリング完了を待ってから次のデータチャンクを書き込む。これにより、AIエージェントの大量出力時にUIスレッドのブロッキングを防止
- **長時間セッション安定性:** メモリリーク防止のためのスクロールバックバッファ上限設定（デフォルト: 10,000行、設定変更可）
- **インタラクティブUI要素:** チェックボックス、プログレスバー等のTUI要素の正しいレンダリング
- **環境変数プリセット:** AI CLIツール用の環境変数をプロファイルとして保存可能

**AIエージェント「対応完了」の最低条件チェックリスト:**

1. [ ] Claude Codeの起動・対話・Shift+Enterによる改行が正常動作すること
2. [ ] TUI要素（ボックス描画文字、プログレスバー、チェックボックス）が正しくレンダリングされること
3. [ ] 1000行以上の一括出力でフレーム落ちが発生しないこと（WebGLレンダラー使用時）
4. [ ] 8時間以上の連続セッションでメモリ使用量が単調増加しないこと
5. [ ] Ctrl+Cによるエージェント中断が即座に反映されること
6. [ ] マウスイベント（クリック、スクロール）がTUIに正しく転送されること

### 3.2 タブ管理

#### 3.2.1 タブUI

```
┌──────────────────────────────────────────────────┐
│ [+ ] [bash: ~/vault ▼] [claude-code ▼] [zsh ▼]  │  ← タブバー
│──────────────────────────────────────────────────│
│                                                  │
│  $ claude                                        │
│  ╭──────────────────────────────────────────╮    │
│  │ Welcome to Claude Code v1.x              │    │
│  │                                          │    │
│  │ > What would you like to work on?        │    │
│  ╰──────────────────────────────────────────╯    │
│                                                  │
│  > _                                             │
│                                                  │
└──────────────────────────────────────────────────┘
```

- 新規タブボタン（`+`）でタブ追加
- タブごとに独立したPTYセッション
- タブ名の自動設定（シェル名 + cwd）とカスタムリネーム
- タブの並べ替え（ドラッグ）
- タブのコンテキストメニュー: リネーム / 複製 / 閉じる / 他を全て閉じる
- アクティブタブのインジケータ表示
- タブ上での実行中プロセス表示（プロセス名を取得可能な場合）

#### 3.2.2 セッション管理

- 最大タブ数: 設定可能（デフォルト: 10）
- タブを閉じる際に実行中プロセスがあれば確認ダイアログ
- Obsidian再起動時のセッション復元はスコープ外（将来対応）

### 3.3 表示位置・レイアウト

#### 3.3.1 下部パネル（メインUI）

- Obsidianワークスペースの下部にパネルとして表示
- パネル高さのドラッグリサイズ対応
- パネルの最小高さ: 100px、最大高さ: ウィンドウの80%
- パネル高さの記憶（設定に保存）
- パネルの表示/非表示トグル

#### 3.3.2 xterm.jsのフィット処理

- `@xterm/addon-fit` によるコンテナサイズへの自動追従
- Obsidianのサイドバー開閉、ウィンドウリサイズ時の自動再フィット
- `ResizeObserver` によるコンテナサイズ変更検知
- PTYへのリサイズ通知（`ptyProcess.resize(cols, rows)`）

### 3.4 Obsidian連携機能

#### 3.4.1 コマンドパレット統合

以下のコマンドを `Ctrl+P` のコマンドパレットから実行可能にする:

| コマンドID | コマンド名 | 説明 |
|-----------|-----------|------|
| `terminal:toggle` | ターミナルの表示/非表示 | パネルのトグル |
| `terminal:new-tab` | 新しいターミナルタブ | デフォルトシェルで新規タブ |
| `terminal:new-tab-profile` | プロファイルを選択して新規タブ | プロファイル選択モーダルを表示 |
| `terminal:close-tab` | 現在のタブを閉じる | アクティブタブを閉じる |
| `terminal:next-tab` | 次のタブへ移動 | 右のタブに切り替え |
| `terminal:prev-tab` | 前のタブへ移動 | 左のタブに切り替え |
| `terminal:focus` | ターミナルにフォーカス | ターミナルにフォーカス移動 |
| `terminal:unfocus` | ターミナルからフォーカス解除 | エディタにフォーカスを戻す |
| `terminal:clear` | ターミナルをクリア | 画面クリア |
| `terminal:find` | ターミナル内検索 | 検索バー表示 |
| `terminal:copy-output` | 出力をノートに保存 | 選択範囲/全出力をノートへ |
| `terminal:run-codeblock` | コードブロックを実行 | カーソル位置のコードブロックを実行 |

#### 3.4.2 リボンアイコン

- 左サイドバーにターミナルアイコン（`lucide: terminal`）を表示
- クリックでターミナルパネルのトグル
- 右クリックでプロファイル選択メニュー

#### 3.4.3 ターミナル出力 → Obsidianノートへのコピー

**操作フロー:**

1. ターミナル上でテキストを選択（またはコマンドで全出力を対象）
2. コマンドパレット or 右クリックメニューで「出力をノートに保存」
3. 保存先の選択:
   - **現在のノートに挿入** — カーソル位置にコードブロックとして挿入
   - **新規ノートとして作成** — 設定で指定したフォルダに新規ノート
   - **クリップボードにコピー** — プレーンテキストとしてコピー

**挿入フォーマット例:**

````markdown
```bash
$ git status
On branch main
Your branch is up to date with 'origin/main'.

Changes not staged for commit:
  modified:   src/main.ts
```
````

#### 3.4.4 コードブロック実行

Obsidianノート内のコードブロックをターミナルで実行する機能。

**対応するコードブロック言語と実行方式:**

| 言語タグ | 実行方式 | 説明 |
|---------|---------|------|
| `bash` / `sh` / `shell` / `zsh` | 直接送信 | コードをそのままシェルに送信（ブラケットペーストモード使用） |
| `powershell` / `pwsh` | ヒアストリング方式 | `@'\n{code}\n'@ | Invoke-Expression` で送信 |
| `python` / `python3` | ヒアドキュメント方式 | `python3 -c '{escaped_code}'` または `python3 << 'OBSIDIAN_EOF'\n{code}\nOBSIDIAN_EOF` |
| `node` / `javascript` | ヒアドキュメント方式 | `node << 'OBSIDIAN_EOF'\n{code}\nOBSIDIAN_EOF` |

**実行方法:**

1. コードブロックにカーソルを置く
2. コマンドパレットで「コードブロックを実行」
3. 確認ダイアログに**実行内容のプレビュー**（最初の10行 + 言語タグ + 行数）を表示
4. 承認後、アクティブなターミナルタブにコマンドが送信される（ターミナルが未起動の場合は自動起動）

**安全対策:**

- 実行前に確認ダイアログを表示（設定で無効化可能）。ダイアログには実行対象コードのプレビューを含む
- 複数行コマンドは言語タグに応じた安全な送信方式を使用（上表参照）
- shell系言語の直接送信時はブラケットペーストモードを利用

#### 3.4.5 ドラッグ＆ドロップ連携

- Obsidianのファイルエクスプローラからターミナルへファイル/フォルダをドラッグ
- ドロップ時にファイルの絶対パスをシェルに応じたエスケープ処理付きで挿入

**シェルごとのエスケープ処理:**

| シェル | エスケープ方式 | 例 |
|-------|-------------|---|
| POSIX系（bash/zsh/fish） | シングルクォート + 内部の `'` を `'\''` に置換 | `'/path/to/my file.md'` |
| PowerShell | ダブルクォート + 内部の `"` を `` `" `` に置換 | `"/path/to/my file.md"` |
| cmd.exe | ダブルクォート（エスケープなし） | `"/path/to/my file.md"` |

- 現在アクティブなセッションのシェル種別を `ShellDetector` から取得し、適切なエスケープを適用

---

## 4. 設定仕様

### 4.1 設定画面構成

設定画面は Obsidian の `PluginSettingTab` として実装し、以下のセクションに分ける。

#### 4.1.1 一般設定

| 設定項目 | 型 | デフォルト値 | 説明 |
|---------|---|------------|------|
| デフォルトシェル | dropdown | (OS自動検出) | 新規タブで起動するシェル |
| デフォルト作業ディレクトリ | text | Vault ルート | 新規タブの初期ディレクトリ |
| 最大タブ数 | number | 10 | 同時に開けるタブの上限 |
| 起動時に自動表示 | toggle | false | Obsidian起動時にパネルを表示 |
| コードブロック実行前に確認 | toggle | true | 実行前の確認ダイアログ |
| スクロールバックバッファ | number | 10000 | 保持する最大行数 |

#### 4.1.2 外観設定

| 設定項目 | 型 | デフォルト値 | 説明 |
|---------|---|------------|------|
| フォントファミリー | text | `'Menlo, Monaco, Consolas, monospace'` | ターミナルフォント |
| フォントサイズ | slider | 14 (px) | 12–24の範囲 |
| 行の高さ | slider | 1.2 | 1.0–2.0の範囲 |
| カーソルスタイル | dropdown | `block` | `block` / `underline` / `bar` |
| カーソル点滅 | toggle | true | カーソルのブリンク |
| テーマ | dropdown | Obsidian同期 | Obsidian同期 / ダーク / ライト / カスタム |
| WebGLレンダラー | toggle | true | WebGL使用（無効時はCanvasフォールバック） |

#### 4.1.3 テーマカラー設定

「カスタム」テーマ選択時に表示されるカラーピッカー。

| カラー項目 | デフォルト（ダーク） | 説明 |
|-----------|-------------------|------|
| 背景色 | `#1e1e1e` | ターミナル背景 |
| 前景色 | `#d4d4d4` | テキスト色 |
| カーソル色 | `#ffffff` | カーソル色 |
| 選択色 | `#264f78` | 選択範囲の背景色 |
| ANSI 0–15 | xterm標準 | 16色ANSIカラーパレット |

**Obsidian同期モード:**

Obsidianのテーマ（ダーク/ライト）に連動し、CSS変数からカラーを自動取得する。

```typescript
// Obsidianのテーマ状態を監視
this.registerEvent(
  this.app.workspace.on('css-change', () => {
    this.themeManager.syncWithObsidian();
  })
);
```

#### 4.1.4 シェルプロファイル

複数のシェルプロファイルを定義し、タブ作成時に選択できる。

```typescript
interface ShellProfile {
  id: string;
  name: string;           // 表示名（例: "Claude Code"）
  shellPath: string;       // シェル実行パス
  shellArgs: string[];     // 起動引数
  cwd: string;             // 作業ディレクトリ（空欄でVaultルート）
  icon: string;            // Lucide アイコン名
}
```

> **注意:** v1.0では環境変数の設定UIは提供しない。追加の環境変数が必要な場合は、以下の方法で設定すること:
> - シェルのrcファイル（`.bashrc`、`.zshrc`等）で `export` する
> - プロジェクトルートの `.env` ファイルに定義し、`source .env` や `direnv` 等で読み込む
>
> **⚠ セキュリティ警告:** プロファイルの環境変数にAPIキーやトークンを直接保存した場合、Vaultの `.obsidian/plugins/obsidian-terminal/data.json` にプレーンテキストで保存される。機密情報は必ず `.env` ファイルやシステムのキーチェーン経由で管理すること。

**プリセットプロファイル例:**

| プロファイル名 | shellPath | shellArgs | 用途 |
|-------------|-----------|-----------|------|
| Default Shell | (自動検出) | [] | 汎用 |
| Claude Code | (自動検出) | ['-c', 'claude'] | Claude Code起動 |
| Codex CLI | (自動検出) | ['-c', 'codex'] | OpenAI Codex起動 |
| Gemini CLI | (自動検出) | ['-c', 'gemini'] | Gemini CLI起動 |
| Git | (自動検出) | [] | Git操作用 |

### 4.2 キーバインド

#### 4.2.1 グローバルホットキー（Obsidian側）

Obsidianのホットキー設定画面で変更可能。

| アクション | デフォルトキー | 説明 |
|-----------|-------------|------|
| ターミナル表示/非表示 | `Ctrl+`` ` | パネルトグル |
| 新規タブ | `Ctrl+Shift+`` ` | 新しいタブを開く |
| ターミナルにフォーカス | (未割当) | フォーカス移動 |

#### 4.2.2 ターミナルフォーカス中のキーバインド

ターミナルにフォーカスがある間、Obsidian側のホットキーは無効化され、以下のプラグイン独自キーバインドのみ動作する。

| アクション | Windows/Linux | macOS |
|-----------|--------------|-------|
| ターミナル内検索 | `Ctrl+Shift+F` | `Cmd+Shift+F` |
| ターミナルクリア | `Ctrl+Shift+K` | `Cmd+Shift+K` |
| タブを閉じる | `Ctrl+Shift+W` | `Cmd+Shift+W` |
| 次のタブ | `Ctrl+Shift+]` | `Cmd+Shift+]` |
| 前のタブ | `Ctrl+Shift+[` | `Cmd+Shift+[` |
| フォーカス解除 | `Ctrl+Escape` | `Ctrl+Escape` |
| コピー | `Ctrl+Shift+C` | `Cmd+C` |
| ペースト | `Ctrl+Shift+V` | `Cmd+V` |

> **注:** フォーカス解除は `Escape` 2回押しでも動作する（オプション、設定で有効化）。デフォルトは `Ctrl+Escape` の単一押下。

#### 4.2.3 キーイベント伝搬ルール

ターミナルフォーカス中のキーイベントは以下の優先順位で処理される:

| 修飾キーパターン | 送信先 | 例 |
|---------------|-------|---|
| `Cmd+*`（macOS） | OS / Obsidian | `Cmd+Q`（終了）、`Cmd+,`（設定） |
| `Ctrl+Shift+*` | プラグイン | `Ctrl+Shift+F`（検索）、`Ctrl+Shift+C`（コピー） |
| `Ctrl+*` | シェル（PTY） | `Ctrl+C`（中断）、`Ctrl+L`（クリア） |
| 修飾キーなし | シェル（PTY） | 通常の文字入力 |

**例外リスト（設定で変更可能）:**

以下のキーバインドは上記ルールの例外として、ターミナルフォーカス中でもObsidian側に転送される:

- `Ctrl+P`: コマンドパレット（デフォルトで例外リストに含む）

ユーザーは設定画面で例外リストにキーバインドを追加/削除できる。

---

## 5. 実装詳細

### 5.1 プラグインエントリポイント

```typescript
// src/main.ts（概要）
import { Plugin, WorkspaceLeaf } from 'obsidian';

export default class TerminalPlugin extends Plugin {
  settings: TerminalSettings;
  ptyManager: PtyManager;
  sessionManager: SessionManager;
  themeManager: ThemeManager;

  async onload() {
    await this.loadSettings();

    // ビューの登録
    this.registerView(
      TERMINAL_VIEW_TYPE,
      (leaf) => new TerminalView(leaf, this)
    );

    // コマンド登録
    this.registerCommands();

    // リボンアイコン
    this.addRibbonIcon('terminal', 'ターミナルを開く', () => {
      this.toggleTerminalPanel();
    });

    // 設定タブ
    this.addSettingTab(new TerminalSettingTab(this.app, this));

    // テーマ変更監視
    this.registerEvent(
      this.app.workspace.on('css-change', () => {
        this.themeManager.syncWithObsidian();
      })
    );
  }

  async onunload() {
    // 全PTYセッションのクリーンシャットダウン
    await this.sessionManager.destroyAll();
  }
}
```

### 5.2 PTY管理

```typescript
// src/core/pty-manager.ts（概要）
import * as pty from 'node-pty';

export class PtyManager {
  spawn(profile: ShellProfile, cols: number, rows: number): pty.IPty {
    const shell = profile.shellPath || this.detectDefaultShell();
    const args = profile.shellArgs || [];
    const cwd = profile.cwd || this.getVaultPath();

    const env = {
      ...process.env,
      ...profile.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
    };

    return pty.spawn(shell, args, {
      name: 'xterm-256color',
      cols,
      rows,
      cwd,
      env,
    });
  }

  private detectDefaultShell(): string {
    if (process.platform === 'win32') {
      return 'powershell.exe';
    }
    return process.env.SHELL || '/bin/bash';
  }
}
```

### 5.3 node-pty ネイティブモジュールの取り扱い

node-ptyはC++ネイティブアドオンであるため、Electronバージョンとの互換性が必要。

**ビルド戦略:**

1. `electron-rebuild` でObsidianのElectronバージョン向けにリビルド
2. `prebuild-install` で主要プラットフォーム用プリビルドバイナリを同梱
3. フォールバックとして `node-gyp` による手動ビルドガイドを用意

```json
// package.json（関連部分）
{
  "scripts": {
    "rebuild:electron": "electron-rebuild -f -w node-pty",
    "prebuild": "prebuild -t electron -r electron --strip",
    "postinstall": "prebuild-install -r electron || electron-rebuild -f -w node-pty"
  }
}
```

**対応アーキテクチャ:**

| OS | アーキテクチャ |
|----|-------------|
| Windows | x64, arm64 |
| macOS | arm64 (Apple Silicon) |
| Linux | x64, arm64 |

### 5.4 フォーカス管理

ターミナルフォーカス中のキーイベント制御は、Obsidianプラグインにおける重要な実装ポイント。

```typescript
// フォーカス状態管理
class FocusManager {
  private isTerminalFocused = false;
  private previousActiveLeaf: WorkspaceLeaf | null = null;

  focus(terminal: Terminal) {
    this.previousActiveLeaf = this.app.workspace.activeLeaf;
    this.isTerminalFocused = true;
    terminal.focus();
    // Obsidianのキーハンドラを一時的に抑制
    document.body.classList.add('terminal-focused');
  }

  unfocus() {
    this.isTerminalFocused = false;
    document.body.classList.remove('terminal-focused');
    // 前のペインにフォーカスを戻す
    if (this.previousActiveLeaf) {
      this.app.workspace.setActiveLeaf(this.previousActiveLeaf);
    }
  }
}
```

```css
/* ターミナルフォーカス中にObsidianのキーハンドラを抑制 */
body.terminal-focused .workspace-leaf:not(.terminal-leaf) {
  pointer-events: none;
}
```

**キーイベント伝搬制御:**

CSSの `pointer-events` に加え、xterm.jsの `attachCustomKeyEventHandler` を使用してキーイベントの伝搬を制御する:

```typescript
// xterm.jsのキーイベントハンドラ
terminal.attachCustomKeyEventHandler((event: KeyboardEvent): boolean => {
  // Cmd+* はObsidian/OSに転送（macOS）
  if (event.metaKey) return false;

  // 例外リスト（設定で変更可能）のキーはObsidianに転送
  if (this.isInPassthroughList(event)) return false;

  // Ctrl+Shift+* はプラグインが処理
  if (event.ctrlKey && event.shiftKey) {
    this.handlePluginKeybind(event);
    return false;
  }

  // Ctrl+Escape でフォーカス解除
  if (event.ctrlKey && event.key === 'Escape') {
    this.focusManager.unfocus();
    return false;
  }

  // それ以外はシェルに送信
  return true;
});
```

**キーバインドホワイトリスト設定:**

設定画面で「Obsidianに転送するキーバインド」のリストを管理できる。これにより、ユーザーが特定のObsidianホットキーをターミナルフォーカス中でも利用可能にできる。

---

## 6. データフロー

### 6.1 キー入力 → シェル実行 → 画面表示

```
ユーザーキー入力
    │
    ▼
xterm.js (onData)
    │
    ▼ データ書き込み
node-pty (ptyProcess.write)
    │
    ▼ シェルが処理
OS Shell (bash/zsh/PowerShell)
    │
    ▼ 出力データ
node-pty (onData callback)
    │
    ▼ ターミナルへ書き込み
xterm.js (terminal.write)
    │
    ▼
画面レンダリング (WebGL/Canvas)
```

### 6.2 コードブロック実行フロー

```
エディタ上のコードブロック
    │
    ▼ コマンド発火
codeblock-runner.ts
    │ コードブロック内容を抽出
    │ 言語タグからシェルを判定
    ▼
確認ダイアログ（設定による）
    │
    ▼ 承認
アクティブターミナルタブ or 新規タブ起動
    │
    ▼ ブラケットペーストモードで送信
pty に書き込み (\x1b[200~ ... \x1b[201~)
    │
    ▼
シェルが実行
```

---

## 7. セキュリティ考慮事項

### 7.1 Electron環境固有のリスク

- **nodeIntegration前提:** 本プラグインはObsidianの `nodeIntegration: true` 環境に依存する。これにより `require('node-pty')` の直接呼び出しが可能だが、この前提が将来変更される可能性がある
- **サンドボックス化リスク:** ObsidianがCSP強化やElectronのサンドボックスモードを導入した場合、node-ptyへの直接アクセスが制限される。このリスクに対しては `electron-bridge.ts` の抽象レイヤーで対応する（セクション2.1.1参照）
- プラグインの `manifest.json` に `isDesktopOnly: true` を明記

### 7.2 初回有効化時の同意ダイアログ

プラグインを初めて有効化した際に、以下の内容を含む同意ダイアログを表示する:

- 本プラグインがOSのシェルを直接実行すること
- ユーザーのシステム権限と同等の操作が可能であること
- プラグインが悪意のあるコードの実行を防ぐものではないこと
- 「理解して有効化する」ボタンで同意後に初めてターミナル機能が利用可能になる

### 7.3 環境変数

- APIキーやトークンをプロファイルの環境変数に保存する場合、設定データはVaultの `.obsidian/plugins/` 内にプレーンテキストで保存されることをユーザーに明示
- 機密情報は `.env` ファイル経由での読み込みを推奨

### 7.4 コードブロック実行の安全策

- **プレビュー付き確認ダイアログ**（デフォルト有効）: 実行対象のコード内容（最初の10行 + 総行数）をダイアログ内に表示し、ユーザーが実行内容を確認してから承認
- 実行対象言語のホワイトリスト制限
- 外部ノート（共有Vault等）からの実行時は追加警告

---

## 8. パフォーマンス要件

| 項目 | 目標値 |
|------|-------|
| ターミナル起動時間 | < 500ms |
| キー入力→表示の遅延 | < 16ms (60fps) |
| メモリ使用量（タブあたり） | < 50MB |
| 大量出力時（一括） | 1万行の一括出力でフレーム落ちなし（WebGLレンダラー時） |
| 大量出力時（累積） | スクロールバックバッファ10万行到達後もパフォーマンス劣化なし |
| パネルリサイズ | < 100ms でリフィット完了 |
| Obsidian起動への影響 | < 200ms 追加 |

**フロー制御メカニズム:**

大量出力時のUIスレッドブロッキングを防止するため、`onWriteParsed` ベースのフロー制御を実装する:

```typescript
// PTY → xterm.js のフロー制御
ptyProcess.onData((data: string) => {
  // データをチャンクバッファに追加
  this.writeBuffer.push(data);

  if (!this.isWriting) {
    this.processWriteBuffer();
  }
});

private processWriteBuffer() {
  if (this.writeBuffer.length === 0) {
    this.isWriting = false;
    return;
  }

  this.isWriting = true;
  const chunk = this.writeBuffer.shift()!;

  // write() 後、レンダリング完了を待ってから次のチャンクを処理
  this.terminal.write(chunk, () => {
    // onWriteParsed: レンダリング完了後に呼ばれる
    this.processWriteBuffer();
  });
}
```

---

## 9. テスト計画

### 9.1 ユニットテスト

| テスト対象 | 確認内容 | 優先度 |
|-----------|---------|-------|
| ShellDetector | 各OSでの正しいシェル検出 | P0 |
| SessionManager | セッション作成・破棄・上限管理 | P0 |
| FocusManager | フォーカス切替・キーイベント伝搬 | P0 |
| ThemeManager | Obsidianテーマ同期 | P1 |
| ProfileManager | プロファイルCRUD | P1 |
| OutputCapture | 出力テキストの正しい抽出 | P2 |

### 9.2 結合テスト

| テスト対象 | 確認内容 | 優先度 |
|-----------|---------|-------|
| xterm.js + node-pty | データフローの正常動作 | P0 |
| Graceful Shutdown | SIGTERM→タイムアウト→SIGKILL→dispose の全フロー | P0 |
| コードブロック実行 | 抽出 → PTY送信 → 出力取得 | P1 |
| D&D連携 | ファイルエクスプローラ → ターミナルへのパス挿入 | P2 |
| タブ管理 | 作成・切替・閉じる・上限到達時の動作 | P1 |

### 9.3 E2E / 手動テスト

| テストケース | 確認内容 | 優先度 |
|------------|---------|-------|
| Claude Code起動 | `claude` コマンド起動、TUI表示、Shift+Enter動作 | P0 |
| Codex CLI起動 | `codex` 起動、プロンプト応答 | P1 |
| git操作 | `git status`, `git commit`, `git log --graph` の表示 | P0 |
| vim/nano | TUIエディタの表示・操作 | P0 |
| 日本語IME入力 | IMEによる日本語入力・変換・確定・表示 | **P0** |
| 長時間稼働 | 8時間連続使用でのメモリリーク確認 | P1 |
| マルチモニター | パネルリサイズ時のレンダリング | P2 |

### 9.3.1 AIエージェント対応テスト（詳細）

| # | テスト項目 | 確認内容 | 優先度 |
|---|-----------|---------|-------|
| 1 | Shift+Enter | 設定されたシーケンス（デフォルト `\x1b\r`）が正しく送信される | P0 |
| 2 | TUIレンダリング | ボックス描画文字・プログレスバー・チェックボックスの表示 | P0 |
| 3 | 大量出力耐性 | 1000行以上の一括出力でフレーム落ちなし | P0 |
| 4 | 長時間セッション | 8時間連続でメモリ単調増加なし | P1 |
| 5 | Ctrl+C中断 | エージェント動作中の即座の中断 | P0 |
| 6 | マウスイベント | TUI上のクリック・スクロールの正しい転送 | P1 |

### 9.4 クロスプラットフォームテスト

| OS | シェル | アーキテクチャ |
|----|-------|-------------|
| Windows 11 | PowerShell 7, cmd, WSL bash | x64 |
| macOS 14 | zsh, bash | arm64 (Apple Silicon) |
| Ubuntu 24.04 | bash, zsh | x64 |

### 9.5 ベータテスト戦略

- **BRAT（Beta Reviewers Auto-update Tester）対応:** コミュニティプラグインの正式リリース前にBRAT経由でベータ配布
- **`manifest-beta.json`:** ベータバージョン用のマニフェストファイルを `manifest.json` と別に管理
- **ベータテスターの募集:** Obsidian Forumでベータテスター募集（目標: 各プラットフォーム3名以上）
- **フィードバック収集:** GitHub Issuesのテンプレートでプラットフォーム情報・再現手順を収集
- **ベータ期間:** 最低2週間、Critical/Majorバグゼロで正式リリースへ移行

---

## 10. 開発ロードマップ

### v1.0: コアターミナル + AIエージェント対応（4–5週間）

**スコープ:** 単一ターミナル + AIエージェント対応に集中。タブ管理・コードブロック実行・D&D連携はv1.1に先送り。

#### Phase 1: 基盤構築（〜1.5週間）

- [ ] プロジェクトスキャフォールド（esbuild、TypeScript設定）
- [ ] `electron-bridge.ts` 実装（node-pty動的ロード）
- [ ] node-pty + xterm.js 基本統合
- [ ] 下部パネルUI（`WorkspaceLeaf` horizontal split）
- [ ] OS別シェル自動検出・起動
- [ ] Graceful Shutdown実装

#### Phase 2: AIエージェント最適化（〜1.5週間）

- [ ] Shift+Enter対応（設定変更可能なシーケンス送信）
- [ ] WebGLレンダラー + Canvasフォールバック
- [ ] `onWriteParsed` ベースのフロー制御
- [ ] TUI要素のレンダリング検証
- [ ] シェルプロファイルプリセット
- [ ] フォーカス管理（`attachCustomKeyEventHandler`）
- [ ] キーイベント伝搬ルール実装

#### Phase 3: 設定・UI・品質（〜1.5週間）

- [ ] 基本的な設定画面（シェル選択、フォント、外観）
- [ ] テーマカラー設定（Obsidian同期含む）
- [ ] リボンアイコン、基本コマンド登録
- [ ] 初回有効化時の同意ダイアログ
- [ ] エラーハンドリング（セクション2.A全項目）
- [ ] クロスプラットフォームテスト
- [ ] node-ptyプリビルドバイナリ作成
- [ ] `manifest-beta.json` 作成・BRAT対応
- [ ] README / ドキュメント整備

### v1.1: Obsidian連携強化（v1.0リリース後）

- [ ] 複数タブUI実装（タブの作成・閉じる・切替・リネーム）
- [ ] コードブロック実行機能（言語タグ別実行方式）
- [ ] ドラッグ＆ドロップ連携（シェル別エスケープ処理）
- [ ] ターミナル出力 → ノートコピー機能
- [ ] パネル高さドラッグリサイズ
- [ ] コマンドパレット全コマンド実装

### v1.2以降（将来）

- セッション復元（Obsidian再起動時）
- 分割ペイン（横並びターミナル）
- SSH接続対応
- スニペット管理

---

## 11. 依存パッケージ

### 11.1 ランタイム依存

| パッケージ | バージョン | 用途 |
|-----------|----------|------|
| `@xterm/xterm` | ^5.5.0 | ターミナルエミュレータ |
| `@xterm/addon-fit` | ^0.10.0 | コンテナフィット |
| `@xterm/addon-web-links` | ^0.11.0 | URL検出 |
| `@xterm/addon-search` | ^0.15.0 | ターミナル内検索 |
| `@xterm/addon-webgl` | ^0.18.0 | WebGLレンダリング |
| `@xterm/addon-unicode11` | ^0.8.0 | Unicode幅計算 |
| `node-pty` | ^1.0.0 | PTYプロセス管理 |

### 11.2 開発依存

| パッケージ | 用途 |
|-----------|------|
| `obsidian` | Obsidian API型定義 |
| `typescript` | 型安全な開発 |
| `esbuild` | バンドル |
| `electron-rebuild` | ネイティブモジュールリビルド |
| `@anthropic-ai/claude-code` | (テスト用) |

---

## 12. ファイル配布物

コミュニティプラグインとしてリリースする際の成果物:

```
manifest.json          # プラグインメタデータ（正式リリース用）
manifest-beta.json     # ベータ版メタデータ（BRAT用）
main.js                # バンドル済みJavaScript
styles.css             # スタイルシート
prebuilds/             # node-ptyプリビルドバイナリ
  ├── win32-x64/
  ├── win32-arm64/
  ├── darwin-arm64/
  ├── linux-x64/
  └── linux-arm64/
```

> **⚠ Intel Mac (darwin-x64) は非サポート。** Apple Silicon (arm64) のみ対応。2020年以前のIntel Macでは動作しない。ObsidianのElectronバージョンはApple Silicon向けにビルドされており、Intel Mac向けプリビルドバイナリの提供は行わない。

```json
// manifest.json
{
  "id": "obsidian-terminal",
  "name": "Terminal",
  "version": "1.0.0",
  "minAppVersion": "1.5.0",
  "description": "Integrated terminal with AI agent support for Obsidian",
  "author": "Atsushi",
  "isDesktopOnly": true
}
```

```json
// manifest-beta.json（BRAT用）
{
  "id": "obsidian-terminal",
  "name": "Terminal (Beta)",
  "version": "0.9.0-beta.1",
  "minAppVersion": "1.5.0",
  "description": "Integrated terminal with AI agent support for Obsidian (Beta)",
  "author": "Atsushi",
  "isDesktopOnly": true
}
```

---

## 13. アクセシビリティ

### 13.1 スクリーンリーダー対応

- xterm.jsの `screenReaderMode` オプションを設定画面で有効化可能（デフォルト: 無効）
- 有効化時、ターミナル出力がスクリーンリーダーに読み上げられるよう、非表示のARIAライブリージョンにテキストがミラーリングされる
- **パフォーマンス注意:** `screenReaderMode` は大量出力時にパフォーマンス低下を引き起こす可能性があるため、必要な場合のみ有効化を推奨

### 13.2 ARIAラベル

- ターミナルコンテナ: `aria-label="ターミナル"` + `role="application"`
- タブバー: `role="tablist"` + 各タブに `role="tab"` + `aria-selected`
- 設定画面の各入力要素に適切な `aria-label` を付与
- エラーメッセージ・通知に `role="alert"` を付与

### 13.3 キーボードナビゲーション

- すべてのUI要素はキーボードのみで操作可能
- タブ間の移動はキーバインド（`Ctrl+Shift+[` / `]`）で可能
- フォーカス順序: Obsidian UI → ターミナルパネル → ターミナル本体

---

## 付録A: 参考リソース

- [Obsidian Plugin API ドキュメント](https://docs.obsidian.md/)
- [Obsidian Sample Plugin](https://github.com/obsidianmd/obsidian-sample-plugin)
- [xterm.js ドキュメント](https://xtermjs.org/)
- [node-pty GitHub](https://github.com/microsoft/node-pty)
- [polyipseity/obsidian-terminal（既存プラグイン参考）](https://github.com/polyipseity/obsidian-terminal)
- [Quorafind/O-Terminal（既存プラグイン参考）](https://github.com/Quorafind/O-Terminal)