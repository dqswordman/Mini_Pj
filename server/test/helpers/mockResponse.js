// test/helpers/mockResponse.js
const STATUS_CODES = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_ERROR: 500
  };
  
  const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    return res;
  };
  
  const mockRequest = (body = {}, params = {}, query = {}, user = null) => ({
    body,
    params,
    query,
    user,
    headers: {}
  });
  
  const mockNext = () => jest.fn();
  
  module.exports = {
    mockResponse,
    mockRequest,
    mockNext,
    STATUS_CODES
  };