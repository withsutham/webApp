const prisma = require('../db/prisma');
const { publicUser } = require('../utils/publicUser');
const { parsePositiveId, parseRole } = require('../utils/validation');

const userSelect = { userId: true, userName: true, email: true, role: true };

const listUsers = async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { userId: 'asc' },
      select: userSelect,
    });
    return res.json(users.map(publicUser));
  } catch (error) {
    console.error('User list failed:', error.message);
    return res.status(500).json({ error: 'Database error' });
  }
};

const updateRole = async (req, res) => {
  const userId = parsePositiveId(req.params.id);
  const role = parseRole(req.body?.role);
  if (!userId) {
    return res.status(400).json({ error: 'id must be a positive integer' });
  }
  if (!role) {
    return res.status(400).json({ error: 'role must be user or admin' });
  }

  try {
    const outcome = await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({ where: { userId }, select: userSelect });
      if (!target) {
        return { kind: 'missing' };
      }
      if (target.userId === req.user.userId && target.role === 'admin' && role !== 'admin') {
        return { kind: 'self-demotion' };
      }
      if (target.role === 'admin' && role === 'user') {
        const administratorCount = await tx.user.count({ where: { role: 'admin' } });
        if (administratorCount <= 1) {
          return { kind: 'last-administrator' };
        }
      }
      if (target.role === role) {
        return { kind: 'updated', user: target };
      }

      const user = await tx.user.update({
        where: { userId },
        data: { role },
        select: userSelect,
      });
      return { kind: 'updated', user };
    }, { isolationLevel: 'Serializable' });

    if (outcome.kind === 'missing') {
      return res.status(404).json({ error: 'User not found' });
    }
    if (outcome.kind === 'self-demotion') {
      return res.status(403).json({ error: 'You cannot remove your own administrator role' });
    }
    if (outcome.kind === 'last-administrator') {
      return res.status(409).json({ error: 'At least one administrator must remain' });
    }
    return res.json({ user: publicUser(outcome.user) });
  } catch (error) {
    if (error.code === 'P2034') {
      return res.status(409).json({ error: 'Role update conflicted; try again' });
    }
    console.error('Role update failed:', error.message);
    return res.status(500).json({ error: 'Role update failed' });
  }
};

module.exports = { listUsers, updateRole };
