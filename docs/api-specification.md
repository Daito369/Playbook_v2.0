# PolicyPlayBook API仕様書

## 1. API概要

### 1.1 基本情報
- **プロトコル**: HTTPS
- **エンドポイント**: Google Apps Script Web App URL
- **認証方式**: Google OAuth 2.0
- **レスポンス形式**: JSON
- **文字エンコーディング**: UTF-8

### 1.2 共通ヘッダー
```http
Content-Type: application/json
Authorization: Bearer {access_token}
X-Request-ID: {unique_request_id}
```

## 2. ワークフローAPI

### 2.1 ワークフロー初期化
```javascript
POST /workflow/initialize
```

**リクエスト:**
```json
{
  "userId": "user@example.com",
  "sessionId": "unique_session_id",
  "locale": "ja-JP"
}
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "workflowId": "WF_20240101_001",
    "availableTypes": [
      {
        "id": "misreview",
        "label": "誤審査",
        "icon": "fas fa-exclamation-triangle"
      },
      {
        "id": "disapproval",
        "label": "不承認",
        "icon": "fas fa-times-circle"
      },
      {
        "id": "certification",
        "label": "Cert 認定",
        "icon": "fas fa-certificate"
      },
      {
        "id": "other",
        "label": "その他",
        "icon": "fas fa-ellipsis-h"
      }
    ],
    "currentStep": 1,
    "totalSteps": 6
  }
}
```

### 2.2 ポリシーカテゴリ取得
```javascript
GET /workflow/policies?type={workflow_type}
```

**パラメータ:**
- `workflow_type`: 選択されたワークフロータイプ (misreview|disapproval|certification|other)

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "misrepresentation",
        "name": "不実表示",
        "subcategories": [
          {
            "id": "untrustworthy_claims",
            "name": "信頼できない文言",
            "templateCount": 5
          }
        ]
      }
    ]
  }
}
```

### 2.3 テンプレート取得
```javascript
GET /workflow/template?category={category}&subcategory={subcategory}&status={status}
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "templateId": "TMPL_001",
    "templateName": "再審査→承認済み（誤審）",
    "requiredFields": [
      {
        "name": "contactName",
        "label": "連絡先名",
        "type": "text",
        "validation": "required",
        "placeholder": "顧客の名前を入力"
      },
      {
        "name": "opening",
        "label": "Opening",
        "type": "select",
        "options": [
          {"value": "0", "label": "お問い合わせをいただき誠にありがとうございます。"},
          {"value": "1", "label": "ご連絡をお待たせし申し訳ございません。"}
        ]
      }
    ],
    "optionalFields": [],
    "preview": "{{contactName}} 様..."
  }
}
```

### 2.4 メール生成
```javascript
POST /workflow/generate
```

**リクエスト:**
```json
{
  "workflowId": "WF_20240101_001",
  "templateId": "TMPL_001",
  "variables": {
    "contactName": "田中様",
    "myName": "山田",
    "opening": "0",
    "channel": "0",
    "overview": "広告が不承認となった件について",
    "ecid": "1234567890",
    "detailedPolicy": "不実表示",
    "status": "0",
    "adtype": "広告"
  }
}
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "generatedContent": "田中様\n\n平素よりお世話になっております...",
    "metadata": {
      "generatedAt": "2024-01-01T12:00:00Z",
      "templateUsed": "TMPL_001",
      "wordCount": 500,
      "estimatedReadTime": "2分"
    }
  }
}
```

## 3. データ管理API

### 3.1 テンプレート一覧取得
```javascript
GET /templates?page={page}&limit={limit}&filter={filter}
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "templates": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    }
  }
}
```

### 3.2 テンプレート作成
```javascript
POST /templates
```

**リクエスト:**
```json
{
  "workflow_type": "misreview",
  "category": "不実表示",
  "subcategory": "新規サブカテゴリ",
  "template_name": "新規テンプレート",
  "template_content": "{{contactName}} 様...",
  "required_variables": ["contactName", "myName"],
  "optional_variables": []
}
```

### 3.3 テンプレート更新
```javascript
PUT /templates/{template_id}
```

### 3.4 テンプレート削除（論理削除）
```javascript
DELETE /templates/{template_id}
```

## 4. バリデーションAPI

### 4.1 入力値検証
```javascript
POST /validate
```

**リクエスト:**
```json
{
  "field": "ecid",
  "value": "123456789",
  "rules": ["required", "ecid_format"]
}
```

**レスポンス:**
```json
{
  "success": false,
  "errors": [
    {
      "field": "ecid",
      "message": "ECIDは10桁の数字で入力してください",
      "code": "INVALID_FORMAT"
    }
  ]
}
```

## 5. キャッシュAPI

### 5.1 キャッシュクリア
```javascript
POST /cache/clear
```

### 5.2 キャッシュ統計取得
```javascript
GET /cache/stats
```

## 6. エラーコード

| コード | HTTPステータス | 説明 |
|-------|---------------|------|
| SUCCESS | 200 | 成功 |
| CREATED | 201 | 作成成功 |
| BAD_REQUEST | 400 | 不正なリクエスト |
| UNAUTHORIZED | 401 | 認証エラー |
| FORBIDDEN | 403 | アクセス拒否 |
| NOT_FOUND | 404 | リソースが見つからない |
| VALIDATION_ERROR | 422 | バリデーションエラー |
| INTERNAL_ERROR | 500 | 内部エラー |
| SERVICE_UNAVAILABLE | 503 | サービス利用不可 |

## 7. エラーレスポンス形式

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力値が正しくありません",
    "details": [
      {
        "field": "ecid",
        "message": "ECIDは10桁の数字で入力してください"
      }
    ],
    "timestamp": "2024-01-01T12:00:00Z",
    "requestId": "req_123456"
  }
}
```

## 8. レート制限

- **認証済みユーザー**: 1000リクエスト/時
- **未認証ユーザー**: 100リクエスト/時
- **バースト制限**: 10リクエスト/秒

## 9. WebSocket API（リアルタイム通信）

### 9.1 接続確立
```javascript
ws://app-url/realtime
```

### 9.2 イベント形式
```json
{
  "event": "workflow.updated",
  "data": {
    "workflowId": "WF_20240101_001",
    "currentStep": 3,
    "progress": 50
  }
}
```

### 9.3 サポートイベント
- `workflow.started`: ワークフロー開始
- `workflow.updated`: ワークフロー更新
- `workflow.completed`: ワークフロー完了
- `validation.error`: バリデーションエラー
- `template.preview`: テンプレートプレビュー更新