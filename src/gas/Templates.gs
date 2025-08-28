/**
 * PolicyPlayBook v2.0 - Template Engine
 * @fileoverview Template processing and variable substitution engine
 * @author PolicyPlayBook Team
 * @version 2.0.0
 */

/**
 * Template processing engine
 */
class TemplateEngine {
  constructor() {
    this.variables = new Map();
    this.functions = new Map();
    this.setupBuiltInFunctions();
  }

  /**
   * Process template with variables
   * @param {string} template - Template content
   * @param {Object} variables - Variables for substitution
   * @param {Object} options - Processing options
   * @returns {string} Processed content
   */
  processTemplate(template, variables = {}, options = {}) {
    try {
      if (!template) {
        throw new Error('Template content is required');
      }

      // Set variables
      this.variables.clear();
      for (const [key, value] of Object.entries(variables)) {
        this.variables.set(key, value);
      }

      let content = template;

      // Process conditional blocks first
      content = this.processConditionals(content, options);
      
      // Process loops
      content = this.processLoops(content, options);
      
      // Process variable substitutions
      content = this.processVariables(content, options);
      
      // Process function calls
      content = this.processFunctions(content, options);
      
      // Process formatting
      content = this.processFormatting(content, options);

      // Clean up any remaining template syntax if in preview mode
      if (options.preview) {
        content = this.cleanPreviewContent(content);
      }

      return content.trim();
      
    } catch (error) {
      logError('Template processing failed', error);
      if (options.preview) {
        return `テンプレート処理エラー: ${error.message}`;
      }
      throw new Error('テンプレート処理に失敗しました');
    }
  }

  /**
   * Process conditional blocks {{#if condition}}...{{/if}}
   * @param {string} content - Content to process
   * @param {Object} options - Processing options
   * @returns {string} Processed content
   */
  processConditionals(content, options) {
    const conditionalRegex = /\{\{#if\s+([^}]+)\}\}(.*?)\{\{\/if\}\}/gs;
    
    return content.replace(conditionalRegex, (match, condition, block) => {
      try {
        const shouldShow = this.evaluateCondition(condition.trim());
        return shouldShow ? block : '';
      } catch (error) {
        logWarning('Conditional evaluation failed', { condition, error: error.message });
        return options.preview ? `[条件エラー: ${condition}]` : '';
      }
    });
  }

  /**
   * Process loop blocks {{#each array}}...{{/each}}
   * @param {string} content - Content to process
   * @param {Object} options - Processing options
   * @returns {string} Processed content
   */
  processLoops(content, options) {
    const loopRegex = /\{\{#each\s+([^}]+)\}\}(.*?)\{\{\/each\}\}/gs;
    
    return content.replace(loopRegex, (match, arrayName, block) => {
      try {
        const arrayData = this.variables.get(arrayName.trim());
        if (!Array.isArray(arrayData)) {
          return options.preview ? `[配列エラー: ${arrayName}]` : '';
        }
        
        return arrayData.map((item, index) => {
          let itemBlock = block;
          
          // Replace {{this}} with current item
          itemBlock = itemBlock.replace(/\{\{this\}\}/g, item);
          
          // Replace {{@index}} with current index
          itemBlock = itemBlock.replace(/\{\{@index\}\}/g, index);
          
          // Replace {{@first}} and {{@last}}
          itemBlock = itemBlock.replace(/\{\{@first\}\}/g, index === 0 ? 'true' : 'false');
          itemBlock = itemBlock.replace(/\{\{@last\}\}/g, index === arrayData.length - 1 ? 'true' : 'false');
          
          return itemBlock;
        }).join('');
        
      } catch (error) {
        logWarning('Loop processing failed', { arrayName, error: error.message });
        return options.preview ? `[ループエラー: ${arrayName}]` : '';
      }
    });
  }

  /**
   * Process variable substitutions {{variable}}
   * @param {string} content - Content to process
   * @param {Object} options - Processing options
   * @returns {string} Processed content
   */
  processVariables(content, options) {
    const variableRegex = /\{\{([^{}#\/]+)\}\}/g;
    
    return content.replace(variableRegex, (match, variableName) => {
      const trimmed = variableName.trim();
      
      // Skip helper functions and conditionals
      if (trimmed.startsWith('#') || trimmed.startsWith('/') || trimmed.includes('(')) {
        return match;
      }
      
      try {
        let value = this.getVariableValue(trimmed);
        
        if (value === null || value === undefined) {
          if (options.preview) {
            return `[${trimmed}]`;
          }
          logWarning('Variable not found', { variable: trimmed });
          return '';
        }
        
        // Convert to string and handle arrays/objects
        if (typeof value === 'object') {
          value = Array.isArray(value) ? value.join(', ') : JSON.stringify(value);
        }
        
        return String(value);
        
      } catch (error) {
        logWarning('Variable substitution failed', { variable: trimmed, error: error.message });
        return options.preview ? `[エラー: ${trimmed}]` : '';
      }
    });
  }

  /**
   * Process function calls {{function(args)}}
   * @param {string} content - Content to process
   * @param {Object} options - Processing options
   * @returns {string} Processed content
   */
  processFunctions(content, options) {
    const functionRegex = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\(([^)]*)\)\}\}/g;
    
    return content.replace(functionRegex, (match, functionName, args) => {
      try {
        if (!this.functions.has(functionName)) {
          return options.preview ? `[関数未定義: ${functionName}]` : '';
        }
        
        const func = this.functions.get(functionName);
        const parsedArgs = this.parseArguments(args);
        const result = func.apply(this, parsedArgs);
        
        return String(result || '');
        
      } catch (error) {
        logWarning('Function call failed', { function: functionName, args, error: error.message });
        return options.preview ? `[関数エラー: ${functionName}]` : '';
      }
    });
  }

  /**
   * Process formatting directives
   * @param {string} content - Content to process
   * @param {Object} options - Processing options
   * @returns {string} Processed content
   */
  processFormatting(content, options) {
    // Process line breaks
    content = content.replace(/\\n/g, '\n');
    
    // Process tab characters
    content = content.replace(/\\t/g, '\t');
    
    // Process HTML entities if needed
    content = content.replace(/&lt;/g, '<');
    content = content.replace(/&gt;/g, '>');
    content = content.replace(/&amp;/g, '&');
    
    return content;
  }

  /**
   * Clean preview content from template syntax
   * @param {string} content - Content to clean
   * @returns {string} Cleaned content
   */
  cleanPreviewContent(content) {
    // Remove any remaining template syntax
    content = content.replace(/\{\{[^}]+\}\}/g, '[未設定]');
    
    // Normalize whitespace
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    return content;
  }

  /**
   * Evaluate conditional expression
   * @param {string} condition - Condition to evaluate
   * @returns {boolean} Evaluation result
   */
  evaluateCondition(condition) {
    try {
      // Simple variable check
      if (this.variables.has(condition)) {
        const value = this.variables.get(condition);
        return Boolean(value);
      }
      
      // Comparison operators
      const comparisonRegex = /^(.+?)\s*(==|!=|>|<|>=|<=)\s*(.+?)$/;
      const match = condition.match(comparisonRegex);
      
      if (match) {
        const [, left, operator, right] = match;
        const leftValue = this.getVariableValue(left.trim());
        const rightValue = this.getVariableValue(right.trim());
        
        switch (operator) {
          case '==': return leftValue == rightValue;
          case '!=': return leftValue != rightValue;
          case '>': return Number(leftValue) > Number(rightValue);
          case '<': return Number(leftValue) < Number(rightValue);
          case '>=': return Number(leftValue) >= Number(rightValue);
          case '<=': return Number(leftValue) <= Number(rightValue);
          default: return false;
        }
      }
      
      return false;
      
    } catch (error) {
      logWarning('Condition evaluation error', { condition, error: error.message });
      return false;
    }
  }

  /**
   * Get variable value with dot notation support
   * @param {string} path - Variable path (e.g., 'user.name')
   * @returns {*} Variable value
   */
  getVariableValue(path) {
    if (this.variables.has(path)) {
      return this.variables.get(path);
    }
    
    // Handle dot notation
    const parts = path.split('.');
    let current = this.variables.get(parts[0]);
    
    for (let i = 1; i < parts.length && current != null; i++) {
      current = current[parts[i]];
    }
    
    return current;
  }

  /**
   * Parse function arguments
   * @param {string} args - Arguments string
   * @returns {Array} Parsed arguments
   */
  parseArguments(args) {
    if (!args.trim()) {
      return [];
    }
    
    const parsedArgs = [];
    const argList = args.split(',');
    
    for (const arg of argList) {
      const trimmed = arg.trim();
      
      // String literal
      if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || 
          (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
        parsedArgs.push(trimmed.slice(1, -1));
      }
      // Number literal
      else if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
        parsedArgs.push(Number(trimmed));
      }
      // Boolean literal
      else if (trimmed === 'true' || trimmed === 'false') {
        parsedArgs.push(trimmed === 'true');
      }
      // Variable reference
      else {
        parsedArgs.push(this.getVariableValue(trimmed));
      }
    }
    
    return parsedArgs;
  }

  /**
   * Setup built-in template functions
   */
  setupBuiltInFunctions() {
    // Date formatting
    this.functions.set('formatDate', (date, format) => {
      try {
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) {
          return date;
        }
        
        return this.formatDate(dateObj, format);
      } catch (error) {
        return date;
      }
    });

    // Number formatting
    this.functions.set('formatNumber', (number, decimals = 0) => {
      try {
        return Number(number).toLocaleString('ja-JP', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals
        });
      } catch (error) {
        return number;
      }
    });

    // Text case conversion
    this.functions.set('upper', (text) => String(text || '').toUpperCase());
    this.functions.set('lower', (text) => String(text || '').toLowerCase());
    this.functions.set('capitalize', (text) => {
      const str = String(text || '');
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    });

    // Text manipulation
    this.functions.set('truncate', (text, length = 100) => {
      const str = String(text || '');
      return str.length > length ? str.substring(0, length) + '...' : str;
    });

    // Default value
    this.functions.set('default', (value, defaultValue) => {
      return (value === null || value === undefined || value === '') ? defaultValue : value;
    });

    // Join array
    this.functions.set('join', (array, separator = ', ') => {
      return Array.isArray(array) ? array.join(separator) : String(array || '');
    });

    // Channel type options
    this.functions.set('getChannelOptions', () => {
      return this.getChannelOptions();
    });

    // Policy status options
    this.functions.set('getStatusOptions', (workflowType) => {
      return this.getStatusOptions(workflowType);
    });
  }

  /**
   * Format date according to Japanese standards
   * @param {Date} date - Date to format
   * @param {string} format - Format string
   * @returns {string} Formatted date
   */
  formatDate(date, format = 'YYYY年MM月DD日') {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours();
    const minute = date.getMinutes();
    const second = date.getSeconds();

    return format
      .replace('YYYY', year)
      .replace('MM', month.toString().padStart(2, '0'))
      .replace('DD', day.toString().padStart(2, '0'))
      .replace('HH', hour.toString().padStart(2, '0'))
      .replace('mm', minute.toString().padStart(2, '0'))
      .replace('ss', second.toString().padStart(2, '0'));
  }

  /**
   * Get channel options for templates
   * @returns {Array} Channel options
   */
  getChannelOptions() {
    return [
      '検索広告',
      'ショッピング広告',
      'ショッピングキャンペーン',
      'ディスプレイ広告'
    ];
  }

  /**
   * Get status options for workflow type
   * @param {string} workflowType - Workflow type
   * @returns {Array} Status options
   */
  getStatusOptions(workflowType) {
    const statusOptions = {
      'misreview': [
        { value: 'approved', label: '承認済み' }
      ],
      'disapproval': [
        { value: 'disapproval_with_response', label: '不承認（回答あり）' },
        { value: 'disapproval_inferred', label: '不承認（推定）' }
      ],
      'certification': [
        { value: 'approved', label: '承認済み' },
        { value: 'disapproved', label: '不承認' }
      ],
      'other': [
        { value: 'need_info', label: '情報不足/Need info' },
        { value: 'at_followmail', label: 'AT/followmail' },
        { value: 'forced_stop', label: '強制停止' }
      ]
    };

    return statusOptions[workflowType] || [];
  }

  /**
   * Add custom function to the template engine
   * @param {string} name - Function name
   * @param {Function} func - Function implementation
   */
  addFunction(name, func) {
    if (typeof func === 'function') {
      this.functions.set(name, func);
    }
  }

  /**
   * Validate template syntax
   * @param {string} template - Template to validate
   * @returns {Object} Validation result
   */
  validateTemplate(template) {
    const errors = [];
    const warnings = [];

    try {
      // Check for unmatched braces
      const openBraces = (template.match(/\{\{/g) || []).length;
      const closeBraces = (template.match(/\}\}/g) || []).length;
      
      if (openBraces !== closeBraces) {
        errors.push('不一致な波括弧: 開始と終了の数が合いません');
      }

      // Check for unmatched conditionals
      const ifBlocks = (template.match(/\{\{#if/g) || []).length;
      const endifBlocks = (template.match(/\{\{\/if\}\}/g) || []).length;
      
      if (ifBlocks !== endifBlocks) {
        errors.push('不一致な条件文: {{#if}}と{{/if}}の数が合いません');
      }

      // Check for unmatched loops
      const eachBlocks = (template.match(/\{\{#each/g) || []).length;
      const endeachBlocks = (template.match(/\{\{\/each\}\}/g) || []).length;
      
      if (eachBlocks !== endeachBlocks) {
        errors.push('不一致なループ: {{#each}}と{{/each}}の数が合いません');
      }

      // Check for unknown functions
      const functionCalls = template.match(/\{\{([a-zA-Z_][a-zA-Z0-9_]*)\([^)]*\)\}\}/g) || [];
      for (const call of functionCalls) {
        const match = call.match(/\{\{([a-zA-Z_][a-zA-Z0-9_]*)\(/);
        if (match && !this.functions.has(match[1])) {
          warnings.push(`未定義の関数: ${match[1]}`);
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      return {
        isValid: false,
        errors: ['テンプレート検証エラー: ' + error.message],
        warnings
      };
    }
  }
}

/**
 * Get template engine instance
 * @returns {TemplateEngine} Template engine instance
 */
function getTemplateEngine() {
  return new TemplateEngine();
}