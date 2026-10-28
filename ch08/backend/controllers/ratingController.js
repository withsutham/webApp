const prisma = require('../db/prisma');
const { parsePositiveId, parseRatingScore } = require('../utils/validation');

const menuExists = async (menuId) =>
  Boolean(await prisma.menu.findUnique({ where: { menuId }, select: { menuId: true } }));

const getSummary = async (menuId, userId) => {
  const [aggregate, ownRating] = await Promise.all([
    prisma.rating.aggregate({
      where: { menuId },
      _avg: { score: true },
      _count: { _all: true },
    }),
    userId
      ? prisma.rating.findUnique({
          where: { userId_menuId: { userId, menuId } },
          select: { score: true },
        })
      : Promise.resolve(null),
  ]);

  const average = aggregate._avg.score;
  return {
    menuId,
    averageRating: average === null ? null : Number(average.toFixed(1)),
    ratingCount: aggregate._count._all,
    myRating: ownRating?.score ?? null,
  };
};

const getRatings = async (req, res) => {
  const menuId = parsePositiveId(req.params.id);
  if (!menuId) {
    return res.status(400).json({ error: 'id must be a positive integer' });
  }

  try {
    if (!(await menuExists(menuId))) {
      return res.status(404).json({ error: 'Menu not found' });
    }
    const userId = req.user?.role === 'user' ? req.user.userId : null;
    return res.json(await getSummary(menuId, userId));
  } catch (error) {
    console.error('Rating summary failed:', error.message);
    return res.status(500).json({ error: 'Database error' });
  }
};

const saveRating = async (req, res, update) => {
  const menuId = parsePositiveId(req.params.id);
  const score = parseRatingScore(req.body?.score);
  if (!menuId) {
    return res.status(400).json({ error: 'id must be a positive integer' });
  }
  if (score === null) {
    return res.status(400).json({ error: 'score must be an integer from 1 to 5' });
  }

  try {
    if (!(await menuExists(menuId))) {
      return res.status(404).json({ error: 'Menu not found' });
    }

    const rating = update
      ? await prisma.rating.update({
          where: { userId_menuId: { userId: req.user.userId, menuId } },
          data: { score },
        })
      : await prisma.rating.create({
          data: { userId: req.user.userId, menuId, score },
        });

    return res.status(update ? 200 : 201).json({
      message: 'Rating saved',
      rating,
      summary: await getSummary(menuId, req.user.userId),
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'You have already rated this menu' });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'You have not rated this menu yet' });
    }
    console.error('Rating save failed:', error.message);
    return res.status(500).json({ error: 'Rating save failed' });
  }
};

const createRating = (req, res) => saveRating(req, res, false);
const updateRating = (req, res) => saveRating(req, res, true);

module.exports = { getRatings, createRating, updateRating };
