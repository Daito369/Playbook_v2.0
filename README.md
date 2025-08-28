# PolicyPlayBook - Auto Email Generator

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![GAS](https://img.shields.io/badge/Google%20Apps%20Script-Ready-orange.svg)
![Status](https://img.shields.io/badge/status-Active-success.svg)

## 📋 概要

PolicyPlayBookは、Google広告ポリシー違反に関する対応メールを効率的に生成するためのWebアプリケーションです。ワークフロー駆動型のインターフェースにより、適切なテンプレート選択から変数入力、メール生成までをシームレスに実行できます。

### 主な特徴

- 🚀 **ワークフロー駆動型UI** - 直感的なステップバイステップのナビゲーション
- 📝 **130以上のテンプレート** - 多様なポリシー違反パターンに対応
- 🔍 **リアルタイムプレビュー** - 入力内容を即座に確認
- 💾 **スプレッドシートベース** - 非開発者でも簡単にテンプレート管理
- 🔒 **セキュアな認証** - Google OAuth 2.0による安全なアクセス制御
- 📱 **レスポンシブデザイン** - デスクトップ・タブレット・モバイル対応

## 🏗️ アーキテクチャ

```
┌─────────────────────────────────────────┐
│         Presentation Layer              │
│   (HTML/CSS/JavaScript - Client Side)   │
├─────────────────────────────────────────┤
│         Application Layer               │
│   (Google Apps Script - Server Side)    │
├─────────────────────────────────────────┤
│          Business Logic Layer           │
│   (Workflow Engine / Template Engine)   │
├─────────────────────────────────────────┤
│           Data Access Layer             │
│      (Spreadsheet API / Cache)          │
├─────────────────────────────────────────┤
│            Data Storage Layer           │
│         (Google Sheets Database)        │
└─────────────────────────────────────────┘
```

## 🚀 クイックスタート

### 前提条件

- Google アカウント
- Google Workspace アクセス権限
- Node.js v18以上（開発環境）
- VS Code + Claude Code Extension（推奨）

### インストール手順

1. **リポジトリのクローン**
```bash
git clone https://github.com/your-org/policyplaybook.git
cd policyplaybook
```

2. **依存関係のインストール**
```bash
npm install
```

3. **環境設定**
```bash
cp .env.example .env
# .envファイルを編集してスプレッドシートIDを設定
```

4. **Google Apps Script プロジェクトの作成**
```bash
npm run setup:gas
# または手動で
clasp login
clasp create --title "PolicyPlayBook" --type webapp
```

5. **初期データのセットアップ**
```bash
npm run setup:database
```

6. **デプロイ**
```bash
npm run deploy
```

## 📁 プロジェクト構造

```
PolicyPlayBook/
│
├── 📁 docs/                          # ドキュメントフォルダ
│   ├── architecture.md               # システムアーキテクチャ仕様書
│   ├── database-design.md            # データベース設計書
│   ├── api-specification.md          # API仕様書
│   ├── ui-flow-specification.md      # UI/UXフロー仕様書
│   ├── implementation-roadmap.md     # 実装ロードマップ
│   ├── development-guidelines.md     # 開発ガイドライン
│   └── template-variables.md         # テンプレート変数一覧
│
├── 📁 src/                           # ソースコードフォルダ
│   ├── 📁 gas/                      # Google Apps Script
│   │   ├── Code.gs                  # メインコントローラー
│   │   ├── Database.gs              # データベースサービス
│   │   ├── Templates.gs             # テンプレートエンジン
│   │   ├── Utils.gs                 # ユーティリティ関数
│   │   ├── Workflow.gs              # ワークフロー管理（新規）
│   │   ├── Validation.gs            # バリデーション（新規）
│   │   └── Cache.gs                 # キャッシュ管理（新規）
│   │
│   └── 📁 web/                      # Webアプリケーション
│       ├── index.html                # メインHTML
│       ├── components.html          # UIコンポーネント（新規）
│       ├── style.html               # スタイルシート
│       ├── script.html              # フロントエンドJS
│       └── workflow-ui.html         # ワークフローUI（新規）
│
├── 📁 config/                        # 設定ファイル
│   ├── spreadsheet-config.json      # スプレッドシート設定
│   ├── workflow-config.json         # ワークフロー設定
│   ├── template-mappings.json       # テンプレートマッピング
│   └── policy-categories.json       # ポリシーカテゴリ定義
│
├── 📁 tests/                         # テストファイル
│   ├── test-workflow.js             # ワークフローテスト
│   ├── test-templates.js            # テンプレートテスト
│   └── test-database.js             # データベーステスト
│
├── 📁 scripts/                       # 管理スクリプト
│   ├── setup.gs                     # 初期セットアップ
│   ├── migrate.gs                   # データ移行
│   └── deploy.sh                    # デプロイスクリプト
│
├── .gitignore                        # Git除外設定
├── README.md                         # プロジェクト説明
├── package.json                      # パッケージ設定
└── appsscript.json                   # GAS設定
```

## 💻 開発

### 開発サーバーの起動

```bash
npm run dev
```

### コードのプッシュ

```bash
npm run push
```

### テストの実行

```bash
npm test
```

### ビルド

```bash
npm run build
```

## 📊 データベース構造

### 主要テーブル

| テーブル名 | 説明 | レコード数 |
|-----------|------|------------|
| Templates | メールテンプレート | 130+ |
| Variables | 変数定義 | 50+ |
| Options | 選択肢データ | 200+ |
| WorkflowConfig | ワークフロー設定 | 30+ |
| PolicyCategories | ポリシーカテゴリ | 100+ |

## 🔧 設定

### スプレッドシートID設定

`src/gas/Code.gs` ファイル内:
```javascript
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID';
```

### 環境変数

`.env` ファイル:
```env
SPREADSHEET_ID=your_spreadsheet_id
ENV=development
LOG_LEVEL=INFO
CACHE_ENABLED=true
```

## 📝 使用方法

### 基本的なワークフロー

1. **審査種類を選択**
   - 誤審査
   - 不承認
   - Cert 認定
   - その他

2. **ポリシーを選択**
   - 大カテゴリを選択
   - 小カテゴリを選択

3. **状態を選択**
   - 承認/不承認など

4. **詳細情報を入力**
   - 必須フィールドを入力
   - オプションフィールドを必要に応じて入力

5. **メール生成**
   - プレビュー確認
   - 生成ボタンをクリック

### キーボードショートカット

| ショートカット | アクション |
|---------------|-----------|
| Ctrl + Enter | メール生成 |
| Ctrl + S | フォーム保存 |
| Ctrl + R | フォームリセット |
| Esc | モーダルを閉じる |

## 🧪 テスト

### 単体テスト

```bash
npm run test:unit
```

### 統合テスト

```bash
npm run test:integration
```

### E2Eテスト

```bash
npm run test:e2e
```

## 📚 API ドキュメント

### エンドポイント

| メソッド | パス | 説明 |
|---------|------|------|
| GET | /workflow/initialize | ワークフロー初期化 |
| GET | /workflow/policies | ポリシー一覧取得 |
| GET | /workflow/template | テンプレート取得 |
| POST | /workflow/generate | メール生成 |

詳細は [API仕様書](docs/api-specification.md) を参照してください。

## 🤝 コントリビューション

### 開発フロー

1. Feature ブランチを作成 (`git checkout -b feature/AmazingFeature`)
2. 変更をコミット (`git commit -m 'Add some AmazingFeature'`)
3. ブランチをプッシュ (`git push origin feature/AmazingFeature`)
4. Pull Request を作成

### コーディング規約

- [開発ガイドライン](docs/development-guidelines.md) を参照
- ESLint と Prettier を使用
- コミットメッセージは [Conventional Commits](https://www.conventionalcommits.org/) に準拠

## 🐛 バグ報告

バグを発見した場合は、[Issue](https://github.com/your-org/policyplaybook/issues) を作成してください。

### Issue テンプレート

```markdown
## 概要
バグの簡潔な説明

## 再現手順
1. '...'へ移動
2. '...'をクリック
3. エラーが発生

## 期待される動作
期待される正常な動作の説明

## スクリーンショット
該当する場合は追加

## 環境
- OS: [e.g. Windows 10]
- ブラウザ: [e.g. Chrome 120]
- バージョン: [e.g. 2.0.0]
```

## 📈 パフォーマンス指標

| 指標 | 目標値 | 現在値 |
|-----|--------|--------|
| 初期ロード時間 | < 3秒 | 2.5秒 |
| API レスポンス | < 1秒 | 0.8秒 |
| テンプレート生成 | < 2秒 | 1.5秒 |
| 同時接続数 | 100 | 100 |

## 🔒 セキュリティ

- Google OAuth 2.0 認証
- 入力値のサニタイゼーション
- XSS/CSRF 対策実装
- 定期的なセキュリティ監査

## 📄 ライセンス

このプロジェクトは MIT ライセンスの下でライセンスされています。詳細は [LICENSE](LICENSE) ファイルを参照してください。

## 👥 チーム

- **プロジェクトリード** - [@lead](https://github.com/lead)
- **開発チーム** - PolicyPlayBook Team

## 🙏 謝辞

- Google Apps Script チーム
- Bootstrap コミュニティ
- すべてのコントリビューター

## 📞 サポート

- 📧 Email: support@policyplaybook.com
- 💬 Slack: #policy-playbook
- 📖 [ドキュメント](https://docs.policyplaybook.com)
- 🎥 [チュートリアル動画](https://youtube.com/policyplaybook)

## 🔄 更新履歴

### Version 2.0.0 (2024-01-01)
- ワークフローエンジンの実装
- 130テンプレート対応
- UI/UX 完全リニューアル
- パフォーマンス最適化

### Version 1.0.0 (2023-06-01)
- 初回リリース
- 基本機能実装

詳細な変更履歴は [CHANGELOG.md](CHANGELOG.md) を参照してください。

---

<p align="center">
  Made with ❤️ by PolicyPlayBook Team
</p>