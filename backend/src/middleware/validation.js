/**
 * Request payload validation middleware.
 * Enforces title, requester, and line items validity with descriptive errors.
 */

function validateRequestPayload(req, res, next) {
  const { title, requester, lineItems } = req.body || {};
  const details = [];

  // Title validation
  if (title === undefined || title === null || typeof title !== 'string' || title.trim().length === 0) {
    details.push('Title is required and cannot be empty.');
  }

  // Requester validation
  if (requester === undefined || requester === null || typeof requester !== 'string' || requester.trim().length === 0) {
    details.push('Requester is required and cannot be empty.');
  }

  // Line items array validation
  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    details.push('At least one line item is required.');
  } else {
    // Validate each line item
    lineItems.forEach((item, index) => {
      const itemNum = index + 1;
      if (!item || typeof item !== 'object') {
        details.push(`Line item ${itemNum} is invalid.`);
        return;
      }

      // Description validation
      if (
        item.description === undefined ||
        item.description === null ||
        typeof item.description !== 'string' ||
        item.description.trim().length === 0
      ) {
        details.push(`Line item ${itemNum}: Description is required.`);
      }

      // Quantity validation: must be a positive number (> 0)
      if (
        item.quantity === undefined ||
        item.quantity === null ||
        typeof item.quantity !== 'number' ||
        isNaN(item.quantity) ||
        !isFinite(item.quantity) ||
        item.quantity <= 0
      ) {
        details.push(`Line item ${itemNum}: Quantity must be a positive number greater than 0.`);
      }

      // Price validation: must be a positive number (> 0)
      if (
        item.price === undefined ||
        item.price === null ||
        typeof item.price !== 'number' ||
        isNaN(item.price) ||
        !isFinite(item.price) ||
        item.price <= 0
      ) {
        details.push(`Line item ${itemNum}: Price must be a positive number greater than 0.`);
      }
    });
  }

  if (details.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details
    });
  }

  next();
}

module.exports = {
  validateRequestPayload
};
