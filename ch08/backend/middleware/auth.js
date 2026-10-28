const prisma = require('../db/prisma');
const { verifyUserToken } = require('../utils/jwt');

const unauthorized = (res) => res.status(401).json({ error: 'Authentication required' });

const loadUser = async (req, res, next, optional) => {
  const authorization = req.get('authorization');
  if (!authorization) {
    return optional ? next() : unauthorized(res);
  }

  const match = /^Bearer\s+(\S+)$/i.exec(authorization);
  if (!match) {
    return unauthorized(res);
  }

  let payload;
  try {
    payload = verifyUserToken(match[1]);
  } catch (error) {
    if (error.code === 'AUTH_CONFIGURATION') {
      return res.status(500).json({ error: 'Authentication is not configured' });
    }
    return unauthorized(res);
  }

  const userId = Number(payload.sub);
  if (!Number.isInteger(userId) || userId <= 0) {
    return unauthorized(res);
  }

  try {
    const user = await prisma.user.findUnique({
      where: { userId },
      select: { userId: true, userName: true, email: true, role: true },
    });
    if (!user) {
      return unauthorized(res);
    }
    req.user = user;
    return next();
  } catch (error) {
    console.error('Authentication lookup failed:', error.message);
    return res.status(500).json({ error: 'Database error' });
  }
};

const authenticate = (req, res, next) => loadUser(req, res, next, false);
const optionalAuthenticate = (req, res, next) => loadUser(req, res, next, true);

const requireRole = (role) => (req, res, next) => {
  if (!req.user) {
    return unauthorized(res);
  }
  if (req.user.role !== role) {
    return res.status(403).json({ error: 'You do not have permission to do this' });
  }
  return next();
};

module.exports = { authenticate, optionalAuthenticate, requireRole };
