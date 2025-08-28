/**
 * PolicyPlayBook - 初期セットアップスクリプト
 * @fileoverview システムの初期設定とデータベース構築を自動化
 * @version 2.0.0
 * @author PolicyPlayBook Team
 * @lastmodified 2024-01-01
 */

// ===========================
// メインセットアップ関数
// ===========================

/**
 * 初期セットアップのエントリーポイント
 * この関数を実行することで、システム全体が自動的にセットアップされます
 */
function runInitialSetup() {
  try {
    console.log('🚀 PolicyPlayBook Initial Setup Starting...');
    
    // セットアップウィザードを表示
    const result = showSetupWizard();
    if (!result) {
      console.log('Setup cancelled by user');
      return;
    }
    
    const config = result.config;
    
    // 1. スプレッドシートの作成・設定
    const spreadsheetId = setupDatabase(config);
    
    // 2. 設定ファイルの更新
    updateConfiguration(spreadsheetId, config);
    
    // 3. 初期データの投入
    populateInitialData(spreadsheetId, config);
    
    // 4. 権限設定
    setupPermissions(spreadsheetId, config);
    
    // 5. トリガー設定
    setupTriggers();
    
    // 6. 検証
    const validation = validateSetup(spreadsheetId);
    
    // 7. 完了レポート生成
    generateSetupReport(spreadsheetId, validation);
    
    console.log('✅ PolicyPlayBook Initial Setup Completed Successfully!');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    showErrorDialog(error);
    throw error;
  }
}

// ===========================
// セットアップウィザード
// ===========================

/**
 * セットアップウィザードUIを表示
 * @returns {Object} ユーザー入力設定
 */
function showSetupWizard() {
  const html = HtmlService.createTemplateFromFile('setup-wizard')
    .evaluate()
    .setWidth(600)
    .setHeight(500);
  
  const result = SpreadsheetApp.getUi()
    .showModalDialog(html, 'PolicyPlayBook セットアップウィザード');
  
  // ユーザー入力を取得
  const userProperties = PropertiesService.getUserProperties();
  const config = JSON.parse(userProperties.getProperty('SETUP_CONFIG') || '{}');
  
  if (!config.confirmed) {
    return null;
  }
  
  return { config };
}

// ===========================
// データベースセットアップ
// ===========================

/**
 * スプレッドシートデータベースを作成・設定
 * @param {Object} config - 設定オブジェクト
 * @returns {string} 作成されたスプレッドシートのID
 */
function setupDatabase(config) {
  console.log('📊 Creating database spreadsheet...');
  
  // 新規スプレッドシート作成
  const spreadsheet = SpreadsheetApp.create(
    `PolicyPlayBook Database - ${config.environment || 'Production'}`
  );
  const spreadsheetId = spreadsheet.getId();
  
  // 各シートを作成
  createTemplatesSheet(spreadsheet);
  createVariablesSheet(spreadsheet);
  createOptionsSheet(spreadsheet);
  createWorkflowConfigSheet(spreadsheet);
  createPolicyCategoriesSheet(spreadsheet);
  createAuditLogSheet(spreadsheet);
  createCacheSheet(spreadsheet);
  
  console.log(`✅ Database created: ${spreadsheetId}`);
  return spreadsheetId;
}

/**
 * Templates シートを作成
 */
function createTemplatesSheet(spreadsheet) {
  const sheet = spreadsheet.getActiveSheet();
  sheet.setName('Templates');
  
  // ヘッダー設定
  const headers = [
    'template_id', 'workflow_type', 'category', 'subcategory',
    'template_name', 'template_content', 'required_variables',
    'optional_variables', 'conditions', 'workflow_step',
    'is_active', 'version', 'created_at', 'updated_at',
    'created_by', 'notes'
  ];
  
  // ヘッダー行を設定
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setBackground('#4285f4');
  headerRange.setFontColor('#ffffff');
  headerRange.setFontWeight('bold');
  
  // 列幅を設定
  const columnWidths = [
    150, 120, 120, 120, 200, 400, 200, 200, 150, 80,
    80, 80, 120, 120, 120, 200
  ];
  columnWidths.forEach((width, index) => {
    sheet.setColumnWidth(index + 1, width);
  });
  
  // データ検証を設定
  setupTemplatesValidation(sheet);
  
  // フィルターを設定
  sheet.getRange(1, 1, 1, headers.length).createFilter();
}

/**
 * Variables シートを作成
 */
function createVariablesSheet(spreadsheet) {
  const sheet = spreadsheet.insertSheet('Variables');
  
  const headers = [
    'variable_name', 'display_name', 'variable_type', 'input_type',
    'is_required', 'default_value', 'validation_rule', 'placeholder',
    'help_text', 'options_source', 'dependencies', 'sort_order',
    'group_name', 'is_active'
  ];
  
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setBackground('#34a853');
  headerRange.setFontColor('#ffffff');
  headerRange.setFontWeight('bold');
  
  // 列幅設定
  const columnWidths = [
    150, 150, 100, 100, 80, 150, 200, 150,
    200, 150, 200, 80, 120, 80
  ];
  columnWidths.forEach((width, index) => {
    sheet.setColumnWidth(index + 1, width);
  });
  
  // データ検証
  setupVariablesValidation(sheet);
  
  // フィルター設定
  sheet.getRange(1, 1, 1, headers.length).createFilter();
}

/**
 * Options シートを作成
 */
function createOptionsSheet(spreadsheet) {
  const sheet = spreadsheet.insertSheet('Options');
  
  const headers = [
    'option_id', 'variable_name', 'option_value', 'option_label',
    'condition', 'sort_order', 'is_default', 'is_active', 'metadata'
  ];
  
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setBackground('#fbbc04');
  headerRange.setFontColor('#ffffff');
  headerRange.setFontWeight('bold');
  
  // 列幅設定
  const columnWidths = [
    100, 150, 100, 300, 200, 80, 80, 80, 200
  ];
  columnWidths.forEach((width, index) => {
    sheet.setColumnWidth(index + 1, width);
  });
  
  // データ検証
  setupOptionsValidation(sheet);
  
  // フィルター設定
  sheet.getRange(1, 1, 1, headers.length).createFilter();
}

/**
 * WorkflowConfig シートを作成
 */
function createWorkflowConfigSheet(spreadsheet) {
  const sheet = spreadsheet.insertSheet('WorkflowConfig');
  
  const headers = [
    'workflow_id', 'workflow_type', 'step_number', 'step_name',
    'step_type', 'options', 'next_step', 'required_fields',
    'validation_rules', 'is_terminal'
  ];
  
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setBackground('#ea4335');
  headerRange.setFontColor('#ffffff');
  headerRange.setFontWeight('bold');
  
  // 列幅設定
  const columnWidths = [
    100, 120, 80, 150, 100, 300, 200, 300, 300, 80
  ];
  columnWidths.forEach((width, index) => {
    sheet.setColumnWidth(index + 1, width);
  });
  
  // フィルター設定
  sheet.getRange(1, 1, 1, headers.length).createFilter();
}

/**
 * PolicyCategories シートを作成
 */
function createPolicyCategoriesSheet(spreadsheet) {
  const sheet = spreadsheet.insertSheet('PolicyCategories');
  
  const headers = [
    'category_id', 'parent_category', 'category_name', 'category_path',
    'display_order', 'workflow_types', 'icon', 'description', 'is_active'
  ];
  
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setBackground('#9333ea');
  headerRange.setFontColor('#ffffff');
  headerRange.setFontWeight('bold');
  
  // 列幅設定
  const columnWidths = [
    100, 150, 150, 200, 80, 200, 100, 300, 80
  ];
  columnWidths.forEach((width, index) => {
    sheet.setColumnWidth(index + 1, width);
  });
  
  // フィルター設定
  sheet.getRange(1, 1, 1, headers.length).createFilter();
}

/**
 * AuditLog シートを作成
 */
function createAuditLogSheet(spreadsheet) {
  const sheet = spreadsheet.insertSheet('AuditLog');
  
  const headers = [
    'log_id', 'timestamp', 'user_email', 'action', 'entity_type',
    'entity_id', 'old_value', 'new_value', 'ip_address', 'user_agent'
  ];
  
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setBackground('#6b7280');
  headerRange.setFontColor('#ffffff');
  headerRange.setFontWeight('bold');
  
  // 列幅設定
  const columnWidths = [
    100, 150, 200, 100, 100, 150, 300, 300, 120, 200
  ];
  columnWidths.forEach((width, index) => {
    sheet.setColumnWidth(index + 1, width);
  });
  
  // フィルター設定
  sheet.getRange(1, 1, 1, headers.length).createFilter();
}

/**
 * Cache シートを作成
 */
function createCacheSheet(spreadsheet) {
  const sheet = spreadsheet.insertSheet('Cache');
  
  const headers = [
    'cache_key', 'cache_value', 'ttl', 'created_at', 'expires_at', 'hit_count'
  ];
  
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setBackground('#10b981');
  headerRange.setFontColor('#ffffff');
  headerRange.setFontWeight('bold');
  
  // 列幅設定
  const columnWidths = [200, 400, 100, 150, 150, 80];
  columnWidths.forEach((width, index) => {
    sheet.setColumnWidth(index + 1, width);
  });
}

// ===========================
// データ検証設定
// ===========================

/**
 * Templates シートのデータ検証を設定
 */
function setupTemplatesValidation(sheet) {
  // workflow_type の検証
  const workflowTypeRange = sheet.getRange(2, 2, 1000, 1);
  const workflowTypeRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['誤審査', '不承認', '認定', 'その他'], true)
    .build();
  workflowTypeRange.setDataValidation(workflowTypeRule);
  
  // is_active の検証
  const isActiveRange = sheet.getRange(2, 11, 1000, 1);
  const isActiveRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['TRUE', 'FALSE'], true)
    .build();
  isActiveRange.setDataValidation(isActiveRule);
}

/**
 * Variables シートのデータ検証を設定
 */
function setupVariablesValidation(sheet) {
  // variable_type の検証
  const typeRange = sheet.getRange(2, 3, 1000, 1);
  const typeRule = SpreadsheetApp.newDataValidation()
    .requireValueInList([
      'text', 'email', 'tel', 'number', 'textarea',
      'select', 'date', 'datetime-local', 'checkbox',
      'radio', 'range'
    ], true)
    .build();
  typeRange.setDataValidation(typeRule);
  
  // is_required の検証
  const requiredRange = sheet.getRange(2, 5, 1000, 1);
  const requiredRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['TRUE', 'FALSE'], true)
    .build();
  requiredRange.setDataValidation(requiredRule);
  
  // is_active の検証
  const activeRange = sheet.getRange(2, 14, 1000, 1);
  const activeRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['TRUE', 'FALSE'], true)
    .build();
  activeRange.setDataValidation(activeRule);
}

/**
 * Options シートのデータ検証を設定
 */
function setupOptionsValidation(sheet) {
  // is_default の検証
  const defaultRange = sheet.getRange(2, 7, 1000, 1);
  const defaultRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['TRUE', 'FALSE'], true)
    .build();
  defaultRange.setDataValidation(defaultRule);
  
  // is_active の検証
  const activeRange = sheet.getRange(2, 8, 1000, 1);
  const activeRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['TRUE', 'FALSE'], true)
    .build();
  activeRange.setDataValidation(activeRule);
}

// ===========================
// 設定更新
// ===========================

/**
 * 設定ファイルを更新
 */
function updateConfiguration(spreadsheetId, config) {
  console.log('⚙️ Updating configuration...');
  
  // Script Properties に保存
  const scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperties({
    'SPREADSHEET_ID': spreadsheetId,
    'ENVIRONMENT': config.environment || 'production',
    'ADMIN_EMAIL': config.adminEmail || Session.getActiveUser().getEmail(),
    'SETUP_DATE': new Date().toISOString(),
    'VERSION': '2.0.0'
  });
  
  // appsscript.json を更新
  updateManifest(config);
  
  console.log('✅ Configuration updated');
}

/**
 * マニフェストファイルを更新
 */
function updateManifest(config) {
  // このファイルは手動で更新する必要があります
  console.log('📝 Please update appsscript.json manually with the following:');
  console.log({
    timeZone: config.timeZone || 'Asia/Tokyo',
    dependencies: {},
    webapp: {
      access: 'MYSELF',
      executeAs: 'USER_DEPLOYING'
    },
    exceptionLogging: 'STACKDRIVER',
    oauthScopes: [
      'https://www.googleapis.com/auth/script.container.ui',
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/script.external_request',
      'https://www.googleapis.com/auth/userinfo.email'
    ]
  });
}

// ===========================
// 初期データ投入
// ===========================

/**
 * 初期データを投入
 */
function populateInitialData(spreadsheetId, config) {
  console.log('📝 Populating initial data...');
  
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  
  // Variables データ
  insertInitialVariables(spreadsheet);
  
  // Options データ
  insertInitialOptions(spreadsheet);
  
  // PolicyCategories データ
  insertInitialCategories(spreadsheet);
  
  // WorkflowConfig データ
  insertInitialWorkflows(spreadsheet);
  
  // Templates データ（サンプル）
  if (config.includeSamples) {
    insertSampleTemplates(spreadsheet);
  }
  
  console.log('✅ Initial data populated');
}

/**
 * 初期変数データを挿入
 */
function insertInitialVariables(spreadsheet) {
  const sheet = spreadsheet.getSheetByName('Variables');
  const data = [
    // 基本変数
    ['contactName', '連絡先名', 'text', 'textfield', true, '', '', '', '顧客の名前を入力してください', '', '{}', 1, '基本情報', true],
    ['myName', '自分の名字', 'text', 'textfield', true, '', '', '', '担当者の名字を入力してください', '', '{}', 2, '基本情報', true],
    ['opening', 'Opening', 'select', 'select', true, '0', '', '', '適切なオープニングを選択してください', 'Options:opening', '{}', 3, '基本情報', true],
    ['channel', 'Channel', 'select', 'select', true, '0', '', '', '問い合わせチャンネルを選択してください', 'Options:channel', '{}', 4, '基本情報', true],
    ['overview', 'お問い合わせ内容', 'textarea', 'textarea', true, '', '', '', '具体的な問い合わせ内容を記載してください', '', '{}', 5, '詳細情報', true],
    ['ecid', 'ECID', 'text', 'textfield', true, '', '^\\d{10}$', '1234567890', '10桁のECIDを入力してください（ハイフンなし）', '', '{}', 6, '詳細情報', true],
    ['detailedPolicy', 'ポリシー名', 'text', 'textfield', true, '', '', '', '対象のポリシー名を入力してください', '', '{}', 7, '詳細情報', true],
    ['status', 'ステータス', 'select', 'select', true, '0', '', '', '当初のステータスを選択してください', 'Options:status', '{}', 8, '詳細情報', true],
    ['adtype', '広告タイプ', 'select', 'select', true, '広告', '', '', 'P-MAXの場合はアセットグループを選択', 'Options:adtype', '{}', 9, '詳細情報', true],
    
    // 条件付き変数
    ['delayReason', '遅れる理由', 'select', 'select', false, '0', '', '', '遅れる理由を選択してください', 'Options:delayReason', '{"workflow_type":"その他"}', 10, 'その他', true],
    ['replyDate', '返信予定日', 'date', 'date', false, '', '', '', '返信予定日を選択してください', '', '{"workflow_type":"その他"}', 11, 'その他', true],
    ['firstOrNot', '初回でない', 'checkbox', 'checkbox', false, 'false', '', '', 'TAT設定が初回でない場合はチェック', '', '{"workflow_type":"その他"}', 12, 'その他', true],
    ['selfOrNot', 'Consult返答待ち', 'checkbox', 'checkbox', false, 'false', '', '', 'Consult返答待ちの場合はチェック', '', '{"workflow_type":"その他"}', 13, 'その他', true],
    
    // 認定関連
    ['certName', '認定の種類', 'text', 'textfield', false, '', '', 'オンラインギャンブル関連広告', '認定の種類を入力', '', '{"workflow_type":"認定"}', 14, '認定', true],
    ['certEcid', '認定アカウント', 'text', 'textfield', false, '', '', '123-456-7890', '認定されたアカウントIDを入力', '', '{"workflow_type":"認定"}', 15, '認定', true],
    ['certDomain', '認定ドメイン', 'text', 'textfield', false, '', '', 'example.com', '認定されたドメインを入力', '', '{"workflow_type":"認定"}', 16, '認定', true]
  ];
  
  if (data.length > 0) {
    sheet.getRange(2, 1, data.length, data[0].length).setValues(data);
  }
}

/**
 * 初期オプションデータを挿入
 */
function insertInitialOptions(spreadsheet) {
  const sheet = spreadsheet.getSheetByName('Options');
  const data = [
    // Opening オプション
    ['OPT_001', 'opening', '0', 'お問い合わせをいただき誠にありがとうございます。', '{}', 1, false, true, '{"usage":"通常営業時"}'],
    ['OPT_002', 'opening', '1', 'ご連絡をお待たせし申し訳ございません。', '{}', 2, false, true, '{"usage":"24時間以上経過"}'],
    
    // Channel オプション
    ['OPT_003', 'channel', '0', 'チャットにて', '{}', 1, false, true, '{"type":"Chat"}'],
    ['OPT_004', 'channel', '1', 'お電話にて', '{}', 2, false, true, '{"type":"Phone"}'],
    ['OPT_005', 'channel', '2', 'お問い合わせフォームより', '{}', 3, false, true, '{"type":"OpenE"}'],
    ['OPT_006', 'channel', '3', 'メールのご返信にて', '{}', 4, false, true, '{"type":"Re-Open"}'],
    
    // Status オプション
    ['OPT_007', 'status', '0', '制限付き', '{}', 1, false, true, '{}'],
    ['OPT_008', 'status', '1', '不承認', '{}', 2, false, true, '{}'],
    
    // AdType オプション
    ['OPT_009', 'adtype', '広告', '広告', '{}', 1, true, true, '{}'],
    ['OPT_010', 'adtype', 'アセットグループ', 'アセットグループ', '{}', 2, false, true, '{"campaign_type":"P-MAX"}'],
    
    // DelayReason オプション
    ['OPT_011', 'delayReason', '1', '現在確認を行っておりますが、窓口混雑のため調査完了までにお時間を頂戴しております。', '{"workflow_type":"その他"}', 1, false, true, '{}'],
    ['OPT_012', 'delayReason', '2', '現在社内で確認中の状況でございます。', '{"workflow_type":"その他"}', 2, false, true, '{}'],
    ['OPT_013', 'delayReason', '3', '引き続き担当部署へ確認中の状況でございます。', '{"workflow_type":"その他"}', 3, false, true, '{}']
  ];
  
  if (data.length > 0) {
    sheet.getRange(2, 1, data.length, data[0].length).setValues(data);
  }
}

/**
 * 初期カテゴリデータを挿入
 */
function insertInitialCategories(spreadsheet) {
  const sheet = spreadsheet.getSheetByName('PolicyCategories');
  const data = [
    ['CAT_001', '', '不実表示', '/不実表示', 1, '["誤審査","不承認"]', 'fas fa-exclamation', '誤解を招く表現に関するポリシー', true],
    ['CAT_002', 'CAT_001', '信頼できない文言', '/不実表示/信頼できない文言', 1, '["誤審査","不承認"]', '', '信頼性に欠ける表現', true],
    ['CAT_003', 'CAT_001', '誤解を招く表現', '/不実表示/誤解を招く表現', 2, '["誤審査","不承認"]', '', '誤解を与える可能性のある表現', true],
    ['CAT_004', '', '危険な商品やサービス', '/危険な商品やサービス', 2, '["不承認"]', 'fas fa-warning', '危険物に関するポリシー', true],
    ['CAT_005', '', 'ビジネス情報の要件', '/ビジネス情報の要件', 3, '["誤審査","不承認"]', 'fas fa-building', 'ビジネス情報に関する要件', true],
    ['CAT_006', '', 'YouTube広告の要件', '/YouTube広告の要件', 4, '["不承認"]', 'fab fa-youtube', 'YouTube特有の広告要件', true],
    ['CAT_007', '', '編集', '/編集', 5, '["不承認"]', 'fas fa-edit', '広告の編集に関する要件', true],
    ['CAT_008', '', 'リンク先の要件', '/リンク先の要件', 6, '["誤審査","不承認"]', 'fas fa-link', 'リンク先ページの要件', true],
    ['CAT_009', '', 'ヘルスケア、医薬品', '/ヘルスケア、医薬品', 7, '["不承認"]', 'fas fa-medkit', '医療・健康関連のポリシー', true],
    ['CAT_010', '', '法的要件', '/法的要件', 8, '["不承認"]', 'fas fa-gavel', '法的な要件', true]
  ];
  
  if (data.length > 0) {
    sheet.getRange(2, 1, data.length, data[0].length).setValues(data);
  }
}

/**
 * 初期ワークフロー設定を挿入
 */
function insertInitialWorkflows(spreadsheet) {
  const sheet = spreadsheet.getSheetByName('WorkflowConfig');
  const data = [
    // 誤審査ワークフロー
    ['WF_001', '誤審査', 1, '審査種類選択', 'selection', '["誤審査"]', '{"誤審査":2}', '[]', '{}', false],
    ['WF_002', '誤審査', 2, 'ポリシー選択', 'policy_selection', '[]', '{"*":3}', '[]', '{}', false],
    ['WF_003', '誤審査', 3, '状態選択', 'status_selection', '["誤審査"]', '{"誤審査":4}', '[]', '{}', false],
    ['WF_004', '誤審査', 4, '詳細入力', 'form_input', '[]', '{"*":5}', '["contactName","myName","opening","channel","overview","ecid","detailedPolicy","status","adtype"]', '{"ecid":"^\\\\d{10}$"}', false],
    ['WF_005', '誤審査', 5, '確認・生成', 'generation', '[]', '{}', '[]', '{}', true],
    
    // 不承認ワークフロー
    ['WF_006', '不承認', 1, '審査種類選択', 'selection', '["不承認"]', '{"不承認":2}', '[]', '{}', false],
    ['WF_007', '不承認', 2, 'ポリシー選択', 'policy_selection', '[]', '{"*":3}', '[]', '{}', false],
    ['WF_008', '不承認', 3, '状態選択', 'status_selection', '["不承認（審査部署から回答あり）","不承認（推測）"]', '{"*":4}', '[]', '{}', false],
    ['WF_009', '不承認', 4, '詳細入力', 'conditional_form', '[]', '{"*":5}', '[]', '{}', false],
    ['WF_010', '不承認', 5, '確認・生成', 'generation', '[]', '{}', '[]', '{}', true],
    
    // 認定ワークフロー
    ['WF_011', '認定', 1, '審査種類選択', 'selection', '["認定"]', '{"認定":2}', '[]', '{}', false],
    ['WF_012', '認定', 2, '認定カテゴリ選択', 'certification_category', '["オンラインギャンブル","出会い系","ヘルスケア","遠隔医療","債務関連"]', '{"*":3}', '[]', '{}', false],
    ['WF_013', '認定', 3, '状態選択', 'status_selection', '["承認","不承認"]', '{"*":4}', '[]', '{}', false],
    ['WF_014', '認定', 4, '詳細入力', 'conditional_form', '[]', '{"*":5}', '[]', '{}', false],
    ['WF_015', '認定', 5, '確認・生成', 'generation', '[]', '{}', '[]', '{}', true],
    
    // その他ワークフロー
    ['WF_016', 'その他', 1, '審査種類選択', 'selection', '["その他"]', '{"その他":2}', '[]', '{}', false],
    ['WF_017', 'その他', 2, '対応種類選択', 'other_type_selection', '["Need info","一時返信","フォローメール","強制停止","審査中","Bug報告","認証PB"]', '{"*":3}', '[]', '{}', false],
    ['WF_018', 'その他', 3, '詳細入力', 'conditional_form', '[]', '{"*":4}', '[]', '{}', false],
    ['WF_019', 'その他', 4, '確認・生成', 'generation', '[]', '{}', '[]', '{}', true]
  ];
  
  if (data.length > 0) {
    sheet.getRange(2, 1, data.length, data[0].length).setValues(data);
  }
}

/**
 * サンプルテンプレートを挿入
 */
function insertSampleTemplates(spreadsheet) {
  const sheet = spreadsheet.getSheetByName('Templates');
  const today = new Date().toISOString();
  const user = Session.getActiveUser().getEmail();
  
  const data = [
    [
      'TMPL_001',
      '誤審査',
      '不実表示',
      '信頼できない文言',
      '再審査→承認済み（誤審）',
      '{{contactName}} 様\\n\\n平素よりお世話になっております。\\nGoogle 広告サポートチームの{{myName}}でございます。\\n\\nこの度は、{{opening}}\\n{{channel}}頂戴したご質問の内容について、以下のとおりご案内いたします。\\n\\n【お問い合わせ】\\n{{overview}}\\n\\n【回答】\\n当該アカウント（ID：{{formattedECID}}）で「{{detailedPolicy}}」のポリシーに抵触していると判断された広告について、担当部署にて再審査を実施いたしました。\\nその結果、本日 {{today}} 時点ですべて「承認済み」ステータスへ変更されたことをご報告いたします。\\n\\n{{contactName}}様側でも、実際の承認状況をアカウント画面にてご確認いただけますと幸いです。\\n\\nこの度は、審査結果に不一致が生じ、ご迷惑をおかけし誠に申し訳ございません。\\n\\nご案内は以上でございます。\\n\\n何卒よろしくお願い申し上げます。\\n\\n{{myName}}',
      '["contactName","myName","opening","channel","overview","ecid","detailedPolicy","status","adtype"]',
      '[]',
      '{"workflow_type":"誤審査"}',
      4,
      true,
      '2.0',
      today,
      today,
      user,
      '最も利用頻度の高いテンプレート'
    ]
  ];
  
  if (data.length > 0) {
    sheet.getRange(2, 1, data.length, data[0].length).setValues(data);
  }
}

// ===========================
// 権限設定
// ===========================

/**
 * スプレッドシートの権限を設定
 */
function setupPermissions(spreadsheetId, config) {
  console.log('🔐 Setting up permissions...');
  
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  
  // 管理者権限
  if (config.adminEmail) {
    spreadsheet.addEditor(config.adminEmail);
  }
  
  // 閲覧者権限
  if (config.viewerEmails && config.viewerEmails.length > 0) {
    config.viewerEmails.forEach(email => {
      spreadsheet.addViewer(email);
    });
  }
  
  // シート保護設定
  if (config.protectSheets) {
    protectCriticalSheets(spreadsheet);
  }
  
  console.log('✅ Permissions configured');
}

/**
 * 重要なシートを保護
 */
function protectCriticalSheets(spreadsheet) {
  const sheetsToProtect = ['WorkflowConfig', 'AuditLog'];
  
  sheetsToProtect.forEach(sheetName => {
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (sheet) {
      const protection = sheet.protect()
        .setDescription(`Protected: ${sheetName}`)
        .setWarningOnly(true);
      
      // 編集可能なユーザーを制限
      const me = Session.getEffectiveUser();
      protection.addEditor(me);
      protection.removeEditors(protection.getEditors());
      if (protection.canDomainEdit()) {
        protection.setDomainEdit(false);
      }
    }
  });
}

// ===========================
// トリガー設定
// ===========================

/**
 * 必要なトリガーを設定
 */
function setupTriggers() {
  console.log('⏰ Setting up triggers...');
  
  // 既存のトリガーを削除
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
  
  // 日次バックアップトリガー
  ScriptApp.newTrigger('dailyBackup')
    .timeBased()
    .everyDays(1)
    .atHour(2)
    .create();
  
  // キャッシュクリーントリガー
  ScriptApp.newTrigger('cleanCache')
    .timeBased()
    .everyHours(6)
    .create();
  
  // 監査ログローテーショントリガー
  ScriptApp.newTrigger('rotateAuditLog')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.SUNDAY)
    .atHour(3)
    .create();
  
  console.log('✅ Triggers configured');
}

// ===========================
// 検証
// ===========================

/**
 * セットアップの検証
 */
function validateSetup(spreadsheetId) {
  console.log('🔍 Validating setup...');
  
  const validation = {
    spreadsheet: false,
    sheets: {},
    data: {},
    permissions: false,
    triggers: false,
    errors: []
  };
  
  try {
    // スプレッドシートアクセス確認
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    validation.spreadsheet = true;
    
    // 必要なシートの存在確認
    const requiredSheets = [
      'Templates', 'Variables', 'Options',
      'WorkflowConfig', 'PolicyCategories',
      'AuditLog', 'Cache'
    ];
    
    requiredSheets.forEach(sheetName => {
      const sheet = spreadsheet.getSheetByName(sheetName);
      validation.sheets[sheetName] = sheet !== null;
      
      if (sheet) {
        const lastRow = sheet.getLastRow();
        validation.data[sheetName] = lastRow > 1; // ヘッダー以外にデータがあるか
      }
    });
    
    // 権限確認
    const editors = spreadsheet.getEditors();
    validation.permissions = editors.length > 0;
    
    // トリガー確認
    const triggers = ScriptApp.getProjectTriggers();
    validation.triggers = triggers.length > 0;
    
  } catch (error) {
    validation.errors.push(error.toString());
  }
  
  console.log('✅ Validation completed:', validation);
  return validation;
}

// ===========================
// レポート生成
// ===========================

/**
 * セットアップ完了レポートを生成
 */
function generateSetupReport(spreadsheetId, validation) {
  console.log('📊 Generating setup report...');
  
  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  
  const html = HtmlService.createTemplate(`
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #1a73e8; }
          .success { color: #0f9d58; }
          .error { color: #ea4335; }
          .info { background: #e8f0fe; padding: 10px; border-radius: 5px; margin: 10px 0; }
          ul { list-style-type: none; padding: 0; }
          li { padding: 5px 0; }
          .check { color: #0f9d58; }
          .cross { color: #ea4335; }
        </style>
      </head>
      <body>
        <h1>🎉 PolicyPlayBook セットアップ完了</h1>
        
        <div class="info">
          <h2>📊 データベース</h2>
          <p><strong>スプレッドシートID:</strong> <?= spreadsheetId ?></p>
          <p><strong>URL:</strong> <a href="<?= spreadsheetUrl ?>" target="_blank">スプレッドシートを開く</a></p>
        </div>
        
        <div class="info">
          <h2>✅ セットアップ状態</h2>
          <ul>
            <li><?= validation.spreadsheet ? '✓' : '✗' ?> スプレッドシート作成</li>
            <? for (var sheet in validation.sheets) { ?>
              <li><?= validation.sheets[sheet] ? '✓' : '✗' ?> <?= sheet ?> シート</li>
            <? } ?>
            <li><?= validation.permissions ? '✓' : '✗' ?> 権限設定</li>
            <li><?= validation.triggers ? '✓' : '✗' ?> トリガー設定</li>
          </ul>
        </div>
        
        <? if (validation.errors.length > 0) { ?>
        <div class="info">
          <h2>⚠️ エラー</h2>
          <ul>
            <? for (var i = 0; i < validation.errors.length; i++) { ?>
              <li class="error"><?= validation.errors[i] ?></li>
            <? } ?>
          </ul>
        </div>
        <? } ?>
        
        <div class="info">
          <h2>📝 次のステップ</h2>
          <ol>
            <li>スプレッドシートを開いて初期データを確認</li>
            <li>Code.gs の SPREADSHEET_ID を更新</li>
            <li>Web App をデプロイ</li>
            <li>動作テストを実施</li>
          </ol>
        </div>
        
        <p><button onclick="google.script.host.close()">閉じる</button></p>
      </body>
    </html>
  `);
  
  html.spreadsheetId = spreadsheetId;
  html.spreadsheetUrl = spreadsheetUrl;
  html.validation = validation;
  
  const htmlOutput = html.evaluate()
    .setWidth(600)
    .setHeight(700);
  
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'セットアップ完了レポート');
}

// ===========================
// ユーティリティ関数
// ===========================

/**
 * エラーダイアログを表示
 */
function showErrorDialog(error) {
  const ui = SpreadsheetApp.getUi();
  ui.alert(
    'セットアップエラー',
    `セットアップ中にエラーが発生しました:\\n\\n${error.toString()}`,
    ui.ButtonSet.OK
  );
}

/**
 * 手動実行用: セットアップ状態を確認
 */
function checkSetupStatus() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const spreadsheetId = scriptProperties.getProperty('SPREADSHEET_ID');
  
  if (!spreadsheetId) {
    console.log('Setup has not been run yet');
    return;
  }
  
  const validation = validateSetup(spreadsheetId);
  console.log('Current setup status:', validation);
  
  generateSetupReport(spreadsheetId, validation);
}