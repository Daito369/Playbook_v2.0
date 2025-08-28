/**
 * PolicyPlayBook v2.0 - Validation Service
 * @fileoverview Input validation and data integrity service
 * @author PolicyPlayBook Team
 * @version 2.0.0
 */

/**
 * Validation service class
 */
class ValidationService {
  constructor() {
    this.rules = new Map();
    this.setupDefaultRules();
  }

  /**
   * Validate a value against rules
   * @param {string} field - Field name
   * @param {*} value - Value to validate
   * @param {Object|Array} rules - Validation rules
   * @returns {Object} Validation result
   */
  validate(field, value, rules = []) {
    const errors = [];
    const warnings = [];

    try {
      // Convert single rule to array
      if (!Array.isArray(rules)) {
        rules = [rules];
      }

      // Get field-specific rules if available
      const fieldRules = this.rules.get(field);
      if (fieldRules) {
        rules = rules.concat(fieldRules);
      }

      // Apply validation rules
      for (const rule of rules) {
        const result = this.applyRule(field, value, rule);
        if (!result.isValid) {
          errors.push(...result.errors);
        }
        if (result.warnings) {
          warnings.push(...result.warnings);
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      logError('Validation failed', { field, error: error.message });
      return {
        isValid: false,
        errors: ['検証処理でエラーが発生しました'],
        warnings
      };
    }
  }

  /**
   * Apply a single validation rule
   * @param {string} field - Field name
   * @param {*} value - Value to validate
   * @param {Object|string} rule - Validation rule
   * @returns {Object} Rule validation result
   */
  applyRule(field, value, rule) {
    try {
      // Handle string rules (shorthand)
      if (typeof rule === 'string') {
        rule = { type: rule };
      }

      const ruleType = rule.type;
      const ruleOptions = rule.options || {};

      switch (ruleType) {
        case 'required':
          return this.validateRequired(value, ruleOptions);
        case 'email':
          return this.validateEmail(value, ruleOptions);
        case 'url':
          return this.validateUrl(value, ruleOptions);
        case 'length':
          return this.validateLength(value, ruleOptions);
        case 'range':
          return this.validateRange(value, ruleOptions);
        case 'pattern':
          return this.validatePattern(value, ruleOptions);
        case 'date':
          return this.validateDate(value, ruleOptions);
        case 'number':
          return this.validateNumber(value, ruleOptions);
        case 'choice':
          return this.validateChoice(value, ruleOptions);
        case 'custom':
          return this.validateCustom(value, ruleOptions);
        default:
          return {
            isValid: true,
            warnings: [`未知の検証ルール: ${ruleType}`]
          };
      }

    } catch (error) {
      return {
        isValid: false,
        errors: [`ルール適用エラー: ${error.message}`]
      };
    }
  }

  /**
   * Validate required field
   * @param {*} value - Value to validate
   * @param {Object} options - Rule options
   * @returns {Object} Validation result
   */
  validateRequired(value, options = {}) {
    const isEmpty = value === null || value === undefined || 
                   (typeof value === 'string' && value.trim() === '') ||
                   (Array.isArray(value) && value.length === 0);

    if (isEmpty) {
      return {
        isValid: false,
        errors: [options.message || 'この項目は必須です']
      };
    }

    return { isValid: true };
  }

  /**
   * Validate email format
   * @param {*} value - Value to validate
   * @param {Object} options - Rule options
   * @returns {Object} Validation result
   */
  validateEmail(value, options = {}) {
    if (!value) return { isValid: true }; // Skip if empty (use required rule)

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(String(value));

    return {
      isValid,
      errors: isValid ? [] : [options.message || '有効なメールアドレスを入力してください']
    };
  }

  /**
   * Validate URL format
   * @param {*} value - Value to validate
   * @param {Object} options - Rule options
   * @returns {Object} Validation result
   */
  validateUrl(value, options = {}) {
    if (!value) return { isValid: true };

    try {
      new URL(String(value));
      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        errors: [options.message || '有効なURLを入力してください']
      };
    }
  }

  /**
   * Validate string length
   * @param {*} value - Value to validate
   * @param {Object} options - Rule options (min, max)
   * @returns {Object} Validation result
   */
  validateLength(value, options = {}) {
    if (!value) return { isValid: true };

    const length = String(value).length;
    const min = options.min;
    const max = options.max;
    const errors = [];

    if (min !== undefined && length < min) {
      errors.push(options.minMessage || `${min}文字以上で入力してください`);
    }

    if (max !== undefined && length > max) {
      errors.push(options.maxMessage || `${max}文字以下で入力してください`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate numeric range
   * @param {*} value - Value to validate
   * @param {Object} options - Rule options (min, max)
   * @returns {Object} Validation result
   */
  validateRange(value, options = {}) {
    if (!value) return { isValid: true };

    const num = Number(value);
    if (isNaN(num)) {
      return {
        isValid: false,
        errors: [options.message || '数値を入力してください']
      };
    }

    const min = options.min;
    const max = options.max;
    const errors = [];

    if (min !== undefined && num < min) {
      errors.push(options.minMessage || `${min}以上の値を入力してください`);
    }

    if (max !== undefined && num > max) {
      errors.push(options.maxMessage || `${max}以下の値を入力してください`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate against regex pattern
   * @param {*} value - Value to validate
   * @param {Object} options - Rule options (pattern, flags)
   * @returns {Object} Validation result
   */
  validatePattern(value, options = {}) {
    if (!value) return { isValid: true };

    if (!options.pattern) {
      return {
        isValid: false,
        errors: ['パターンが指定されていません']
      };
    }

    try {
      const regex = new RegExp(options.pattern, options.flags || '');
      const isValid = regex.test(String(value));

      return {
        isValid,
        errors: isValid ? [] : [options.message || '入力形式が正しくありません']
      };
    } catch (error) {
      return {
        isValid: false,
        errors: ['パターン検証エラー']
      };
    }
  }

  /**
   * Validate date format and range
   * @param {*} value - Value to validate
   * @param {Object} options - Rule options
   * @returns {Object} Validation result
   */
  validateDate(value, options = {}) {
    if (!value) return { isValid: true };

    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return {
        isValid: false,
        errors: [options.message || '有効な日付を入力してください']
      };
    }

    const errors = [];
    const today = new Date();

    if (options.future && date <= today) {
      errors.push(options.futureMessage || '未来の日付を入力してください');
    }

    if (options.past && date >= today) {
      errors.push(options.pastMessage || '過去の日付を入力してください');
    }

    if (options.min) {
      const minDate = new Date(options.min);
      if (date < minDate) {
        errors.push(options.minMessage || `${this.formatDate(minDate)}以降の日付を入力してください`);
      }
    }

    if (options.max) {
      const maxDate = new Date(options.max);
      if (date > maxDate) {
        errors.push(options.maxMessage || `${this.formatDate(maxDate)}以前の日付を入力してください`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate numeric value
   * @param {*} value - Value to validate
   * @param {Object} options - Rule options
   * @returns {Object} Validation result
   */
  validateNumber(value, options = {}) {
    if (!value) return { isValid: true };

    const num = Number(value);
    if (isNaN(num)) {
      return {
        isValid: false,
        errors: [options.message || '数値を入力してください']
      };
    }

    const errors = [];

    if (options.integer && !Number.isInteger(num)) {
      errors.push(options.integerMessage || '整数を入力してください');
    }

    if (options.positive && num <= 0) {
      errors.push(options.positiveMessage || '正の数を入力してください');
    }

    if (options.negative && num >= 0) {
      errors.push(options.negativeMessage || '負の数を入力してください');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate choice from predefined options
   * @param {*} value - Value to validate
   * @param {Object} options - Rule options (choices)
   * @returns {Object} Validation result
   */
  validateChoice(value, options = {}) {
    if (!value) return { isValid: true };

    if (!options.choices || !Array.isArray(options.choices)) {
      return {
        isValid: false,
        errors: ['選択肢が指定されていません']
      };
    }

    const isValid = options.choices.includes(value);
    return {
      isValid,
      errors: isValid ? [] : [options.message || '有効な選択肢を選んでください']
    };
  }

  /**
   * Validate using custom function
   * @param {*} value - Value to validate
   * @param {Object} options - Rule options (validator function)
   * @returns {Object} Validation result
   */
  validateCustom(value, options = {}) {
    if (typeof options.validator !== 'function') {
      return {
        isValid: false,
        errors: ['カスタム検証関数が指定されていません']
      };
    }

    try {
      const result = options.validator(value);
      
      // Handle boolean return
      if (typeof result === 'boolean') {
        return {
          isValid: result,
          errors: result ? [] : [options.message || '入力値が無効です']
        };
      }

      // Handle object return
      return result;

    } catch (error) {
      return {
        isValid: false,
        errors: [`カスタム検証エラー: ${error.message}`]
      };
    }
  }

  /**
   * Add validation rule for a field
   * @param {string} field - Field name
   * @param {Array} rules - Validation rules
   */
  addFieldRules(field, rules) {
    this.rules.set(field, rules);
  }

  /**
   * Setup default validation rules
   */
  setupDefaultRules() {
    // Customer ID validation
    this.addFieldRules('customer_id', [
      { type: 'required' },
      { type: 'pattern', options: { 
        pattern: '^[0-9]{3}-[0-9]{3}-[0-9]{4}$',
        message: '顧客IDは ###-###-#### の形式で入力してください'
      }}
    ]);

    // Campaign ID validation
    this.addFieldRules('campaign_id', [
      { type: 'required' },
      { type: 'number', options: { 
        integer: true, 
        positive: true,
        message: 'キャンペーンIDは正の整数を入力してください'
      }}
    ]);

    // Email validation
    this.addFieldRules('contact_email', [
      { type: 'email' }
    ]);

    // URL validation
    this.addFieldRules('landing_page_url', [
      { type: 'url' }
    ]);

    // Business name validation
    this.addFieldRules('business_name', [
      { type: 'required' },
      { type: 'length', options: { 
        min: 2, 
        max: 100,
        minMessage: '事業者名は2文字以上で入力してください',
        maxMessage: '事業者名は100文字以下で入力してください'
      }}
    ]);

    // Product name validation
    this.addFieldRules('product_name', [
      { type: 'required' },
      { type: 'length', options: { 
        min: 1, 
        max: 200,
        maxMessage: '商品名は200文字以下で入力してください'
      }}
    ]);

    // Description validation
    this.addFieldRules('description', [
      { type: 'length', options: { 
        max: 1000,
        maxMessage: '説明は1000文字以下で入力してください'
      }}
    ]);

    // Policy violation reason
    this.addFieldRules('violation_reason', [
      { type: 'required' },
      { type: 'length', options: { 
        min: 10,
        max: 500,
        minMessage: 'ポリシー違反理由は10文字以上で入力してください',
        maxMessage: 'ポリシー違反理由は500文字以下で入力してください'
      }}
    ]);

    // Appeal reason
    this.addFieldRules('appeal_reason', [
      { type: 'length', options: { 
        max: 1000,
        maxMessage: '異議申し立て理由は1000文字以下で入力してください'
      }}
    ]);

    // Date validations
    this.addFieldRules('review_date', [
      { type: 'date', options: { 
        past: true,
        pastMessage: '審査日は過去の日付を選択してください'
      }}
    ]);

    this.addFieldRules('response_deadline', [
      { type: 'date', options: { 
        future: true,
        futureMessage: '回答期限は未来の日付を選択してください'
      }}
    ]);

    // Channel type validation
    this.addFieldRules('channel_type', [
      { type: 'choice', options: { 
        choices: ['検索広告', 'ショッピング広告', 'ショッピングキャンペーン', 'ディスプレイ広告'],
        message: '有効なチャネルタイプを選択してください'
      }}
    ]);
  }

  /**
   * Format date for display
   * @param {Date} date - Date to format
   * @returns {string} Formatted date
   */
  formatDate(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}年${month}月${day}日`;
  }

  /**
   * Validate multiple fields at once
   * @param {Object} data - Data object to validate
   * @param {Object} fieldRules - Rules for each field
   * @returns {Object} Validation result with field-specific errors
   */
  validateMultiple(data, fieldRules = {}) {
    const result = {
      isValid: true,
      errors: {},
      warnings: {},
      globalErrors: []
    };

    try {
      for (const [field, value] of Object.entries(data)) {
        const rules = fieldRules[field] || this.rules.get(field) || [];
        const fieldResult = this.validate(field, value, rules);

        if (!fieldResult.isValid) {
          result.isValid = false;
          result.errors[field] = fieldResult.errors;
        }

        if (fieldResult.warnings && fieldResult.warnings.length > 0) {
          result.warnings[field] = fieldResult.warnings;
        }
      }

      return result;

    } catch (error) {
      logError('Multiple validation failed', error);
      return {
        isValid: false,
        errors: {},
        warnings: {},
        globalErrors: ['検証処理でエラーが発生しました']
      };
    }
  }

  /**
   * Sanitize input value
   * @param {*} value - Value to sanitize
   * @param {Object} options - Sanitization options
   * @returns {*} Sanitized value
   */
  sanitize(value, options = {}) {
    try {
      if (typeof value !== 'string') {
        return value;
      }

      let sanitized = value;

      // Trim whitespace
      if (options.trim !== false) {
        sanitized = sanitized.trim();
      }

      // Remove HTML tags
      if (options.stripTags) {
        sanitized = sanitized.replace(/<[^>]*>/g, '');
      }

      // Escape HTML entities
      if (options.escapeHtml) {
        sanitized = sanitized
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;');
      }

      // Normalize whitespace
      if (options.normalizeWhitespace) {
        sanitized = sanitized.replace(/\s+/g, ' ');
      }

      // Convert to lowercase
      if (options.lowercase) {
        sanitized = sanitized.toLowerCase();
      }

      // Convert to uppercase
      if (options.uppercase) {
        sanitized = sanitized.toUpperCase();
      }

      return sanitized;

    } catch (error) {
      logWarning('Sanitization failed', { value, error: error.message });
      return value;
    }
  }
}

/**
 * Get validation service instance
 * @returns {ValidationService} Validation service instance
 */
function getValidationService() {
  return new ValidationService();
}