# PolicyPlayBook 開発ガイドライン

## 1. 開発環境セットアップ

### 1.1 必要なツール
```bash
# 必須ツール
- VS Code (最新版)
- Claude Code Extension
- Node.js (v18以上)
- Git
- Google Chrome

# VS Code 拡張機能
- Google Apps Script
- ESLint
- Prettier
- GitLens
- Live Server
```

### 1.2 プロジェクト初期設定
```bash
# リポジトリクローン
git clone https://github.com/your-org/policyplaybook.git
cd policyplaybook

# 依存関係インストール
npm install

# 環境変数設定
cp .env.example .env
# .envファイルを編集してスプレッドシートIDを設定

# GAS プロジェクト連携
clasp login
clasp create --title "PolicyPlayBook" --type webapp
clasp push
```

## 2. コーディング規約

### 2.1 命名規則

#### JavaScript/TypeScript
```javascript
// クラス名: PascalCase
class TemplateEngine {}

// 関数名: camelCase
function generateEmail() {}

// 定数: UPPER_SNAKE_CASE
const MAX_RETRY_COUNT = 3;

// 変数: camelCase
let currentTemplate = null;

// プライベート変数: アンダースコア接頭辞
let _privateCache = {};

// ブール値: is/has/can接頭辞
let isActive = true;
let hasPermission = false;
let canEdit = true;
```

#### HTML/CSS
```html
<!-- ID: camelCase -->
<div id="templateSelector"></div>

<!-- クラス: kebab-case -->
<div class="workflow-container"></div>

<!-- データ属性: kebab-case -->
<div data-template-id="TMPL_001"></div>
```

### 2.2 ファイル構造規約

#### GAS ファイル
```javascript
/**
 * ファイルヘッダー
 * @fileoverview ファイルの説明
 * @author 作成者名
 * @version 1.0.0
 * @lastmodified 2024-01-01
 */

// 1. インポート/依存関係
// 2. 定数定義
// 3. クラス定義
// 4. 公開関数
// 5. プライベート関数
// 6. エクスポート

/**
 * 関数の説明
 * @param {string} templateId - テンプレートID
 * @param {Object} variables - 変数オブジェクト
 * @returns {string} 生成されたメール
 * @throws {Error} テンプレートが見つからない場合
 */
function generateEmailFromTemplate(templateId, variables) {
  // 実装
}
```

### 2.3 エラーハンドリング

```javascript
// カスタムエラークラス
class ValidationError extends Error {
  constructor(field, message) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

// エラーハンドリングパターン
async function safeExecute(fn, fallback = null) {
  try {
    return await fn();
  } catch (error) {
    console.error('Execution failed:', error);
    logError(error);
    
    if (fallback) {
      return fallback;
    }
    
    throw new Error(`Operation failed: ${error.message}`);
  }
}

// 使用例
const result = await safeExecute(
  () => fetchTemplate(templateId),
  { content: 'デフォルトテンプレート' }
);
```

## 3. Google Apps Script 特有のベストプラクティス

### 3.1 実行時間の最適化

```javascript
// ❌ 悪い例: 個別のAPI呼び出し
for (let i = 0; i < rows.length; i++) {
  sheet.getRange(i, 1).setValue(data[i]);
}

// ✅ 良い例: バッチ処理
sheet.getRange(1, 1, rows.length, 1).setValues(data);

// 実行時間監視
function timeboxedExecution(fn, maxSeconds = 300) {
  const startTime = new Date();
  
  return function(...args) {
    const elapsed = (new Date() - startTime) / 1000;
    if (elapsed > maxSeconds) {
      throw new Error('Execution timeout');
    }
    return fn.apply(this, args);
  };
}
```

### 3.2 キャッシュ戦略

```javascript
class CacheService {
  constructor() {
    this.scriptCache = PropertiesService.getScriptProperties();
    this.userCache = PropertiesService.getUserProperties();
  }
  
  get(key, options = {}) {
    const cacheKey = this.getCacheKey(key);
    const cached = this.scriptCache.getProperty(cacheKey);
    
    if (!cached) return null;
    
    const data = JSON.parse(cached);
    
    // TTLチェック
    if (options.ttl && Date.now() - data.timestamp > options.ttl) {
      this.delete(key);
      return null;
    }
    
    return data.value;
  }
  
  set(key, value, ttl = 3600000) {
    const cacheKey = this.getCacheKey(key);
    const data = {
      value: value,
      timestamp: Date.now(),
      ttl: ttl
    };
    
    this.scriptCache.setProperty(cacheKey, JSON.stringify(data));
  }
  
  getCacheKey(key) {
    return `cache_${key}`;
  }
}
```

### 3.3 スプレッドシート操作

```javascript
// データアクセス層の抽象化
class SpreadsheetDAO {
  constructor(spreadsheetId) {
    this.spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    this.cache = new CacheService();
  }
  
  getSheetData(sheetName, useCache = true) {
    const cacheKey = `sheet_${sheetName}`;
    
    if (useCache) {
      const cached = this.cache.get(cacheKey);
      if (cached) return cached;
    }
    
    const sheet = this.spreadsheet.getSheetByName(sheetName);
    const data = sheet.getDataRange().getValues();
    
    // ヘッダー行を使ってオブジェクト配列に変換
    const headers = data[0];
    const records = data.slice(1).map(row => {
      const record = {};
      headers.forEach((header, index) => {
        record[header] = row[index];
      });
      return record;
    });
    
    this.cache.set(cacheKey, records, 300000); // 5分間キャッシュ
    return records;
  }
}
```

## 4. テスト戦略

### 4.1 単体テスト

```javascript
// テストフレームワーク（GAS Test）
function runTests() {
  const tests = [
    testTemplateGeneration,
    testValidation,
    testWorkflowTransition
  ];
  
  const results = tests.map(test => {
    try {
      test();
      return { name: test.name, status: 'PASS' };
    } catch (error) {
      return { name: test.name, status: 'FAIL', error: error.message };
    }
  });
  
  console.log('Test Results:', results);
  return results;
}

function testTemplateGeneration() {
  const template = '{{name}}様、こんにちは。';
  const variables = { name: '田中' };
  const result = processTemplate(template, variables);
  
  assert(result === '田中様、こんにちは。', 'Template generation failed');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
```

### 4.2 統合テスト

```javascript
// E2Eテストシナリオ
function testCompleteWorkflow() {
  const workflow = new WorkflowEngine();
  
  // Step 1: 初期化
  workflow.initialize();
  assert(workflow.currentStep === 1);
  
  // Step 2: タイプ選択
  workflow.selectType('misreview');
  assert(workflow.currentStep === 2);
  
  // Step 3: ポリシー選択
  workflow.selectPolicy('misrepresentation', 'untrustworthy_claims');
  assert(workflow.currentStep === 3);
  
  // Step 4: 状態選択
  workflow.selectStatus('approved');
  assert(workflow.currentStep === 4);
  
  // Step 5: メール生成
  const email = workflow.generate({
    contactName: 'テスト太郎',
    myName: 'サポート'
  });
  
  assert(email.includes('テスト太郎様'));
}
```

## 5. デバッグとロギング

### 5.1 ロギング戦略

```javascript
class Logger {
  static log(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data,
      user: Session.getActiveUser().getEmail()
    };
    
    // コンソール出力
    console.log(`[${level}] ${message}`, data);
    
    // スプレッドシートに記録（本番環境）
    if (isProduction()) {
      this.writeToSheet(logEntry);
    }
  }
  
  static info(message, data) {
    this.log('INFO', message, data);
  }
  
  static error(message, error) {
    this.log('ERROR', message, {
      error: error.message,
      stack: error.stack
    });
  }
  
  static debug(message, data) {
    if (isDevelopment()) {
      this.log('DEBUG', message, data);
    }
  }
}
```

### 5.2 デバッグツール

```javascript
// パフォーマンス計測
function measurePerformance(fn, label) {
  return function(...args) {
    const start = Date.now();
    Logger.debug(`${label} started`);
    
    try {
      const result = fn.apply(this, args);
      const duration = Date.now() - start;
      Logger.info(`${label} completed`, { duration });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      Logger.error(`${label} failed`, { duration, error });
      throw error;
    }
  };
}

// 使用例
const generateEmail = measurePerformance(
  generateEmailImpl,
  'Email Generation'
);
```

## 6. セキュリティガイドライン

### 6.1 入力検証

```javascript
class InputValidator {
  static sanitize(input) {
    if (typeof input !== 'string') return input;
    
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
  
  static validateECID(ecid) {
    const pattern = /^\d{10}$/;
    if (!pattern.test(ecid)) {
      throw new ValidationError('ecid', 'ECIDは10桁の数字である必要があります');
    }
    return ecid;
  }
  
  static validateEmail(email) {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!pattern.test(email)) {
      throw new ValidationError('email', '有効なメールアドレスを入力してください');
    }
    return email;
  }
}
```

### 6.2 認証・認可

```javascript
// アクセス制御
function requireAuthentication() {
  const user = Session.getActiveUser();
  const email = user.getEmail();
  
  if (!email) {
    throw new Error('Authentication required');
  }
  
  // 許可リストチェック
  const allowedDomains = ['example.com'];
  const domain = email.split('@')[1];
  
  if (!allowedDomains.includes(domain)) {
    throw new Error('Access denied');
  }
  
  return user;
}

// デコレーターパターン
function authenticated(target, propertyKey, descriptor) {
  const originalMethod = descriptor.value;
  
  descriptor.value = function(...args) {
    requireAuthentication();
    return originalMethod.apply(this, args);
  };
  
  return descriptor;
}
```

## 7. デプロイメント

### 7.1 環境管理

```javascript
// 環境設定
const Config = {
  development: {
    spreadsheetId: 'dev-spreadsheet-id',
    logLevel: 'DEBUG',
    cacheEnabled: false
  },
  staging: {
    spreadsheetId: 'staging-spreadsheet-id',
    logLevel: 'INFO',
    cacheEnabled: true
  },
  production: {
    spreadsheetId: 'prod-spreadsheet-id',
    logLevel: 'ERROR',
    cacheEnabled: true
  }
};

function getConfig() {
  const env = PropertiesService.getScriptProperties().getProperty('ENV') || 'development';
  return Config[env];
}
```

### 7.2 デプロイスクリプト

```bash
#!/bin/bash
# deploy.sh

echo "PolicyPlayBook Deployment Script"

# 環境選択
read -p "Select environment (dev/staging/prod): " ENV

# バリデーション
if [[ ! "$ENV" =~ ^(dev|staging|prod)$ ]]; then
  echo "Invalid environment"
  exit 1
fi

# テスト実行
echo "Running tests..."
npm test
if [ $? -ne 0 ]; then
  echo "Tests failed. Deployment aborted."
  exit 1
fi

# GAS デプロイ
echo "Deploying to Google Apps Script..."
clasp push

# バージョンタグ
VERSION=$(date +%Y%m%d_%H%M%S)
git tag -a "deploy_${ENV}_${VERSION}" -m "Deploy to ${ENV}"
git push origin "deploy_${ENV}_${VERSION}"

echo "Deployment completed successfully!"
```

## 8. トラブルシューティング

### 8.1 よくある問題と解決策

| 問題 | 原因 | 解決策 |
|-----|------|--------|
| 実行時間超過 | 大量データ処理 | バッチ処理、非同期化 |
| メモリ不足 | キャッシュ肥大化 | 定期的なキャッシュクリア |
| API制限 | 過度なリクエスト | レート制限、キャッシュ活用 |
| 権限エラー | スコープ不足 | appsscript.json でスコープ追加 |

### 8.2 デバッグチェックリスト

```markdown
## デバッグチェックリスト

### エラー発生時
- [ ] エラーメッセージの確認
- [ ] スタックトレースの確認
- [ ] ログの確認
- [ ] 入力データの検証
- [ ] 権限設定の確認

### パフォーマンス問題
- [ ] 実行時間の計測
- [ ] API呼び出し回数の確認
- [ ] キャッシュヒット率の確認
- [ ] データ量の確認
- [ ] 並列処理の検討

### データ不整合
- [ ] トランザクション境界の確認
- [ ] 同時実行制御の確認
- [ ] キャッシュの無効化
- [ ] データベースの整合性チェック
- [ ] バックアップからの復元
```