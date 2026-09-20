/**
 * ID Generator utility for Requests and Line Items
 */
let requestCounter = 0;
let lineItemCounter = 0;

function generateRequestId() {
  requestCounter += 1;
  return `REQ-${String(requestCounter).padStart(3, '0')}`;
}

function generateLineItemId() {
  lineItemCounter += 1;
  return `LI-${lineItemCounter}`;
}

function resetCounters() {
  requestCounter = 0;
  lineItemCounter = 0;
}

module.exports = {
  generateRequestId,
  generateLineItemId,
  resetCounters
};
