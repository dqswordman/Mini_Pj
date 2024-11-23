const jwt = require('jsonwebtoken');
const { errorResponse } = require('./responseUtils');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const TOKEN_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

exports.generateToken = (payload) => {
  try {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN });
  } catch (error) {
    throw new Error('Error generating token');
  }
};

exports.verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
};