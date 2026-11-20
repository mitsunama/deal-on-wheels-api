const jwt = require('jsonwebtoken');
const HttpError = require('../utils/HttpError');

module.exports = function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return next(new HttpError(401, 'Missing bearer token'));
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub };
    next();
  } catch {
    next(new HttpError(401, 'Invalid or expired token'));
  }
};
