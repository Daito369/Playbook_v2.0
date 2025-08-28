/**
 * PolicyPlayBook v2.0 - Workflow Management
 * @fileoverview Workflow state management and business logic
 * @author PolicyPlayBook Team
 * @version 2.0.0
 */

/**
 * Workflow management class
 */
class WorkflowManager {
  constructor(workflowId) {
    this.workflowId = workflowId;
    this.state = null;
    this.dbService = new DatabaseService();
    this.cacheService = new CacheService();
  }

  /**
   * Initialize workflow state
   * @param {Object} data - Initial workflow data
   * @returns {Object} Initialized state
   */
  initializeState(data) {
    try {
      const state = {
        workflowId: this.workflowId,
        currentStep: 1,
        totalSteps: 6,
        status: WORKFLOW_STATES.INITIAL,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: data.userId || Session.getActiveUser().getEmail(),
        sessionId: data.sessionId,
        locale: data.locale || 'ja-JP',
        data: {
          workflowType: null,
          category: null,
          subcategory: null,
          status: null,
          templateId: null,
          variables: {},
          preview: null,
          generatedContent: null
        }
      };

      this.state = state;
      this.saveState();
      
      logInfo('Workflow initialized', { workflowId: this.workflowId, userId: state.userId });
      return state;
      
    } catch (error) {
      logError('Failed to initialize workflow', error);
      throw new Error('ワークフローの初期化に失敗しました');
    }
  }

  /**
   * Load workflow state from storage
   * @returns {Object|null} Workflow state or null if not found
   */
  loadState() {
    try {
      const cacheKey = `workflow_state_${this.workflowId}`;
      let state = this.cacheService.get(cacheKey);
      
      if (!state) {
        const properties = PropertiesService.getUserProperties();
        const stateJson = properties.getProperty(`workflow_${this.workflowId}`);
        if (stateJson) {
          state = JSON.parse(stateJson);
          this.cacheService.set(cacheKey, state, 3600); // 1 hour cache
        }
      }
      
      this.state = state;
      return state;
      
    } catch (error) {
      logError('Failed to load workflow state', error);
      return null;
    }
  }

  /**
   * Save workflow state to storage
   */
  saveState() {
    try {
      if (!this.state) {
        throw new Error('No state to save');
      }

      this.state.updatedAt = new Date().toISOString();
      
      // Save to Properties Service
      const properties = PropertiesService.getUserProperties();
      properties.setProperty(`workflow_${this.workflowId}`, JSON.stringify(this.state));
      
      // Cache for quick access
      const cacheKey = `workflow_state_${this.workflowId}`;
      this.cacheService.set(cacheKey, this.state, 3600); // 1 hour cache
      
      logInfo('Workflow state saved', { workflowId: this.workflowId, step: this.state.currentStep });
      
    } catch (error) {
      logError('Failed to save workflow state', error);
      throw new Error('ワークフロー状態の保存に失敗しました');
    }
  }

  /**
   * Set workflow type
   * @param {string} workflowType - Selected workflow type
   * @returns {Object} Updated state
   */
  setWorkflowType(workflowType) {
    try {
      this.validateState();
      
      if (!Object.keys(WORKFLOW_TYPES).includes(workflowType)) {
        throw new Error(`Invalid workflow type: ${workflowType}`);
      }

      this.state.data.workflowType = workflowType;
      this.state.currentStep = 2;
      this.state.status = WORKFLOW_STATES.TYPE_SELECTED;
      this.saveState();
      
      return this.getStateForClient();
      
    } catch (error) {
      logError('Failed to set workflow type', error);
      throw new Error('ワークフロータイプの設定に失敗しました');
    }
  }

  /**
   * Set policy selection
   * @param {string} category - Selected category
   * @param {string} subcategory - Selected subcategory
   * @returns {Object} Updated state
   */
  setPolicySelection(category, subcategory) {
    try {
      this.validateState();
      
      if (!category || !subcategory) {
        throw new Error('Category and subcategory are required');
      }

      this.state.data.category = category;
      this.state.data.subcategory = subcategory;
      this.state.currentStep = 3;
      this.state.status = WORKFLOW_STATES.POLICY_SELECTED;
      this.saveState();
      
      return this.getStateForClient();
      
    } catch (error) {
      logError('Failed to set policy selection', error);
      throw new Error('ポリシー選択の設定に失敗しました');
    }
  }

  /**
   * Set status selection
   * @param {string} status - Selected status
   * @returns {Object} Updated state
   */
  setStatus(status) {
    try {
      this.validateState();
      
      if (!status) {
        throw new Error('Status is required');
      }

      this.state.data.status = status;
      this.state.currentStep = 4;
      this.state.status = WORKFLOW_STATES.STATUS_SELECTED;
      this.saveState();
      
      return this.getStateForClient();
      
    } catch (error) {
      logError('Failed to set status', error);
      throw new Error('ステータス設定に失敗しました');
    }
  }

  /**
   * Set template and variables
   * @param {string} templateId - Selected template ID
   * @param {Object} variables - Form variables
   * @returns {Object} Updated state
   */
  setTemplateVariables(templateId, variables) {
    try {
      this.validateState();
      
      if (!templateId) {
        throw new Error('Template ID is required');
      }

      // Validate variables
      const template = this.dbService.getTemplateById(templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      const templateVariables = this.dbService.getTemplateVariables(templateId);
      const validator = new ValidationService();
      
      for (const variable of templateVariables.required || []) {
        const result = validator.validate(variable, variables[variable]);
        if (!result.isValid) {
          throw new Error(`Validation failed for ${variable}: ${result.errors.join(', ')}`);
        }
      }

      this.state.data.templateId = templateId;
      this.state.data.variables = variables;
      this.state.currentStep = 5;
      this.state.status = WORKFLOW_STATES.INPUT_REQUIRED;
      this.saveState();
      
      return this.getStateForClient();
      
    } catch (error) {
      logError('Failed to set template variables', error);
      throw new Error('テンプレート変数の設定に失敗しました');
    }
  }

  /**
   * Generate final content
   * @returns {Object} Generated content and metadata
   */
  generateContent() {
    try {
      this.validateState();
      
      if (!this.state.data.templateId || !this.state.data.variables) {
        throw new Error('Template and variables are required');
      }

      this.state.status = WORKFLOW_STATES.GENERATION;
      this.saveState();

      // Get template
      const template = this.dbService.getTemplateById(this.state.data.templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      // Process template
      const templateEngine = new TemplateEngine();
      const generatedContent = templateEngine.processTemplate(
        template.template_content, 
        this.state.data.variables
      );

      // Update state
      this.state.data.generatedContent = generatedContent;
      this.state.currentStep = 6;
      this.state.status = WORKFLOW_STATES.COMPLETED;
      this.state.completedAt = new Date().toISOString();
      this.saveState();

      // Log generation
      logAudit('content_generated', {
        workflowId: this.workflowId,
        templateId: this.state.data.templateId,
        wordCount: generatedContent.length,
        userId: this.state.userId
      });

      return {
        generatedContent,
        metadata: {
          generatedAt: this.state.completedAt,
          templateUsed: this.state.data.templateId,
          wordCount: generatedContent.length,
          estimatedReadTime: Math.ceil(generatedContent.length / 1000) + '分'
        }
      };
      
    } catch (error) {
      logError('Failed to generate content', error);
      this.state.status = WORKFLOW_STATES.ERROR;
      this.saveState();
      throw new Error('コンテンツ生成に失敗しました');
    }
  }

  /**
   * Get available workflow types
   * @returns {Array} Available workflow types
   */
  getAvailableTypes() {
    return Object.values(WORKFLOW_TYPES);
  }

  /**
   * Get available policies for current workflow type
   * @returns {Array} Available policies
   */
  getAvailablePolicies() {
    try {
      this.validateState();
      
      const workflowType = this.state.data.workflowType;
      if (!workflowType) {
        throw new Error('Workflow type not selected');
      }

      return this.dbService.getPolicyCategories(workflowType);
      
    } catch (error) {
      logError('Failed to get available policies', error);
      throw new Error('利用可能なポリシーの取得に失敗しました');
    }
  }

  /**
   * Get available statuses for current workflow type
   * @returns {Array} Available statuses
   */
  getAvailableStatuses() {
    try {
      this.validateState();
      
      const workflowType = this.state.data.workflowType;
      if (!workflowType) {
        throw new Error('Workflow type not selected');
      }

      // Define status options by workflow type
      const statusOptions = {
        'misreview': [
          { value: 'approved', label: '承認済み', description: '誤審査が承認されたケース' }
        ],
        'disapproval': [
          { value: 'disapproval_with_response', label: '不承認（回答あり）', description: '広告主から回答があった不承認ケース' },
          { value: 'disapproval_inferred', label: '不承認（推定）', description: '推定による不承認ケース' }
        ],
        'certification': [
          { value: 'approved', label: '承認済み', description: '審査が承認されたケース' },
          { value: 'disapproved', label: '不承認', description: '審査が不承認されたケース' }
        ],
        'other': [
          { value: 'need_info', label: '情報不足/Need info', description: '追加情報が必要なケース' },
          { value: 'at_followmail', label: 'AT/followmail', description: 'フォローアップが必要なケース' },
          { value: 'forced_stop', label: '強制停止', description: '強制停止されたケース' }
        ]
      };

      return statusOptions[workflowType] || [];
      
    } catch (error) {
      logError('Failed to get available statuses', error);
      throw new Error('利用可能なステータスの取得に失敗しました');
    }
  }

  /**
   * Get template for current selections
   * @returns {Object} Template data with variables
   */
  getTemplate() {
    try {
      this.validateState();
      
      const { workflowType, category, subcategory, status } = this.state.data;
      
      if (!workflowType || !category || !subcategory || !status) {
        throw new Error('All selections are required to get template');
      }

      const template = this.dbService.getTemplate(workflowType, category, subcategory, status);
      if (!template) {
        throw new Error('Template not found for the selected criteria');
      }

      const variables = this.dbService.getTemplateVariables(template.template_id);
      
      return {
        templateId: template.template_id,
        templateName: template.template_name,
        templateContent: template.template_content,
        requiredVariables: variables.required || [],
        optionalVariables: variables.optional || [],
        metadata: {
          category: template.category_name,
          subcategory: template.subcategory_name,
          status: status,
          lastModified: template.last_modified
        }
      };
      
    } catch (error) {
      logError('Failed to get template', error);
      throw new Error('テンプレートの取得に失敗しました');
    }
  }

  /**
   * Preview content with current variables
   * @param {Object} variables - Variables for preview
   * @returns {string} Preview content
   */
  previewContent(variables) {
    try {
      this.validateState();
      
      if (!this.state.data.templateId) {
        throw new Error('Template not selected');
      }

      const template = this.dbService.getTemplateById(this.state.data.templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      const templateEngine = new TemplateEngine();
      const previewContent = templateEngine.processTemplate(
        template.template_content, 
        variables,
        { preview: true }
      );

      this.state.data.preview = previewContent;
      this.saveState();

      return previewContent;
      
    } catch (error) {
      logError('Failed to preview content', error);
      throw new Error('プレビューの生成に失敗しました');
    }
  }

  /**
   * Reset workflow to initial state
   */
  reset() {
    try {
      this.state = {
        ...this.state,
        currentStep: 1,
        status: WORKFLOW_STATES.INITIAL,
        data: {
          workflowType: null,
          category: null,
          subcategory: null,
          status: null,
          templateId: null,
          variables: {},
          preview: null,
          generatedContent: null
        },
        updatedAt: new Date().toISOString()
      };
      
      this.saveState();
      logInfo('Workflow reset', { workflowId: this.workflowId });
      
    } catch (error) {
      logError('Failed to reset workflow', error);
      throw new Error('ワークフローのリセットに失敗しました');
    }
  }

  /**
   * Validate current state
   * @throws {Error} If state is invalid
   */
  validateState() {
    if (!this.state) {
      throw new Error('Workflow state not loaded');
    }
    
    if (!this.state.workflowId) {
      throw new Error('Invalid workflow state: missing workflow ID');
    }
  }

  /**
   * Get state data for client
   * @returns {Object} Client-safe state data
   */
  getStateForClient() {
    this.validateState();
    
    return {
      workflowId: this.state.workflowId,
      currentStep: this.state.currentStep,
      totalSteps: this.state.totalSteps,
      status: this.state.status,
      data: { ...this.state.data },
      createdAt: this.state.createdAt,
      updatedAt: this.state.updatedAt
    };
  }

  /**
   * Clean up old workflow states
   * @param {number} maxAgeHours - Maximum age in hours (default 24)
   */
  static cleanupOldStates(maxAgeHours = 24) {
    try {
      const properties = PropertiesService.getUserProperties();
      const allProps = properties.getProperties();
      const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);
      let cleanedCount = 0;

      for (const [key, value] of Object.entries(allProps)) {
        if (key.startsWith('workflow_')) {
          try {
            const state = JSON.parse(value);
            const stateTime = new Date(state.updatedAt || state.createdAt).getTime();
            
            if (stateTime < cutoffTime) {
              properties.deleteProperty(key);
              cleanedCount++;
            }
          } catch (e) {
            // Invalid state, delete it
            properties.deleteProperty(key);
            cleanedCount++;
          }
        }
      }

      logInfo('Workflow cleanup completed', { cleanedStates: cleanedCount });
      return cleanedCount;
      
    } catch (error) {
      logError('Failed to cleanup old states', error);
      return 0;
    }
  }
}

/**
 * Get workflow manager instance
 * @param {string} workflowId - Workflow ID
 * @returns {WorkflowManager} Workflow manager instance
 */
function getWorkflowManager(workflowId) {
  return new WorkflowManager(workflowId);
}

/**
 * Scheduled cleanup function
 * Called daily to clean up old workflow states
 */
function cleanupWorkflowStates() {
  try {
    const cleaned = WorkflowManager.cleanupOldStates(24);
    logInfo('Scheduled workflow cleanup', { cleanedStates: cleaned });
    return cleaned;
  } catch (error) {
    logError('Scheduled cleanup failed', error);
    return 0;
  }
}