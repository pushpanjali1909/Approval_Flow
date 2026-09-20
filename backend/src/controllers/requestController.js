/**
 * Request Controller - Handles HTTP requests and delegates to RequestService
 */

const requestService = require('../services/requestService');

async function create(req, res, next) {
  try {
    const created = requestService.createRequest(req.body);
    return res.status(201).json(created);
  } catch (error) {
    next(error);
  }
}

async function list(req, res, next) {
  try {
    const { search, status, page, limit } = req.query;
    const result = requestService.getRequests({ search, status, page, limit });
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

async function getById(req, res, next) {
  try {
    const request = requestService.getRequestById(req.params.id);
    return res.status(200).json(request);
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const updated = requestService.updateRequest(req.params.id, req.body);
    return res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
}

async function submit(req, res, next) {
  try {
    const submitted = requestService.submitRequest(req.params.id);
    return res.status(200).json(submitted);
  } catch (error) {
    next(error);
  }
}

async function approve(req, res, next) {
  try {
    const approved = requestService.approveRequest(req.params.id);
    return res.status(200).json(approved);
  } catch (error) {
    next(error);
  }
}

async function reject(req, res, next) {
  try {
    const rejected = requestService.rejectRequest(req.params.id);
    return res.status(200).json(rejected);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  create,
  list,
  getById,
  update,
  submit,
  approve,
  reject
};
