/**
 * In-memory data store for Approval Requests.
 * No database is used as per design requirements.
 */

let requests = [];

function getAll() {
  return [...requests];
}

function getById(id) {
  return requests.find(req => req.id === id) || null;
}

function create(request) {
  requests.push(request);
  return request;
}

function update(id, updatedRequest) {
  const index = requests.findIndex(req => req.id === id);
  if (index === -1) {
    return null;
  }
  requests[index] = updatedRequest;
  return requests[index];
}

function clear() {
  requests = [];
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  clear
};
