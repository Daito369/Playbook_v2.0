# PolicyPlayBook UI/UXフロー仕様書

## 1. UIデザイン原則

### 1.1 基本原則
- **Progressive Disclosure**: 段階的に情報を開示
- **Immediate Feedback**: リアルタイムフィードバック
- **Error Prevention**: エラー防止優先
- **Consistency**: 一貫性のある操作体験
- **Accessibility**: WCAG 2.1 AA準拠

### 1.2 デザインシステム
- **カラーパレット**:
  - Primary: #0d6efd (Google Blue)
  - Success: #198754
  - Warning: #ffc107
  - Danger: #dc3545
  - Info: #0dcaf0

## 2. 画面構成

### 2.1 レイアウト構造

```
┌─────────────────────────────────────────────┐
│              Header (固定)                   │
├──────────┬──────────────────────────────────┤
│          │                                  │
│  Sidebar │        Main Content Area         │
│  (Step   │         (Dynamic Forms)          │
│   Nav)   │                                  │
│          │                                  │
├──────────┴──────────────────────────────────┤
│           Footer (ステータスバー)            │
└─────────────────────────────────────────────┘
```

### 2.2 コンポーネント階層

```
App
├── Header
│   ├── Logo
│   ├── UserInfo
│   └── Settings
├── WorkflowContainer
│   ├── StepIndicator
│   ├── StepNavigation
│   └── StepContent
│       ├── TypeSelector
│       ├── PolicySelector
│       ├── StatusSelector
│       ├── DynamicForm
│       └── Preview
└── Footer
    ├── ProgressBar
    └── ActionButtons
```

## 3. ワークフローUI詳細

### 3.1 Step 1: 審査種類選択

**UI要素:**
```html
<div class="step-container">
  <h2>審査種類を選択してください</h2>
  <div class="card-grid">
    <div class="selection-card" data-type="misreview">
      <i class="fas fa-exclamation-triangle"></i>
      <h3>誤審査</h3>
      <p>誤った審査結果の修正</p>
    </div>
    <div class="selection-card" data-type="disapproval">
      <i class="fas fa-times-circle"></i>
      <h3>不承認</h3>
      <p>ポリシー違反による不承認</p>
    </div>
    <div class="selection-card" data-type="certification">
      <i class="fas fa-certificate"></i>
      <h3>Cert 認定</h3>
      <p>認定申請の処理</p>
    </div>
    <div class="selection-card" data-type="other">
      <i class="fas fa-ellipsis-h"></i>
      <h3>その他</h3>
      <p>その他の対応</p>
    </div>
  </div>
</div>
```

**インタラクション:**
- ホバー時: カードが浮き上がる（shadow効果）
- クリック時: 選択状態を表示（border強調）
- 選択後: 自動的に次ステップへ遷移

### 3.2 Step 2: ポリシー選択

**UI要素:**
```html
<div class="policy-selector">
  <div class="category-dropdown">
    <label>大カテゴリ</label>
    <select id="mainCategory">
      <option>選択してください</option>
      <option>不実表示</option>
      <option>危険な商品やサービス</option>
    </select>
  </div>
  <div class="subcategory-dropdown">
    <label>小カテゴリ</label>
    <select id="subCategory" disabled>
      <option>大カテゴリを選択してください</option>
    </select>
  </div>
  <div class="policy-preview">
    <!-- 選択されたポリシーの説明を表示 -->
  </div>
</div>
```

**動的挙動:**
- 大カテゴリ選択時: 小カテゴリを動的に更新
- 検索機能: インクリメンタルサーチ対応
- 履歴表示: 最近使用したポリシーを表示

### 3.3 Step 3: 状態選択

**条件付き表示ロジック:**
```javascript
const stateOptions = {
  misreview: ['誤審査'],
  disapproval: ['不承認（審査部署から回答あり）', '不承認（推測）'],
  certification: ['承認', '不承認'],
  other: ['その他（Need info）', 'AT/followmail', '強制停止']
};
```

### 3.4 Step 4-5: 動的フォーム

**フォーム生成ロジック:**
```javascript
// 条件に応じた入力フィールドの動的生成
if (state === '不承認（回答あり）') {
  showFields([
    { type: 'checkbox', name: 'dnw', label: 'DNW/不正なソフトウェア' },
    { type: 'text', name: 'eid', label: 'EID', validation: 'ecid' },
    { type: 'text', name: 'customerName', label: 'CU name' },
    { type: 'text', name: 'contactPerson', label: 'CP name' },
    { type: 'select', name: 'adType', options: ['広告', 'P-MAX'] },
    { type: 'textarea', name: 'inquiry', label: 'お問い合わせ内容' }
  ]);
}
```

## 4. インタラクションパターン

### 4.1 フォームバリデーション

**リアルタイムバリデーション:**
```javascript
// ECIDフォーマットチェック
onInput: (value) => {
  if (!/^\d{10}$/.test(value)) {
    showError('ECIDは10桁の数字で入力してください');
  } else {
    showSuccess('正しい形式です');
  }
}
```

### 4.2 プログレスインジケーター

```html
<div class="progress-indicator">
  <div class="step completed">1. 種類選択</div>
  <div class="step active">2. ポリシー選択</div>
  <div class="step">3. 状態選択</div>
  <div class="step">4. 詳細入力</div>
  <div class="step">5. 確認・生成</div>
</div>
```

### 4.3 ライブプレビュー

**実装方法:**
```javascript
// 入力値の変更を監視してプレビューを更新
const updatePreview = debounce(() => {
  const formData = collectFormData();
  const preview = generatePreview(templateContent, formData);
  previewContainer.innerHTML = highlightVariables(preview);
}, 300);
```

## 5. レスポンシブデザイン

### 5.1 ブレークポイント
- **Desktop**: 1200px以上
- **Tablet**: 768px - 1199px
- **Mobile**: 767px以下

### 5.2 モバイル最適化
```css
@media (max-width: 767px) {
  .card-grid { 
    grid-template-columns: 1fr; 
  }
  .sidebar { 
    position: fixed;
    transform: translateX(-100%);
  }
  .step-indicator {
    display: flex;
    overflow-x: auto;
  }
}
```

## 6. アニメーション仕様

### 6.1 トランジション
```css
.step-transition {
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from { 
    opacity: 0; 
    transform: translateX(20px); 
  }
  to { 
    opacity: 1; 
    transform: translateX(0); 
  }
}
```

### 6.2 ローディング状態
```html
<div class="loading-spinner">
  <div class="spinner-border text-primary">
    <span class="sr-only">処理中...</span>
  </div>
  <p>テンプレートを生成しています...</p>
</div>
```

## 7. エラーハンドリングUI

### 7.1 エラー表示パターン

**インラインエラー:**
```html
<div class="form-group has-error">
  <input type="text" class="form-control is-invalid">
  <div class="invalid-feedback">
    このフィールドは必須です
  </div>
</div>
```

**トースト通知:**
```javascript
showToast({
  type: 'error',
  title: 'エラー',
  message: 'テンプレートの取得に失敗しました',
  duration: 5000
});
```

## 8. アクセシビリティ

### 8.1 キーボードナビゲーション
- Tab: 次の要素へ
- Shift+Tab: 前の要素へ
- Enter: 選択/送信
- Esc: キャンセル/閉じる
- Arrow Keys: リスト項目の移動

### 8.2 スクリーンリーダー対応
```html
<button aria-label="次のステップへ進む" role="button">
  次へ
  <span class="sr-only">ポリシー選択ステップへ</span>
</button>
```

### 8.3 カラーコントラスト
- 通常テキスト: 4.5:1以上
- 大きいテキスト: 3:1以上
- アクティブUI要素: 3:1以上

## 9. パフォーマンス最適化

### 9.1 遅延読み込み
```javascript
// 必要時のみコンポーネントを読み込み
const loadComponent = async (componentName) => {
  const module = await import(`./components/${componentName}.js`);
  return module.default;
};
```

### 9.2 仮想スクロール
```javascript
// 大量のリストアイテムの仮想化
<VirtualList
  items={policyList}
  itemHeight={60}
  visibleItems={10}
/>
```