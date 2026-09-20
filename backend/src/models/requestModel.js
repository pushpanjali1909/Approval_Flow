/**
 * Request Status Enum & Model Constants
 */
const REQUEST_STATUS = Object.freeze({
  EDITABLE: 'Editable',
  SUBMITTED: 'Submitted',
  APPROVED: 'Approved',
  REJECTED: 'Rejected'
});

const VALID_STATUSES = Object.values(REQUEST_STATUS);

module.exports = {
  REQUEST_STATUS,
  VALID_STATUSES
};
