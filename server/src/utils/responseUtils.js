// HTTP状态码
exports.STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500
};

// 成功响应
exports.successResponse = (data, message = 'Success') => ({
  success: true,
  message,
  data
});

// 错误响应
exports.errorResponse = (message = 'Error', code = 500) => ({
  success: false,
  message,
  code
});