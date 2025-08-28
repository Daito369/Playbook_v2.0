/* exported doGet, doPost, include, initializeWorkflow, fetchPolicies, fetchTemplate, advanceWorkflow */
/* eslint-disable no-unused-vars */
/**
 * @fileoverview Main controller and entry points for PolicyPlayBook.
 * Provides doGet/doPost handlers and server-side API functions.
 */

/**
 * GET entry point.
 * @param {GoogleAppsScript.Events.DoGet} e - Event parameter.
 * @returns {GoogleAppsScript.HTML.HtmlOutput|GoogleAppsScript.Content.TextOutput} Response.
 */
function doGet(e) {
  const controller = new AppController();
  return controller.handleGet(e || {});
}

/**
 * POST entry point.
 * @param {GoogleAppsScript.Events.DoPost} e - Event parameter.
 * @returns {GoogleAppsScript.Content.TextOutput} Response.
 */
function doPost(e) {
  const controller = new AppController();
  return controller.handlePost(e || {});
}

/**
 * Includes HTML partials.
 * @param {string} filename - File name without extension.
 * @returns {string} Included content.
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile('web/' + filename).getContent();
}

/**
 * Initializes workflow (exposed to client).
 * @param {Object} payload - Initialization payload.
 * @returns {Object} Workflow initialization data.
 */
function initializeWorkflow(payload) {
  const wf = new Workflow();
  return wf.initialize(payload || {});
}

/**
 * Fetches policy categories.
 * @param {string} type - Workflow type.
 * @returns {Object[]} Categories.
 */
function fetchPolicies(type) {
  const wf = new Workflow();
  return wf.getPolicies(type);
}

/**
 * Fetches a template.
 * @param {string} category - Category name.
 * @param {string} subcategory - Subcategory name.
 * @param {string} status - Workflow type/status.
 * @returns {Object} Template information.
 */
function fetchTemplate(category, subcategory, status) {
  const wf = new Workflow();
  return wf.getTemplate(category, subcategory, status);
}

/**
 * Advances workflow state.
 * @param {string} workflowId - Workflow ID.
 * @param {string} action - Action name.
 * @returns {Object} Updated state.
 */
function advanceWorkflow(workflowId, action) {
  const wf = new Workflow();
  return wf.transition(workflowId, action);
}
/* eslint-enable no-unused-vars */

/**
 * Application controller for request routing.
 */
class AppController {
  /**
   * Creates a new AppController instance.
   */
  constructor() {
    this.workflow = new Workflow();
  }

  /**
   * Handles GET requests.
   * @param {GoogleAppsScript.Events.DoGet} e - Event parameters.
   * @returns {GoogleAppsScript.HTML.HtmlOutput|GoogleAppsScript.Content.TextOutput} Response.
   */
  handleGet(e) {
    const path = e.pathInfo || '';
    const params = e.parameter || {};
    switch (path) {
      case 'workflow/policies':
        return this.json(this.workflow.getPolicies(params.type));
      case 'workflow/template':
        return this.json(
          this.workflow.getTemplate(params.category, params.subcategory, params.status)
        );
      default:
        return HtmlService.createTemplateFromFile('web/index').evaluate();
    }
  }

  /**
   * Handles POST requests.
   * @param {GoogleAppsScript.Events.DoPost} e - Event parameters.
   * @returns {GoogleAppsScript.Content.TextOutput} Response.
   */
  handlePost(e) {
    const path = e.pathInfo || '';
    let payload = {};
    if (e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (err) {
        payload = {};
      }
    }
    switch (path) {
      case 'workflow/initialize':
        return this.json(this.workflow.initialize(payload));
      case 'workflow/transition':
        return this.json(
          this.workflow.transition(payload.workflowId, payload.action)
        );
      default:
        return this.error('NOT_FOUND', 'Endpoint not found');
    }
  }

  /**
   * Creates JSON response.
   * @param {Object} data - Response data.
   * @returns {GoogleAppsScript.Content.TextOutput} JSON output.
   */
  json(data) {
    return ContentService.createTextOutput(JSON.stringify({ success: true, data }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  /**
   * Creates error response.
   * @param {string} code - Error code.
   * @param {string} message - Error message.
   * @returns {GoogleAppsScript.Content.TextOutput} JSON output.
   */
  error(code, message) {
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, error: { code, message } })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

if (typeof module !== 'undefined') {
  module.exports = { AppController };
}
