/**
 * PolicyPlayBook v2.0 - Main Controller
 * @fileoverview Google Apps Script main entry point and API controller
 * @author PolicyPlayBook Team
 * @version 2.0.0
 */

// Configuration constants
const CONFIG = {
  SPREADSHEET_ID: '1wpvqOVfNuVaUBUQxYn45qNTSHG4dNbAJAwhOigu8p_U',
  APP_NAME: 'PolicyPlayBook',
  VERSION: '2.0.0',
  MAX_EXECUTION_TIME: 300000, // 5 minutes in milliseconds
  CACHE_TTL: 3600000, // 1 hour in milliseconds
  DEBUG_MODE: false
};

// Workflow states
const WORKFLOW_STATES = {
  INITIAL: 'initial',
  TYPE_SELECTED: 'type_selected',
  POLICY_SELECTED: 'policy_selected', 
  STATUS_SELECTED: 'status_selected',
  INPUT_REQUIRED: 'input_required',
  VALIDATION: 'validation',
  GENERATION: 'generation',
  COMPLETED: 'completed',
  ERROR: 'error'
};

// Available workflow types
const WORKFLOW_TYPES = {
  MISREVIEW: { id: 'misreview', label: '誤審査', icon: 'fas fa-exclamation-triangle' },
  DISAPPROVAL: { id: 'disapproval', label: '不承認', icon: 'fas fa-times-circle' },
  CERTIFICATION: { id: 'certification', label: 'Cert 認定', icon: 'fas fa-certificate' },
  OTHER: { id: 'other', label: 'その他', icon: 'fas fa-ellipsis-h' }
};

/**
 * Main GET entry point - serves the web application
 * @param {GoogleAppsScript.Events.DoGet} e - The event object
 * @returns {GoogleAppsScript.HTML.HtmlOutput} The HTML output
 */
function doGet(e) {
  try {
    logInfo('doGet called', { parameters: e.parameter });
    
    // Check authentication
    if (!isAuthenticated()) {
      return createErrorResponse('認証が必要です', 401);
    }
    
    // Serve main application
    const htmlOutput = HtmlService.createTemplateFromFile('index');
    htmlOutput.appVersion = CONFIG.VERSION;
    htmlOutput.appName = CONFIG.APP_NAME;
    
    return htmlOutput.evaluate()
      .setTitle('PolicyPlayBook v2.0')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
      
  } catch (error) {
    logError('doGet error', error);
    return createErrorResponse('システムエラーが発生しました', 500);
  }
}

/**
 * Main POST entry point - handles API requests
 * @param {GoogleAppsScript.Events.DoPost} e - The event object
 * @returns {GoogleAppsScript.Content.TextOutput} JSON response
 */
function doPost(e) {
  try {
    const startTime = Date.now();
    logInfo('doPost called', { postData: e.postData && e.postData.contents });
    
    // Check authentication
    if (!isAuthenticated()) {
      return createJsonResponse({ success: false, error: 'Unauthorized' }, 401);
    }
    
    // Parse request data
    let requestData = {};
    try {
      requestData = JSON.parse(e.postData.contents || '{}');
    } catch (parseError) {
      logError('JSON parse error', parseError);
      return createJsonResponse({ success: false, error: 'Invalid JSON' }, 400);
    }
    
    // Route to appropriate handler
    const action = requestData.action || e.parameter.action;
    logInfo('Processing action', { action, requestData });
    
    let response;
    switch (action) {
      case 'workflow/initialize':
        response = handleWorkflowInitialize(requestData);
        break;
      case 'workflow/policies':
        response = handleGetPolicies(requestData);
        break;
      case 'workflow/template':
        response = handleGetTemplate(requestData);
        break;
      case 'workflow/generate':
        response = handleGenerateEmail(requestData);
        break;
      case 'validate':
        response = handleValidate(requestData);
        break;
      case 'cache/clear':
        response = handleClearCache(requestData);
        break;
      default:
        logWarning('Unknown action', { action });
        response = { success: false, error: 'Unknown action: ' + action };
    }
    
    const executionTime = Date.now() - startTime;
    logInfo('Request processed', { action, executionTime, success: response.success });
    
    return createJsonResponse(response);
    
  } catch (error) {
    logError('doPost error', error);
    return createJsonResponse({ success: false, error: 'Internal server error' }, 500);
  }
}

/**
 * Handle workflow initialization
 * @param {Object} requestData - Request data
 * @returns {Object} Response object
 */
function handleWorkflowInitialize(requestData) {
  try {
    const userId = requestData.userId || Session.getActiveUser().getEmail();
    const sessionId = requestData.sessionId || generateSessionId();
    const locale = requestData.locale || 'ja-JP';
    
    // Create new workflow instance
    const workflowId = generateWorkflowId();
    
    // Store workflow state
    const workflowState = {
      workflowId,
      userId,
      sessionId,
      locale,
      currentStep: 1,
      totalSteps: 6,
      state: WORKFLOW_STATES.INITIAL,
      createdAt: new Date().toISOString(),
      data: {}
    };
    
    storeWorkflowState(workflowId, workflowState);
    
    return {
      success: true,
      data: {
        workflowId,
        availableTypes: Object.values(WORKFLOW_TYPES),
        currentStep: 1,
        totalSteps: 6,
        state: WORKFLOW_STATES.INITIAL
      }
    };
  } catch (error) {
    logError('handleWorkflowInitialize error', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handle get policies request
 * @param {Object} requestData - Request data
 * @returns {Object} Response object
 */
function handleGetPolicies(requestData) {
  try {
    const workflowType = requestData.type || requestData.workflow_type;
    if (!workflowType) {
      return { success: false, error: 'Workflow type is required' };
    }
    
    // Get categories from database
    const dbService = new DatabaseService();
    const categories = dbService.getPolicyCategories(workflowType);
    
    return {
      success: true,
      data: {
        categories: categories
      }
    };
  } catch (error) {
    logError('handleGetPolicies error', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handle get template request
 * @param {Object} requestData - Request data
 * @returns {Object} Response object
 */
function handleGetTemplate(requestData) {
  try {
    const { category, subcategory, status, workflowType } = requestData;
    
    if (!category || !subcategory) {
      return { success: false, error: 'Category and subcategory are required' };
    }
    
    const dbService = new DatabaseService();
    const template = dbService.getTemplate(workflowType, category, subcategory, status);
    
    if (!template) {
      return { success: false, error: 'Template not found' };
    }
    
    // Get template variables
    const variables = dbService.getTemplateVariables(template.template_id);
    const requiredFields = processVariables(variables.required || []);
    const optionalFields = processVariables(variables.optional || []);
    
    return {
      success: true,
      data: {
        templateId: template.template_id,
        templateName: template.template_name,
        requiredFields,
        optionalFields,
        preview: template.template_content
      }
    };
  } catch (error) {
    logError('handleGetTemplate error', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handle generate email request
 * @param {Object} requestData - Request data
 * @returns {Object} Response object
 */
function handleGenerateEmail(requestData) {
  try {
    const { workflowId, templateId, variables } = requestData;
    
    if (!templateId || !variables) {
      return { success: false, error: 'Template ID and variables are required' };
    }
    
    // Get template
    const dbService = new DatabaseService();
    const template = dbService.getTemplateById(templateId);
    
    if (!template) {
      return { success: false, error: 'Template not found' };
    }
    
    // Process template with variables
    const templateEngine = new TemplateEngine();
    const generatedContent = templateEngine.processTemplate(template.template_content, variables);
    
    // Store generation log
    const logData = {
      workflowId,
      templateId,
      variables,
      generatedAt: new Date().toISOString(),
      userId: Session.getActiveUser().getEmail()
    };
    
    logAudit('email_generated', logData);
    
    return {
      success: true,
      data: {
        generatedContent,
        metadata: {
          generatedAt: new Date().toISOString(),
          templateUsed: templateId,
          wordCount: generatedContent.length,
          estimatedReadTime: Math.ceil(generatedContent.length / 1000) + '分'
        }
      }
    };
  } catch (error) {
    logError('handleGenerateEmail error', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handle validation request
 * @param {Object} requestData - Request data
 * @returns {Object} Response object
 */
function handleValidate(requestData) {
  try {
    const { field, value, rules } = requestData;
    
    const validator = new ValidationService();
    const result = validator.validate(field, value, rules);
    
    if (result.isValid) {
      return { success: true, data: { valid: true } };
    } else {
      return {
        success: false,
        errors: result.errors
      };
    }
  } catch (error) {
    logError('handleValidate error', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handle cache clear request
 * @param {Object} requestData - Request data
 * @returns {Object} Response object
 */
function handleClearCache(requestData) {
  try {
    const cacheService = new CacheService();
    cacheService.clearAll();
    
    logInfo('Cache cleared by user', { userId: Session.getActiveUser().getEmail() });
    
    return { success: true, message: 'Cache cleared successfully' };
  } catch (error) {
    logError('handleClearCache error', error);
    return { success: false, error: error.message };
  }
}

/**
 * Process variables for frontend display
 * @param {Array} variables - Array of variable names
 * @returns {Array} Processed variables with display information
 */
function processVariables(variables) {
  const dbService = new DatabaseService();
  return variables.map(variableName => {
    const variable = dbService.getVariable(variableName);
    if (!variable) {
      logWarning('Variable not found', { variableName });
      return null;
    }
    
    return {
      name: variable.variable_name,
      label: variable.display_name,
      type: variable.variable_type,
      validation: variable.validation_rule,
      placeholder: variable.placeholder,
      helpText: variable.help_text,
      options: variable.options_source ? dbService.getOptions(variable.variable_name) : null,
      required: variable.is_required
    };
  }).filter(v => v !== null);
}

/**
 * Check if user is authenticated
 * @returns {boolean} True if authenticated
 */
function isAuthenticated() {
  try {
    const user = Session.getActiveUser();
    return user && user.getEmail();
  } catch (error) {
    logError('Authentication check failed', error);
    return false;
  }
}

/**
 * Create JSON response
 * @param {Object} data - Response data
 * @param {number} statusCode - HTTP status code
 * @returns {GoogleAppsScript.Content.TextOutput} JSON response
 */
function createJsonResponse(data, statusCode = 200) {
  const response = ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  
  if (statusCode !== 200) {
    // GAS doesn't support status codes directly, but we can include it in response
    data.statusCode = statusCode;
  }
  
  return response;
}

/**
 * Create error HTML response
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @returns {GoogleAppsScript.HTML.HtmlOutput} Error page
 */
function createErrorResponse(message, statusCode) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>エラー - PolicyPlayBook</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; text-align: center; padding: 50px; }
        .error { color: #dc3545; }
        .container { max-width: 500px; margin: 0 auto; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>エラーが発生しました</h1>
        <p class="error">${message}</p>
        <p>問題が続く場合は、管理者にお問い合わせください。</p>
      </div>
    </body>
    </html>
  `;
  
  return HtmlService.createHtmlOutput(html)
    .setTitle('エラー - PolicyPlayBook');
}

/**
 * Store workflow state in properties
 * @param {string} workflowId - Workflow ID
 * @param {Object} state - Workflow state
 */
function storeWorkflowState(workflowId, state) {
  try {
    const properties = PropertiesService.getUserProperties();
    const key = `workflow_${workflowId}`;
    properties.setProperty(key, JSON.stringify(state));
  } catch (error) {
    logError('Failed to store workflow state', error);
  }
}

/**
 * Get workflow state from properties
 * @param {string} workflowId - Workflow ID
 * @returns {Object|null} Workflow state or null if not found
 */
function getWorkflowState(workflowId) {
  try {
    const properties = PropertiesService.getUserProperties();
    const key = `workflow_${workflowId}`;
    const stateJson = properties.getProperty(key);
    return stateJson ? JSON.parse(stateJson) : null;
  } catch (error) {
    logError('Failed to get workflow state', error);
    return null;
  }
}

/**
 * Generate unique workflow ID
 * @returns {string} Workflow ID
 */
function generateWorkflowId() {
  const timestamp = new Date().toISOString().replace(/[-:.]/g, '').substring(0, 15);
  const random = Math.random().toString(36).substring(2, 8);
  return `WF_${timestamp}_${random}`;
}

/**
 * Generate unique session ID
 * @returns {string} Session ID
 */
function generateSessionId() {
  return 'SES_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Include HTML files for templating
 * @param {string} filename - File name
 * @returns {string} File content
 */
function include(filename) {
  try {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
  } catch (error) {
    logError('Failed to include file', { filename, error });
    return `<!-- Error loading ${filename} -->`;
  }
}