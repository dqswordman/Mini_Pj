const jwt = require('jsonwebtoken');
const { CustomError } = require('../utils/errorUtils');

exports.authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new CustomError('Authentication token is missing', 401);
    }

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new CustomError('Token has expired', 401);
      }
      throw new CustomError('Invalid token', 401);
    }
  } catch (error) {
    next(error);
  }
};

exports.authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return next(new CustomError('User not authenticated', 401));
  }

  if (!allowedRoles.includes(req.user.position)) {
    return next(new CustomError('Access denied', 403));
  }

  next();
};
