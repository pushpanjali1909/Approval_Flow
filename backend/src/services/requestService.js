/**
 * Request Service - Core Business Logic and Lifecycle State Machine
 */

const store = require('../data/store');
const { REQUEST_STATUS } = require('../models/requestModel');
const { generateRequestId, generateLineItemId } = require('../utils/idGenerator');
const { calculateLineTotal, calculateGrandTotal } = require('../utils/calculations');

class AppError extends Error {
  constructor(name, message, statusCode, details) {
    super(message);
    this.name = name;
    this.statusCode = statusCode;
    if (details) this.details = details;
  }
}

/**
 * Creates a new approval request.
 * Computes line totals and grand total securely on the server.
 */
function createRequest(data) {
  const { title, requester, lineItems } = data;

  const id = generateRequestId();
  const processedLineItems = lineItems.map(item => {
    const quantity = Number(item.quantity);
    const price = Number(item.price);
    const total = calculateLineTotal(quantity, price);
    return {
      id: item.id || generateLineItemId(),
      description: item.description.trim(),
      quantity,
      price,
      total
    };
  });

  const grandTotal = calculateGrandTotal(processedLineItems);
  const now = new Date().toISOString();

  const newRequest = {
    id,
    title: title.trim(),
    requester: requester.trim(),
    lineItems: processedLineItems,
    grandTotal,
    status: REQUEST_STATUS.EDITABLE,
    createdAt: now,
    updatedAt: now
  };

  return store.create(newRequest);
}

/**
 * Retrieves paginated requests with search and status filtering.
 */
function getRequests({ search, status, page = 1, limit = 10 } = {}) {
  let list = store.getAll();

  // Search filter (against request title, case-insensitive)
  if (search && typeof search === 'string' && search.trim().length > 0) {
    const query = search.trim().toLowerCase();
    list = list.filter(req => req.title.toLowerCase().includes(query));
  }

  // Status filter
  if (status && typeof status === 'string' && status.trim().length > 0 && status.toLowerCase() !== 'all') {
    const statusQuery = status.trim().toLowerCase();
    list = list.filter(req => req.status.toLowerCase() === statusQuery);
  }

  // Sort by createdAt descending by default
  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Safe pagination
  let parsedPage = parseInt(page, 10);
  if (isNaN(parsedPage) || parsedPage < 1) {
    parsedPage = 1;
  }

  let parsedLimit = parseInt(limit, 10);
  if (isNaN(parsedLimit) || parsedLimit < 1) {
    parsedLimit = 10;
  }
  if (parsedLimit > 100) {
    parsedLimit = 100;
  }

  const totalItems = list.length;
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / parsedLimit);

  let paginatedData = [];
  if (totalItems > 0 && parsedPage <= totalPages) {
    const startIndex = (parsedPage - 1) * parsedLimit;
    paginatedData = list.slice(startIndex, startIndex + parsedLimit);
  }

  return {
    data: paginatedData,
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      totalItems,
      totalPages
    }
  };
}

/**
 * Retrieves a single request by ID.
 */
function getRequestById(id) {
  const request = store.getById(id);
  if (!request) {
    throw new AppError('Request not found', `Request with ID '${id}' was not found.`, 404);
  }
  return request;
}

/**
 * Updates an existing request.
 * Only allowed when status === Editable.
 * Recalculates all totals and sanitizes unauthorized modifications.
 */
function updateRequest(id, data) {
  const existing = getRequestById(id);

  if (existing.status !== REQUEST_STATUS.EDITABLE) {
    throw new AppError(
      'Request cannot be edited',
      'Only Editable requests can be modified.',
      409
    );
  }

  const { title, requester, lineItems } = data;

  const processedLineItems = lineItems.map(item => {
    const quantity = Number(item.quantity);
    const price = Number(item.price);
    const total = calculateLineTotal(quantity, price);
    return {
      id: item.id || generateLineItemId(),
      description: item.description.trim(),
      quantity,
      price,
      total
    };
  });

  const grandTotal = calculateGrandTotal(processedLineItems);
  const now = new Date().toISOString();

  const updated = {
    ...existing,
    title: title.trim(),
    requester: requester.trim(),
    lineItems: processedLineItems,
    grandTotal,
    updatedAt: now
    // status and createdAt remain untouched from existing
  };

  return store.update(id, updated);
}

/**
 * Submits an editable request for review.
 * Allowed: Editable -> Submitted
 */
function submitRequest(id) {
  const existing = getRequestById(id);

  if (existing.status !== REQUEST_STATUS.EDITABLE) {
    throw new AppError(
      'Invalid state transition',
      'Only Editable requests can be submitted.',
      409
    );
  }

  // Verify request still has valid data
  if (!existing.title || !existing.requester || !Array.isArray(existing.lineItems) || existing.lineItems.length === 0) {
    throw new AppError(
      'Validation failed',
      'Request must have a title, requester, and at least one line item before submitting.',
      400
    );
  }

  const now = new Date().toISOString();
  const updated = {
    ...existing,
    status: REQUEST_STATUS.SUBMITTED,
    updatedAt: now
  };

  return store.update(id, updated);
}

/**
 * Approves a submitted request.
 * Allowed: Submitted -> Approved
 */
function approveRequest(id) {
  const existing = getRequestById(id);

  if (existing.status !== REQUEST_STATUS.SUBMITTED) {
    let message = 'Only Submitted requests can be approved.';
    if (existing.status === REQUEST_STATUS.APPROVED) {
      message = 'Request is already approved.';
    } else if (existing.status === REQUEST_STATUS.REJECTED) {
      message = 'Rejected requests cannot be approved.';
    } else if (existing.status === REQUEST_STATUS.EDITABLE) {
      message = 'Editable requests must be submitted before approval.';
    }
    throw new AppError('Invalid state transition', message, 409);
  }

  const now = new Date().toISOString();
  const updated = {
    ...existing,
    status: REQUEST_STATUS.APPROVED,
    updatedAt: now
  };

  return store.update(id, updated);
}

/**
 * Rejects a submitted request.
 * Allowed: Submitted -> Rejected
 */
function rejectRequest(id) {
  const existing = getRequestById(id);

  if (existing.status !== REQUEST_STATUS.SUBMITTED) {
    let message = 'Only Submitted requests can be rejected.';
    if (existing.status === REQUEST_STATUS.REJECTED) {
      message = 'Request is already rejected.';
    } else if (existing.status === REQUEST_STATUS.APPROVED) {
      message = 'Approved requests cannot be rejected.';
    } else if (existing.status === REQUEST_STATUS.EDITABLE) {
      message = 'Editable requests must be submitted before rejection.';
    }
    throw new AppError('Invalid state transition', message, 409);
  }

  const now = new Date().toISOString();
  const updated = {
    ...existing,
    status: REQUEST_STATUS.REJECTED,
    updatedAt: now
  };

  return store.update(id, updated);
}

module.exports = {
  createRequest,
  getRequests,
  getRequestById,
  updateRequest,
  submitRequest,
  approveRequest,
  rejectRequest,
  AppError
};
