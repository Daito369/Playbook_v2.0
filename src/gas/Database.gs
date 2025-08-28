/**
 * PolicyPlayBook v2.0 - Database Service
 * @fileoverview Spreadsheet database operations and data access layer
 * @author PolicyPlayBook Team
 * @version 2.0.0
 */

/**
 * Database service class for spreadsheet operations
 */
class DatabaseService {
  constructor() {
    this.spreadsheetId = CONFIG.SPREADSHEET_ID;
    this.spreadsheet = SpreadsheetApp.openById(this.spreadsheetId);
    this.cache = new Map();
    this.cacheEnabled = true;
  }

  /**
   * Get policy categories filtered by workflow type
   * @param {string} workflowType - The workflow type
   * @returns {Array} Array of policy categories
   */
  getPolicyCategories(workflowType) {
    try {
      const cacheKey = `policies_${workflowType}`;
      if (this.cacheEnabled && this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      const sheet = this.spreadsheet.getSheetByName('PolicyCategories');
      if (!sheet) {
        throw new Error('PolicyCategories sheet not found');
      }

      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const rows = data.slice(1);

      // Find column indices
      const categoryIdIndex = headers.indexOf('category_id');
      const parentCategoryIndex = headers.indexOf('parent_category');
      const categoryNameIndex = headers.indexOf('category_name');
      const workflowTypesIndex = headers.indexOf('workflow_types');
      const isActiveIndex = headers.indexOf('is_active');
      const displayOrderIndex = headers.indexOf('display_order');

      // Filter and structure categories
      const categories = [];
      const categoryMap = new Map();

      // First pass: collect all active categories
      for (const row of rows) {
        if (!row[isActiveIndex]) continue; // Skip inactive categories

        const workflowTypesStr = row[workflowTypesIndex] || '';
        let workflowTypes = [];
        try {
          workflowTypes = JSON.parse(workflowTypesStr);
        } catch {
          workflowTypes = workflowTypesStr.split(',').map(s => s.trim());
        }

        // Check if this category supports the requested workflow type
        if (workflowTypes.includes(workflowType)) {
          const category = {
            id: row[categoryIdIndex],
            name: row[categoryNameIndex],
            parent: row[parentCategoryIndex] || null,
            displayOrder: row[displayOrderIndex] || 999,
            subcategories: []
          };
          categoryMap.set(category.id, category);
        }
      }

      // Second pass: organize hierarchy
      for (const [id, category] of categoryMap) {
        if (!category.parent) {
          // This is a main category
          categories.push(category);
        } else {
          // This is a subcategory
          const parent = categoryMap.get(category.parent);
          if (parent) {
            parent.subcategories.push(category);
          }
        }
      }

      // Sort categories and subcategories by display order
      categories.sort((a, b) => a.displayOrder - b.displayOrder);
      categories.forEach(cat => {
        cat.subcategories.sort((a, b) => a.displayOrder - b.displayOrder);
      });

      // Cache result
      if (this.cacheEnabled) {
        this.cache.set(cacheKey, categories);
      }

      return categories;
    } catch (error) {
      logError('getPolicyCategories error', { workflowType, error });
      throw error;
    }
  }

  /**
   * Get template by criteria
   * @param {string} workflowType - Workflow type
   * @param {string} category - Policy category
   * @param {string} subcategory - Policy subcategory
   * @param {string} status - Status (optional)
   * @returns {Object|null} Template object or null
   */
  getTemplate(workflowType, category, subcategory, status = null) {
    try {
      const cacheKey = `template_${workflowType}_${category}_${subcategory}_${status || 'any'}`;
      if (this.cacheEnabled && this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      const sheet = this.spreadsheet.getSheetByName('Templates');
      if (!sheet) {
        throw new Error('Templates sheet not found');
      }

      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const rows = data.slice(1);

      // Find column indices
      const templateIdIndex = headers.indexOf('template_id');
      const workflowTypeIndex = headers.indexOf('workflow_type');
      const categoryIndex = headers.indexOf('category');
      const subcategoryIndex = headers.indexOf('subcategory');
      const templateNameIndex = headers.indexOf('template_name');
      const templateContentIndex = headers.indexOf('template_content');
      const requiredVariablesIndex = headers.indexOf('required_variables');
      const optionalVariablesIndex = headers.indexOf('optional_variables');
      const isActiveIndex = headers.indexOf('is_active');
      const conditionsIndex = headers.indexOf('conditions');

      // Find matching template
      for (const row of rows) {
        if (!row[isActiveIndex]) continue; // Skip inactive templates

        // Check workflow type match
        if (row[workflowTypeIndex] !== workflowType) continue;

        // Check category match
        if (row[categoryIndex] !== category) continue;

        // Check subcategory match
        if (row[subcategoryIndex] !== subcategory) continue;

        // Check conditions if status is provided
        if (status && row[conditionsIndex]) {
          try {
            const conditions = JSON.parse(row[conditionsIndex]);
            if (conditions.status && conditions.status !== status) {
              continue;
            }
          } catch {
            // Invalid JSON in conditions, skip condition check
          }
        }

        // Found matching template
        const template = {
          template_id: row[templateIdIndex],
          workflow_type: row[workflowTypeIndex],
          category: row[categoryIndex],
          subcategory: row[subcategoryIndex],
          template_name: row[templateNameIndex],
          template_content: row[templateContentIndex],
          required_variables: this.parseJsonSafely(row[requiredVariablesIndex], []),
          optional_variables: this.parseJsonSafely(row[optionalVariablesIndex], []),
          conditions: this.parseJsonSafely(row[conditionsIndex], {})
        };

        // Cache result
        if (this.cacheEnabled) {
          this.cache.set(cacheKey, template);
        }

        return template;
      }

      return null; // No matching template found
    } catch (error) {
      logError('getTemplate error', { workflowType, category, subcategory, status, error });
      throw error;
    }
  }

  /**
   * Get template by ID
   * @param {string} templateId - Template ID
   * @returns {Object|null} Template object or null
   */
  getTemplateById(templateId) {
    try {
      const cacheKey = `template_by_id_${templateId}`;
      if (this.cacheEnabled && this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      const sheet = this.spreadsheet.getSheetByName('Templates');
      if (!sheet) {
        throw new Error('Templates sheet not found');
      }

      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const rows = data.slice(1);

      // Find column indices
      const templateIdIndex = headers.indexOf('template_id');
      const workflowTypeIndex = headers.indexOf('workflow_type');
      const categoryIndex = headers.indexOf('category');
      const subcategoryIndex = headers.indexOf('subcategory');
      const templateNameIndex = headers.indexOf('template_name');
      const templateContentIndex = headers.indexOf('template_content');
      const requiredVariablesIndex = headers.indexOf('required_variables');
      const optionalVariablesIndex = headers.indexOf('optional_variables');
      const isActiveIndex = headers.indexOf('is_active');

      // Find template by ID
      for (const row of rows) {
        if (row[templateIdIndex] === templateId && row[isActiveIndex]) {
          const template = {
            template_id: row[templateIdIndex],
            workflow_type: row[workflowTypeIndex],
            category: row[categoryIndex],
            subcategory: row[subcategoryIndex],
            template_name: row[templateNameIndex],
            template_content: row[templateContentIndex],
            required_variables: this.parseJsonSafely(row[requiredVariablesIndex], []),
            optional_variables: this.parseJsonSafely(row[optionalVariablesIndex], [])
          };

          // Cache result
          if (this.cacheEnabled) {
            this.cache.set(cacheKey, template);
          }

          return template;
        }
      }

      return null;
    } catch (error) {
      logError('getTemplateById error', { templateId, error });
      throw error;
    }
  }

  /**
   * Get template variables (combines required and optional)
   * @param {string} templateId - Template ID
   * @returns {Object} Object with required and optional variable arrays
   */
  getTemplateVariables(templateId) {
    try {
      const template = this.getTemplateById(templateId);
      if (!template) {
        return { required: [], optional: [] };
      }

      return {
        required: template.required_variables || [],
        optional: template.optional_variables || []
      };
    } catch (error) {
      logError('getTemplateVariables error', { templateId, error });
      return { required: [], optional: [] };
    }
  }

  /**
   * Get variable definition
   * @param {string} variableName - Variable name
   * @returns {Object|null} Variable object or null
   */
  getVariable(variableName) {
    try {
      const cacheKey = `variable_${variableName}`;
      if (this.cacheEnabled && this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      const sheet = this.spreadsheet.getSheetByName('Variables');
      if (!sheet) {
        throw new Error('Variables sheet not found');
      }

      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const rows = data.slice(1);

      // Find column indices
      const variableNameIndex = headers.indexOf('variable_name');
      const displayNameIndex = headers.indexOf('display_name');
      const variableTypeIndex = headers.indexOf('variable_type');
      const inputTypeIndex = headers.indexOf('input_type');
      const isRequiredIndex = headers.indexOf('is_required');
      const defaultValueIndex = headers.indexOf('default_value');
      const validationRuleIndex = headers.indexOf('validation_rule');
      const placeholderIndex = headers.indexOf('placeholder');
      const helpTextIndex = headers.indexOf('help_text');
      const optionsSourceIndex = headers.indexOf('options_source');
      const sortOrderIndex = headers.indexOf('sort_order');
      const isActiveIndex = headers.indexOf('is_active');

      // Find variable
      for (const row of rows) {
        if (row[variableNameIndex] === variableName && row[isActiveIndex]) {
          const variable = {
            variable_name: row[variableNameIndex],
            display_name: row[displayNameIndex],
            variable_type: row[variableTypeIndex],
            input_type: row[inputTypeIndex],
            is_required: row[isRequiredIndex],
            default_value: row[defaultValueIndex],
            validation_rule: row[validationRuleIndex],
            placeholder: row[placeholderIndex],
            help_text: row[helpTextIndex],
            options_source: row[optionsSourceIndex],
            sort_order: row[sortOrderIndex] || 999
          };

          // Cache result
          if (this.cacheEnabled) {
            this.cache.set(cacheKey, variable);
          }

          return variable;
        }
      }

      return null;
    } catch (error) {
      logError('getVariable error', { variableName, error });
      return null;
    }
  }

  /**
   * Get options for a variable
   * @param {string} variableName - Variable name
   * @returns {Array} Array of option objects
   */
  getOptions(variableName) {
    try {
      const cacheKey = `options_${variableName}`;
      if (this.cacheEnabled && this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      const sheet = this.spreadsheet.getSheetByName('Options');
      if (!sheet) {
        throw new Error('Options sheet not found');
      }

      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const rows = data.slice(1);

      // Find column indices
      const optionIdIndex = headers.indexOf('option_id');
      const variableNameIndex = headers.indexOf('variable_name');
      const optionValueIndex = headers.indexOf('option_value');
      const optionLabelIndex = headers.indexOf('option_label');
      const sortOrderIndex = headers.indexOf('sort_order');
      const isActiveIndex = headers.indexOf('is_active');
      const isDefaultIndex = headers.indexOf('is_default');

      const options = [];
      for (const row of rows) {
        if (row[variableNameIndex] === variableName && row[isActiveIndex]) {
          options.push({
            id: row[optionIdIndex],
            value: row[optionValueIndex],
            label: row[optionLabelIndex],
            sortOrder: row[sortOrderIndex] || 999,
            isDefault: row[isDefaultIndex] || false
          });
        }
      }

      // Sort options by sort order
      options.sort((a, b) => a.sortOrder - b.sortOrder);

      // Cache result
      if (this.cacheEnabled) {
        this.cache.set(cacheKey, options);
      }

      return options;
    } catch (error) {
      logError('getOptions error', { variableName, error });
      return [];
    }
  }

  /**
   * Get workflow configuration for a specific type and step
   * @param {string} workflowType - Workflow type
   * @param {number} stepNumber - Step number
   * @returns {Object|null} Workflow config or null
   */
  getWorkflowConfig(workflowType, stepNumber) {
    try {
      const cacheKey = `workflow_config_${workflowType}_${stepNumber}`;
      if (this.cacheEnabled && this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      const sheet = this.spreadsheet.getSheetByName('WorkflowConfig');
      if (!sheet) {
        throw new Error('WorkflowConfig sheet not found');
      }

      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const rows = data.slice(1);

      // Find column indices
      const workflowIdIndex = headers.indexOf('workflow_id');
      const workflowTypeIndex = headers.indexOf('workflow_type');
      const stepNumberIndex = headers.indexOf('step_number');
      const stepNameIndex = headers.indexOf('step_name');
      const stepTypeIndex = headers.indexOf('step_type');
      const optionsIndex = headers.indexOf('options');
      const nextStepIndex = headers.indexOf('next_step');
      const requiredFieldsIndex = headers.indexOf('required_fields');
      const validationRulesIndex = headers.indexOf('validation_rules');
      const isTerminalIndex = headers.indexOf('is_terminal');

      // Find workflow config
      for (const row of rows) {
        if (row[workflowTypeIndex] === workflowType && row[stepNumberIndex] === stepNumber) {
          const config = {
            workflow_id: row[workflowIdIndex],
            workflow_type: row[workflowTypeIndex],
            step_number: row[stepNumberIndex],
            step_name: row[stepNameIndex],
            step_type: row[stepTypeIndex],
            options: this.parseJsonSafely(row[optionsIndex], []),
            next_step: this.parseJsonSafely(row[nextStepIndex], {}),
            required_fields: this.parseJsonSafely(row[requiredFieldsIndex], []),
            validation_rules: this.parseJsonSafely(row[validationRulesIndex], {}),
            is_terminal: row[isTerminalIndex]
          };

          // Cache result
          if (this.cacheEnabled) {
            this.cache.set(cacheKey, config);
          }

          return config;
        }
      }

      return null;
    } catch (error) {
      logError('getWorkflowConfig error', { workflowType, stepNumber, error });
      return null;
    }
  }

  /**
   * Clear all cached data
   */
  clearCache() {
    this.cache.clear();
    logInfo('Database cache cleared');
  }

  /**
   * Enable or disable caching
   * @param {boolean} enabled - Whether to enable caching
   */
  setCacheEnabled(enabled) {
    this.cacheEnabled = enabled;
    if (!enabled) {
      this.clearCache();
    }
  }

  /**
   * Parse JSON string safely
   * @param {string} jsonString - JSON string to parse
   * @param {*} defaultValue - Default value if parsing fails
   * @returns {*} Parsed JSON or default value
   */
  parseJsonSafely(jsonString, defaultValue) {
    try {
      if (!jsonString || jsonString.trim() === '') {
        return defaultValue;
      }
      return JSON.parse(jsonString);
    } catch (error) {
      logWarning('JSON parse failed, using default value', { jsonString, error });
      return defaultValue;
    }
  }

  /**
   * Log audit entry
   * @param {string} action - Action performed
   * @param {string} entity - Entity type
   * @param {string} entityId - Entity ID
   * @param {Object} details - Additional details
   */
  logAudit(action, entity, entityId, details = {}) {
    try {
      const sheet = this.spreadsheet.getSheetByName('AuditLog');
      if (!sheet) {
        logWarning('AuditLog sheet not found, skipping audit log');
        return;
      }

      const timestamp = new Date();
      const user = Session.getActiveUser().getEmail();
      const logId = `LOG_${timestamp.getTime()}`;

      const rowData = [
        logId,
        timestamp,
        user,
        action,
        entity,
        entityId,
        JSON.stringify(details),
        '', // ip_address - not available in GAS
        '' // user_agent - not available in GAS
      ];

      sheet.appendRow(rowData);
    } catch (error) {
      logError('Failed to log audit entry', error);
    }
  }

  /**
   * Get database statistics
   * @returns {Object} Database statistics
   */
  getStatistics() {
    try {
      const stats = {
        timestamp: new Date().toISOString(),
        sheets: {}
      };

      const sheetNames = ['Templates', 'Variables', 'Options', 'WorkflowConfig', 'PolicyCategories', 'AuditLog'];
      
      for (const sheetName of sheetNames) {
        const sheet = this.spreadsheet.getSheetByName(sheetName);
        if (sheet) {
          const lastRow = sheet.getLastRow();
          const lastColumn = sheet.getLastColumn();
          stats.sheets[sheetName] = {
            rows: Math.max(0, lastRow - 1), // Exclude header row
            columns: lastColumn,
            lastUpdated: sheet.getRange('A1').getLastUpdated()
          };
        }
      }

      stats.cacheSize = this.cache.size;
      stats.cacheEnabled = this.cacheEnabled;

      return stats;
    } catch (error) {
      logError('Failed to get database statistics', error);
      return { error: error.message };
    }
  }
}

// Utility functions for backward compatibility

/**
 * Get database service instance
 * @returns {DatabaseService} Database service instance
 */
function getDatabaseService() {
  return new DatabaseService();
}

/**
 * Clear database cache
 */
function clearDatabaseCache() {
  const db = new DatabaseService();
  db.clearCache();
}

/**
 * Get database statistics
 * @returns {Object} Database statistics
 */
function getDatabaseStatistics() {
  const db = new DatabaseService();
  return db.getStatistics();
}