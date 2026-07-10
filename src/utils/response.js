function success(res, data = null, statusCode = 200) {
  return res.status(statusCode).json({ success: true, ...(data !== null ? (typeof data === 'object' && !Array.isArray(data) && data.pagination ? data : { data }) : { data: null }) });
}

function created(res, data) {
  return success(res, data, 201);
}

function paginated(res, { data, total, page, pages }) {
  return res.status(200).json({ success: true, data, pagination: { total, page, pages } });
}

function error(res, message, statusCode = 500) {
  return res.status(statusCode).json({ success: false, error: message });
}

function notFound(res, message = 'Not found') {
  return error(res, message, 404);
}

function badRequest(res, message = 'Bad request') {
  return error(res, message, 400);
}

function unauthorized(res, message = 'Unauthorized') {
  return error(res, message, 401);
}

function forbidden(res, message = 'Forbidden') {
  return error(res, message, 403);
}

module.exports = { success, created, paginated, error, notFound, badRequest, unauthorized, forbidden };
