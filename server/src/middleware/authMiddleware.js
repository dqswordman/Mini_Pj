const jwt = require('jsonwebtoken');
const { errorResponse } = require('../utils/responseUtils');

exports.authenticate = async (req, res, next) => {
  try {
    // 从headers获取token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json(errorResponse('No auth token'));
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json(errorResponse('No token provided'));
    }

    // 验证token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json(errorResponse('Invalid token'));
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json(errorResponse('Auth middleware error'));
  }
};

exports.authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json(errorResponse('User not authenticated'));
    }

    if (allowedRoles.length && !allowedRoles.includes(req.user.position)) {
      return res.status(403).json(errorResponse('Access forbidden'));
    }

    next();
  };
};