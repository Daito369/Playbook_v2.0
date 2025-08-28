# GEMINI コンテキスト

## プロジェクト概要

このプロジェクトは「PolicyPlayBook」という名前の、Google Apps Script (GAS) を利用したウェブアプリケーションです。Google広告のポリシー違反に関する対応メールの生成を効率化することを目的としています。

ユーザーはワークフロー駆動型のUIを通じて、事案に応じたテンプレートを選択し、必要な情報を入力することで、迅速かつ正確にメール文面を生成できます。データはGoogleスプレッドシートで管理されており、非開発者でもテンプレートや設定のメンテナンスが容易になるように設計されています。

## 主要技術スタック

*   **バックエンド:** Google Apps Script (JavaScript - V8ランタイム)
*   **フロントエンド:** HTML, CSS, JavaScript
*   **データベース:** Google Sheets
*   **開発・ビルドツール:** Node.js, npm, @google/clasp, ESLint, Prettier

## アーキテクチャ

*   **`src/gas/Code.gs`**: GAS側のメインコントローラー。`doGet`でWebアプリケーションのUIを提供し、`doPost`でAPIリクエストを処理します。
*   **`src/web/*.html`**: フロントエンドのUIを構成するHTMLファイル群。`HtmlService`のテンプレート機能を利用して動的にページが生成されます。
*   **`src/gas/Workflow.gs`**: メール生成のビジネスロジックを管理するコアモジュール。ユーザーの選択に応じて状態を遷移させ、最終的なメール文面を生成します。
*   **`src/gas/Database.gs`**: Googleスプレッドシートとの連携を担当するデータアクセスレイヤー。テンプレート、変数、設定などをシートから読み書きします。
*   **`config/*.json`**: アプリケーションの挙動を定義する設定ファイル群。特に`workflow-config.json`は、UIのステップや入力項目、利用するテンプレートなどを定義する重要なファイルです。
*   **`appsscript.json`**: GASプロジェクトのマニフェストファイル。タイムゾーン、依存ライブラリ、OAuthスコープなどを定義します。

## ビルド、実行、デプロイ

開発環境では`npm`スクリプトを使用します。

*   **開発サーバーの起動 (ファイルの自動プッシュ):**
    ```bash
    npm run dev
    ```

*   **テストの実行:**
    ```bash
    npm test
    ```

*   **コードのフォーマットとLinterの実行:**
    ```bash
    npm run format
    npm run lint
    ```

*   **デプロイ:**
    ```bash
    npm run deploy
    ```
    このコマンドは、テストの実行、`clasp push`によるコードのアップロード、`clasp deploy`による新しいバージョンの作成を順に実行します。

## 開発規約

*   **コーディングスタイル:** `prettier`と`eslint` (google設定ベース) によるフォーマットが強制されます。コミット前に`lint-staged`と`husky`が自動でチェックを実行します。
*   **コミットメッセージ:** [Conventional Commits](https://www.conventionalcommits.org/) の規約に準拠することが推奨されています。
*   **ブランチ戦略:** `README.md`に記載の通り、`feature/`ブランチで開発を行い、Pull Requestを作成するフローが想定されています。
*   **設定管理:**
    *   GASの環境に依存しない設定は`config/*.json`で管理します。
    *   スプレッドシートIDのような環境固有の値は`src/gas/Code.gs`内の定数で管理されていますが、`.env`ファイルを利用する仕組みも`package.json`に見られます。
*   **テスト:** `tests/`ディレクトリに単体テスト (`test-unit.js`)、結合テスト (`test-integration.js`)、E2Eテスト (`test-e2e.js`) のファイルが用意されており、`npm test`で実行されます。
