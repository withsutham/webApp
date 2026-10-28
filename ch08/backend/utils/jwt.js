const jwt = require('jsonwebtoken');

const getJwtKey = () => {
  const key = process.env.JWT_KEY;
  if (!key || Buffer.byteLength(key, 'utf8') < 32) {
    const error = new Error('JWT_KEY must contain at least 32 bytes');
    error.code = 'AUTH_CONFIGURATION';
    throw error;
  }
  return key;
};

const createUserToken = (userId) =>
  jwt.sign({ sub: String(userId) }, getJwtKey(), {
    algorithm: 'HS256',
    expiresIn: '1h',
  });

const verifyUserToken = (token) =>
  jwt.verify(token, getJwtKey(), { algorithms: ['HS256'] });

module.exports = { createUserToken, verifyUserToken };
