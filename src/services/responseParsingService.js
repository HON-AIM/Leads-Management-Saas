const { flattenObject } = require('./payloadTemplateService');
const logger = require('../utils/logger');

function extractResponseTokens(responseBody) {
  if (!responseBody || typeof responseBody !== 'object') return {};
  if (typeof responseBody === 'string') {
    try { responseBody = JSON.parse(responseBody); } catch { return {}; }
  }
  return flattenObject(responseBody);
}

function evaluateAcceptance(responseBody, rule) {
  if (!rule || !rule.enabled) {
    return { accepted: true, reason: 'No acceptance rule configured — treating HTTP 2xx as success', flatTokens: {} };
  }

  const { responseFieldPath, operator, expectedValue } = rule;

  if (!responseFieldPath) {
    return { accepted: true, reason: 'Acceptance rule enabled but no response field path set', flatTokens: {} };
  }

  const flatTokens = extractResponseTokens(responseBody);
  const actualValue = flatTokens[responseFieldPath];

  let accepted = false;
  let reason = '';

  switch (operator) {
    case 'exists':
      accepted = actualValue !== undefined && actualValue !== null && actualValue !== '';
      reason = accepted
        ? `Field "${responseFieldPath}" exists with value "${actualValue}"`
        : `Field "${responseFieldPath}" is missing or empty in response`;
      break;

    case 'equals':
      accepted = actualValue === expectedValue;
      reason = accepted
        ? `Field "${responseFieldPath}" equals "${expectedValue}"`
        : `Field "${responseFieldPath}" is "${actualValue}", expected "${expectedValue}"`;
      break;

    case 'not_equals':
      accepted = actualValue !== expectedValue;
      reason = accepted
        ? `Field "${responseFieldPath}" is "${actualValue}" (not equal to "${expectedValue}")`
        : `Field "${responseFieldPath}" equals "${expectedValue}"`;
      break;

    case 'contains':
      accepted = actualValue !== undefined && String(actualValue).toLowerCase().includes(expectedValue.toLowerCase());
      reason = accepted
        ? `Field "${responseFieldPath}" contains "${expectedValue}"`
        : `Field "${responseFieldPath}" ("${actualValue}") does not contain "${expectedValue}"`;
      break;

    default:
      accepted = true;
      reason = `Unknown operator "${operator}" — defaulting to accepted`;
  }

  return { accepted, reason, flatTokens };
}

function evaluateAcceptanceFromJson(responseBody, rule) {
  if (!rule || !rule.enabled) {
    return { accepted: true, reason: 'No acceptance rule configured — treating HTTP 2xx as success', flatTokens: {} };
  }
  let parsed = responseBody;
  if (typeof responseBody === 'string') {
    try { parsed = JSON.parse(responseBody); } catch { return { accepted: false, reason: 'Response body is not valid JSON', flatTokens: {} }; }
  }
  return evaluateAcceptance(parsed, rule);
}

module.exports = { evaluateAcceptance, evaluateAcceptanceFromJson, extractResponseTokens };
