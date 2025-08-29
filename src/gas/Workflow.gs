/**
 * @fileoverview Workflow engine for PolicyPlayBook.
 * Manages state transitions and data retrieval.
 */

const WorkflowStates = {
  INITIAL: 'initial',
  TYPE_SELECTED: 'type_selected',
  POLICY_SELECTED: 'policy_selected',
  STATUS_SELECTED: 'status_selected',
  INPUT_REQUIRED: 'input_required',
  VALIDATION: 'validation',
  GENERATION: 'generation',
  COMPLETED: 'completed',
  ERROR: 'error',
};

/**
 * Workflow engine handling state management and data retrieval.
 */
class Workflow {
  /**
   * Creates a Workflow instance.
   * @param {Database=} db - Optional database instance.
   */
  constructor(db) {
    this.db = db || new Database();
  }

  /**
   * Initializes a new workflow session.
   * @param {Object} _payload - Initialization payload.
   * @returns {Object} Initialization response.
   */
  initialize(_payload) {
    const wfId = 'WF_' + Utilities.getUuid();
    const configs = this.db
      .readAll('WorkflowConfig')
      .filter((r) => String(r.step_number) === '1');
    let types = [];
    if (configs.length && configs[0].options) {
      try {
        types = JSON.parse(configs[0].options);
      } catch (err) {
        types = [];
      }
    }
    Cache.put(`wf_${wfId}`, { state: WorkflowStates.INITIAL }, 21600);
    return {
      workflowId: wfId,
      availableTypes: types.map((t) => ({ id: t, label: t })),
      currentStep: 1,
      totalSteps: 5,
    };
  }

  /**
   * Retrieves policy categories for a workflow type.
   * @param {string} type - Workflow type.
   * @returns {Object[]} Categories.
   */
  getPolicies(type) {
    const categories = this.db.readAll('PolicyCategories');
    return categories
      .filter((c) => {
        try {
          return c.is_active === true || String(c.is_active).toUpperCase() === 'TRUE';
        } catch (err) {
          return false;
        }
      })
      .filter((c) => {
        try {
          return JSON.parse(c.workflow_types || '[]').includes(type);
        } catch (err) {
          return false;
        }
      })
      .map((c) => ({
        id: c.category_id,
        name: c.category_name,
        parent: c.parent_category,
      }));
  }

  /**
   * Retrieves a template by category and status.
   * @param {string} category - Category name.
   * @param {string} subcategory - Subcategory name.
   * @param {string} status - Workflow type/status.
   * @returns {Object} Template information.
   * @throws {Error} If template not found.
   */
  getTemplate(category, subcategory, status) {
    const templates = this.db.readAll('Templates').filter(
      (t) =>
        t.category === category &&
        t.subcategory === subcategory &&
        t.workflow_type === status &&
        (t.is_active === true || String(t.is_active).toUpperCase() === 'TRUE')
    );
    if (!templates.length) {
      throw new Error('Template not found');
    }
    const tpl = templates[0];
    let required = [];
    try {
      required = JSON.parse(tpl.required_variables || '[]');
    } catch (err) {
      required = [];
    }
    return {
      templateId: tpl.template_id,
      templateName: tpl.template_name,
      requiredFields: required,
    };
  }

  /**
   * Transitions workflow state based on action.
   * @param {string} workflowId - Workflow ID.
   * @param {string} action - Action name.
   * @returns {Object} Updated state.
   */
  transition(workflowId, action) {
    const key = `wf_${workflowId}`;
    const stateObj = Cache.get(key) || { state: WorkflowStates.INITIAL };
    const current = stateObj.state;
    let next = current;
    switch (current) {
      case WorkflowStates.INITIAL:
        if (action === 'selectType') {
          next = WorkflowStates.TYPE_SELECTED;
        }
        break;
      case WorkflowStates.TYPE_SELECTED:
        if (action === 'selectPolicy') {
          next = WorkflowStates.POLICY_SELECTED;
        }
        break;
      case WorkflowStates.POLICY_SELECTED:
        if (action === 'selectStatus') {
          next = WorkflowStates.STATUS_SELECTED;
        }
        break;
      case WorkflowStates.STATUS_SELECTED:
        if (action === 'requireInput') {
          next = WorkflowStates.INPUT_REQUIRED;
        } else if (action === 'generate') {
          next = WorkflowStates.GENERATION;
        }
        break;
      case WorkflowStates.INPUT_REQUIRED:
        if (action === 'submitInput') {
          next = WorkflowStates.VALIDATION;
        }
        break;
      case WorkflowStates.VALIDATION:
        if (action === 'validate') {
          next = WorkflowStates.GENERATION;
        }
        break;
      case WorkflowStates.GENERATION:
        if (action === 'complete') {
          next = WorkflowStates.COMPLETED;
        }
        break;
      default:
        next = WorkflowStates.ERROR;
    }
    stateObj.state = next;
    Cache.put(key, stateObj, 21600);
    return stateObj;
  }
}

if (typeof module !== 'undefined') {
  module.exports = { Workflow, WorkflowStates };
}
