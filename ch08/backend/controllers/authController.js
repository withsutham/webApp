const bcrypt = require('bcrypt');
const prisma = require('../db/prisma');
const { createUserToken } = require('../utils/jwt');
const { publicUser } = require('../utils/publicUser');
const { parseRegistration } = require('../utils/validation');

const register = async (req, res) => {
  const { data, error } = parseRegistration(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  try {
    const existing = await prisma.user.findFirst({
      where: { OR: [{ userName: data.userName }, { email: data.email }] },
      select: { userId: true },
    });
    if (existing) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }

    const password = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.create({
      data: { userName: data.userName, email: data.email, password, role: 'user' },
      select: { userId: true, userName: true, email: true, role: true },
    });
    return res.status(201).json({
      message: 'Registration successful',
      user: publicUser(user),
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Username or email already exists' });
    }
    console.error('Registration failed:', error.message);
    return res.status(500).json({ error: 'Registration failed' });
  }
};

const login = async (req, res) => {
  const userName = typeof req.body?.userName === 'string' ? req.body.userName.trim() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!userName || !password || Buffer.byteLength(password, 'utf8') > 72) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { userName } });
    const validPassword = user && await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = createUserToken(user.userId);
    return res.json({
      message: 'Login successful',
      token,
      user: publicUser(user),
    });
  } catch (error) {
    if (error.code === 'AUTH_CONFIGURATION') {
      return res.status(500).json({ error: 'Authentication is not configured' });
    }
    console.error('Login failed:', error.message);
    return res.status(500).json({ error: 'Login failed' });
  }
};

const me = (req, res) => res.json({ user: publicUser(req.user) });

module.exports = { register, login, me };
