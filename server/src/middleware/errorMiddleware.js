const { errorResponse, STATUS_CODES } = require('../utils/responseUtils');

exports.errorHandler = (err, req, res, next) => {
  console.error(err);

  if (err.name === 'ValidationError') {
    return res.status(STATUS_CODES.BAD_REQUEST)
      .json(errorResponse(err.message));
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(STATUS_CODES.UNAUTHORIZED)
      .json(errorResponse('Unauthorized access'));
  }

  return res.status(STATUS_CODES.INTERNAL_ERROR)
    .json(errorResponse('Internal server error'));
};