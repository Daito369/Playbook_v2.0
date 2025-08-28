# PolicyPlayBook データベース設計書

## 1. スプレッドシート構造概要

### 1.1 シート一覧

| シート名 | 用途 | レコード数（想定） | 更新頻度 |
|---------|------|-------------------|----------|
| Templates | メールテンプレート管理 | 150+ | 週次 |
| Variables | 変数定義 | 50+ | 月次 |
| Options | 選択肢管理 | 200+ | 月次 |
| WorkflowConfig | ワークフロー設定 | 30+ | 月次 |
| PolicyCategories | ポリシーカテゴリ | 100+ | 月次 |
| AuditLog | 監査ログ | 10000+ | 日次 |
| Cache | キャッシュデータ | 100+ | 時次 |

## 2. 詳細テーブル定義

### 2.1 Templates シート

| 列名 | データ型 | 必須 | 説明 | 例 |
|-----|---------|------|------|-----|
| template_id | String | ✓ | テンプレートID（一意） | REVIEW_APPROVED_001 |
| workflow_type | String | ✓ | ワークフロータイプ | 誤審査 |
| category | String | ✓ | 大カテゴリ | 不実表示 |
| subcategory | String | ✓ | 小カテゴリ | 信頼できない文言 |
| template_name | String | ✓ | テンプレート名 | 再審査→承認済み（誤審） |
| template_content | Text | ✓ | テンプレート本文 | {{contactName}} 様... |
| required_variables | JSON | ✓ | 必須変数リスト | ["contactName","myName"] |
| optional_variables | JSON | | オプション変数リスト | ["additionalInfo"] |
| conditions | JSON | | 表示条件 | {"workflow_type":"誤審査"} |
| workflow_step | Number | ✓ | ワークフローステップ | 3 |
| is_active | Boolean | ✓ | 有効フラグ | TRUE |
| version | Number | ✓ | バージョン | 2.0 |
| created_at | DateTime | ✓ | 作成日時 | 2024-01-01 00:00:00 |
| updated_at | DateTime | ✓ | 更新日時 | 2024-01-01 00:00:00 |
| created_by | String | ✓ | 作成者 | admin@example.com |
| notes | Text | | 備考 | 最も利用頻度の高いテンプレート |

### 2.2 Variables シート

| 列名 | データ型 | 必須 | 説明 | 例 |
|-----|---------|------|------|-----|
| variable_name | String | ✓ | 変数名（一意） | contactName |
| display_name | String | ✓ | 表示名 | 連絡先名 |
| variable_type | String | ✓ | 変数タイプ | text |
| input_type | String | ✓ | 入力タイプ | textfield |
| is_required | Boolean | ✓ | 必須フラグ | TRUE |
| default_value | String | | デフォルト値 | |
| validation_rule | String | | バリデーションルール | ^[\\p{L}\\s]+$ |
| placeholder | String | | プレースホルダー | 顧客の名前を入力 |
| help_text | String | | ヘルプテキスト | メール冒頭で使用されます |
| options_source | String | | オプションソース | Options:opening |
| dependencies | JSON | | 依存関係 | {"requires":["workflow_type"]} |
| sort_order | Number | ✓ | 表示順 | 1 |
| group_name | String | | グループ名 | 基本情報 |
| is_active | Boolean | ✓ | 有効フラグ | TRUE |

### 2.3 Options シート

| 列名 | データ型 | 必須 | 説明 | 例 |
|-----|---------|------|------|-----|
| option_id | String | ✓ | オプションID（一意） | OPT_001 |
| variable_name | String | ✓ | 関連変数名 | opening |
| option_value | String | ✓ | オプション値 | 0 |
| option_label | String | ✓ | 表示ラベル | お問い合わせをいただき... |
| condition | JSON | | 表示条件 | {"workflow_type":"誤審査"} |
| sort_order | Number | ✓ | 表示順 | 1 |
| is_default | Boolean | | デフォルト選択 | FALSE |
| is_active | Boolean | ✓ | 有効フラグ | TRUE |
| metadata | JSON | | メタデータ | {"usage":"通常営業時"} |

### 2.4 WorkflowConfig シート

| 列名 | データ型 | 必須 | 説明 | 例 |
|-----|---------|------|------|-----|
| workflow_id | String | ✓ | ワークフローID | WF_001 |
| workflow_type | String | ✓ | ワークフロータイプ | 誤審査 |
| step_number | Number | ✓ | ステップ番号 | 1 |
| step_name | String | ✓ | ステップ名 | 審査種類選択 |
| step_type | String | ✓ | ステップタイプ | selection |
| options | JSON | ✓ | 選択肢 | ["誤審査","不承認"] |
| next_step | JSON | ✓ | 次ステップ条件 | {"誤審査":2} |
| required_fields | JSON | | 必須フィールド | ["contactName"] |
| validation_rules | JSON | | バリデーション | {"ecid":"^\\d{10}$"} |
| is_terminal | Boolean | ✓ | 終端フラグ | FALSE |

### 2.5 PolicyCategories シート

| 列名 | データ型 | 必須 | 説明 | 例 |
|-----|---------|------|------|-----|
| category_id | String | ✓ | カテゴリID | CAT_001 |
| parent_category | String | | 親カテゴリ | |
| category_name | String | ✓ | カテゴリ名 | 不実表示 |
| category_path | String | ✓ | カテゴリパス | /不実表示 |
| display_order | Number | ✓ | 表示順 | 1 |
| workflow_types | JSON | ✓ | 対応ワークフロー | ["誤審査","不承認"] |
| icon | String | | アイコン | fas fa-exclamation |
| description | Text | | 説明 | 誤解を招く表現に関するポリシー |
| is_active | Boolean | ✓ | 有効フラグ | TRUE |

## 3. リレーション定義

### 3.1 主要リレーション

```
Templates.template_id ←→ Variables.variable_name (M:N via required_variables)
Variables.variable_name → Options.variable_name (1:N)
Templates.workflow_type → WorkflowConfig.workflow_type (N:1)
Templates.category → PolicyCategories.category_name (N:1)
```

### 3.2 参照整合性ルール

1. **カスケード削除**: なし（論理削除のみ）
2. **カスケード更新**: Options.variable_name は Variables.variable_name の更新に追従
3. **外部キー制約**: 
   - Templates.required_variables は Variables.variable_name に存在必須
   - Options.variable_name は Variables.variable_name に存在必須

## 4. インデックス設計

### 4.1 プライマリインデックス
- Templates: template_id
- Variables: variable_name
- Options: option_id
- WorkflowConfig: workflow_id
- PolicyCategories: category_id

### 4.2 セカンダリインデックス
- Templates: (workflow_type, category, is_active)
- Variables: (variable_type, is_active)
- Options: (variable_name, is_active)
- WorkflowConfig: (workflow_type, step_number)
- PolicyCategories: (parent_category, display_order)

## 5. データ管理ポリシー

### 5.1 命名規則
- テーブル名: PascalCase
- 列名: snake_case
- ID: 大文字_アンダースコア

### 5.2 データ型規則
- Boolean: TRUE/FALSE
- DateTime: YYYY-MM-DD HH:MM:SS
- JSON: 正規化されたJSON文字列

### 5.3 バージョン管理
- 全テーブルに version, created_at, updated_at を含む
- 更新時は新規レコード作成（履歴保持）

### 5.4 論理削除
- is_active フラグで管理
- 物理削除は90日後に実行

## 6. パフォーマンス考慮事項

### 6.1 最適化戦略
- 頻繁にアクセスされるデータはCache シートに保存
- 大量データは別シートに分割
- インデックスを活用した高速検索

### 6.2 制限事項
- 1シートあたり最大500万セル
- 1セルあたり最大50,000文字
- API呼び出し制限: 100リクエスト/100秒

## 7. バックアップ・リカバリ

### 7.1 バックアップ方針
- 日次: 全シート自動バックアップ
- 週次: 外部ストレージへエクスポート
- 月次: アーカイブ作成

### 7.2 リカバリ手順
1. 最新バックアップから復元
2. AuditLogから差分適用
3. 整合性チェック実行