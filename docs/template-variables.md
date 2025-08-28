# PolicyPlayBook テンプレート変数一覧

## 1. 基本変数

### 1.1 ユーザー情報
| 変数名 | 表示名 | 型 | 必須 | デフォルト値 | 説明 |
|--------|--------|-----|------|-------------|------|
| `contactName` | 連絡先名 | text | ✓ | - | お客様の名前（メール冒頭と本文で使用） |
| `myName` | 自分の名字 | text | ✓ | - | 送信者（サポート担当者）の名字 |
| `ecid` | ECID | text | ✓ | - | 10桁のECID（ハイフンなし） |
| `formattedECID` | フォーマット済みECID | auto | - | - | 自動生成: XXX-XXX-XXXX形式 |

### 1.2 問い合わせ情報
| 変数名 | 表示名 | 型 | 必須 | デフォルト値 | 説明 |
|--------|--------|-----|------|-------------|------|
| `overview` | お問い合わせ内容 | textarea | ✓ | - | お客様からの問い合わせ内容 |
| `detailedPolicy` | ポリシー名 | text | ✓ | - | 対象のポリシー名 |

## 2. 選択式変数

### 2.1 Opening（挨拶文）
| 変数名 | 値 | ラベル | 使用場面 |
|--------|-----|--------|----------|
| `opening` | 0 | お問い合わせをいただき誠にありがとうございます。 | 通常営業時 |
| `opening` | 1 | ご連絡をお待たせし申し訳ございません。 | 24時間以上経過/迅速な返信を求められた場合 |

### 2.2 Channel（問い合わせチャネル）
| 変数名 | 値 | ラベル | 対応チャネル |
|--------|-----|--------|-------------|
| `channel` | 0 | チャットにて | Chat |
| `channel` | 1 | お電話にて | Phone |
| `channel` | 2 | お問い合わせフォームより | OpenE |
| `channel` | 3 | メールのご返信にて | Re-Open |

### 2.3 Status（ステータス）
| 変数名 | 値 | ラベル | 説明 |
|--------|-----|--------|------|
| `status` | 0 | 制限付き | 広告が制限付きステータスの場合 |
| `status` | 1 | 不承認 | 広告が不承認ステータスの場合 |

### 2.4 AdType（広告タイプ）
| 変数名 | 値 | ラベル | 説明 |
|--------|-----|--------|------|
| `adtype` | 広告 | 広告 | 通常の広告 |
| `adtype` | アセットグループ | アセットグループ | P-MAXキャンペーンの場合 |

## 3. 条件付き変数

### 3.1 誤審査フロー専用
| 変数名 | 表示名 | 型 | 表示条件 | 説明 |
|--------|--------|-----|----------|------|
| `statusText` | ステータステキスト | auto | workflow_type="誤審査" | 自動変換: 0→"制限付き", 1→"不承認" |

### 3.2 不承認フロー専用
| 変数名 | 表示名 | 型 | 表示条件 | 説明 |
|--------|--------|-----|----------|------|
| `dnw` | DNW/不正なソフトウェア | checkbox | status="不承認(回答あり)" | 特定のポリシー違反フラグ |
| `customerName` | CU name | text | status="不承認(回答あり)" | 顧客名 |
| `contactPerson` | CP name | text | status="不承認(回答あり)" | 担当者名 |
| `inquiry` | お問い合わせ内容 | textarea | status="不承認(回答あり)" | 詳細な問い合わせ内容 |
| `violationDetails` | 抵触箇所 | textarea | status="不承認(推測)" | ポリシー違反の詳細 |

### 3.3 認定フロー専用
| 変数名 | 表示名 | 型 | 表示条件 | 説明 |
|--------|--------|-----|----------|------|
| `certName` | 認定の種類 | text | workflow_type="認定" | 認定カテゴリ名 |
| `certEcid` | 認定アカウント | text | workflow_type="認定" | 認定されたアカウントID |
| `certDomain` | 認定ドメイン | text | workflow_type="認定" | 認定されたドメイン |
| `thankYouNote` | お礼メッセージ | checkbox | status="承認" | SSのお礼を含めるか |
| `restrictedNotation` | 制限付き表記 | text | status="承認" | 制限事項の記載 |
| `safeSearchRequired` | セーフサーチ有無 | checkbox | status="承認" | セーフサーチ設定の必要性 |
| `appealRequired` | 再審査を上げるか | checkbox | status="承認" | 再審査請求の必要性 |

### 3.4 その他フロー専用
| 変数名 | 表示名 | 型 | 表示条件 | 説明 |
|--------|--------|-----|----------|------|
| `delayReason` | 遅れる理由 | select | workflow_type="その他" | 回答遅延の理由選択 |
| `replyDate` | 返信予定日 | date | workflow_type="その他" | 返信予定日の設定 |
| `firstOrNot` | 初回でない | checkbox | workflow_type="その他" | TAT設定が初回でない場合 |
| `selfOrNot` | Consult返答待ち | checkbox | workflow_type="その他" | Consult返答待ちの場合 |

## 4. 遅延理由選択肢

| 変数名 | 値 | ラベル |
|--------|-----|--------|
| `delayReason` | 1 | 現在確認を行っておりますが、窓口混雑のため調査完了までにお時間を頂戴しております。 |
| `delayReason` | 2 | 現在社内で確認中の状況でございます。 |
| `delayReason` | 3 | 引き続き担当部署へ確認中の状況でございます。 |

## 5. 自動生成変数

### 5.1 日付関連
| 変数名 | 説明 | フォーマット | 例 |
|--------|------|-------------|-----|
| `today` | 本日の日付 | M月D日 | 1月1日 |
| `formattedDate` | フォーマット済み日付 | M月D日 | 1月1日 |
| `formattedReplyDate` | フォーマット済み返信予定日 | M月D日 | 1月2日 |
| `nextBusinessDay` | 次の営業日 | M月D日 | 1月4日 |
| `timestamp` | タイムスタンプ | YYYY-MM-DD HH:MM:SS | 2024-01-01 12:00:00 |

### 5.2 システム変数
| 変数名 | 説明 | 値 |
|--------|------|-----|
| `version` | システムバージョン | 2.0 |
| `appName` | アプリケーション名 | PolicyPlayBook |
| `workflowId` | ワークフローID | WF_20240101_001 |
| `templateId` | 使用テンプレートID | TMPL_001 |

## 6. 変数の使用例

### 6.1 基本的な変数置換
```handlebars
{{contactName}} 様

平素よりお世話になっております。
Google 広告サポートチームの{{myName}}でございます。
```

### 6.2 選択式変数の使用
```handlebars
この度は、{{openings[opening]}}
{{channels[channel]}}頂戴したご質問の内容について、以下のとおりご案内いたします。
```

### 6.3 条件付き表示
```handlebars
{{#if firstOrNot}}
なお、TAT設定は初回ではございません。
{{/if}}

{{#if dnw}}
DNW/不正なソフトウェアに関する追加対応が必要です。
{{/if}}
```

### 6.4 ループ処理
```handlebars
{{#each violations}}
- {{this.policy}}: {{this.description}}
{{/each}}
```

## 7. カスタム変数の追加方法

### 7.1 Variables シートへの追加
```javascript
{
  variable_name: "customVariable",
  display_name: "カスタム変数",
  variable_type: "text",
  is_required: false,
  default_value: "",
  validation_rule: "^[a-zA-Z0-9]+$",
  placeholder: "英数字で入力",
  help_text: "カスタム変数の説明",
  sort_order: 100,
  is_active: true
}
```

### 7.2 テンプレートでの使用
```handlebars
{{customVariable}}
```

### 7.3 条件付き変数の定義
```javascript
{
  variable_name: "conditionalVar",
  display_name: "条件付き変数",
  dependencies: {
    "requires": ["workflow_type"],
    "conditions": {
      "workflow_type": ["misreview", "disapproval"]
    }
  }
}
```

## 8. 変数のバリデーションルール

### 8.1 組み込みバリデーター
| ルール | 説明 | 正規表現 |
|--------|------|----------|
| ecid_format | ECID形式 | `^\d{10}$` |
| email_format | メール形式 | `^[^\s@]+@[^\s@]+\.[^\s@]+$` |
| date_format | 日付形式 | `^\d{4}-\d{2}-\d{2}$` |
| url_format | URL形式 | `^https?://.*` |
| phone_format | 電話番号形式 | `^[0-9-]+$` |

### 8.2 カスタムバリデーター
```javascript
function validateCustomField(value, field) {
  // カスタムバリデーションロジック
  if (field.name === 'certDomain') {
    return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(value);
  }
  return true;
}
```