const prisma = require('../db/prisma');

const NAME_MAX_LENGTH = 100;
const PRICE_MAX = 99999999.99;

// menu.menuId is an autoincrement Int, so only positive integers are valid.
const parseMenuId = (value) => {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
};

// PUT replaces the whole menu row, so every writable field is validated here.
const parseMenuBody = (body) => {
    if (!body || typeof body !== 'object') {
        return { error: 'Request body must be a JSON object' };
    }

    const { name, price, isBestSeller, typeId } = body;

    if (typeof name !== 'string' || name.trim() === '') {
        return { error: 'name is required' };
    }
    if (name.trim().length > NAME_MAX_LENGTH) {
        return { error: `name must be at most ${NAME_MAX_LENGTH} characters` };
    }

    if (typeof price !== 'number' && typeof price !== 'string') {
        return { error: 'price is required and must be a number' };
    }
    const parsedPrice = Number(price);
    if (price === '' || !Number.isFinite(parsedPrice)) {
        return { error: 'price is required and must be a number' };
    }
    if (parsedPrice < 0 || parsedPrice > PRICE_MAX) {
        return { error: `price must be between 0 and ${PRICE_MAX}` };
    }

    if (isBestSeller !== undefined && typeof isBestSeller !== 'boolean') {
        return { error: 'isBestSeller must be a boolean' };
    }

    let parsedTypeId = null;
    if (typeId !== undefined && typeId !== null && typeId !== '') {
        parsedTypeId = Number(typeId);
        if (!Number.isInteger(parsedTypeId) || parsedTypeId <= 0) {
            return { error: 'typeId must be a positive integer or null' };
        }
    }

    return {
        data: {
            name: name.trim(),
            price: parsedPrice,
            isBestSeller: isBestSeller === true,
            typeId: parsedTypeId,
        },
    };
};

// P2025: record not found, P2003: foreign key (typeId) points nowhere.
const sendPrismaError = (res, err, message) => {
    if (err.code === 'P2025') {
        return res.status(404).json({ error: 'Menu not found' });
    }
    if (err.code === 'P2003') {
        return res.status(400).json({ error: 'Menu type not found' });
    }
    console.error(message, err);
    return res.status(500).json({ error: 'Database error' });
};

const getMenu = async (req, res) => {
    try {
        const [menus, groupedRatings, ownRatings] = await Promise.all([
            prisma.menu.findMany({ include: { type: true } }),
            prisma.rating.groupBy({
                by: ['menuId'],
                _avg: { score: true },
                _count: { _all: true },
            }),
            req.user?.role === 'user'
                ? prisma.rating.findMany({
                    where: { userId: req.user.userId },
                    select: { menuId: true, score: true },
                })
                : Promise.resolve([]),
        ]);

        const summaries = new Map(groupedRatings.map((rating) => [rating.menuId, rating]));
        const userRatings = new Map(ownRatings.map((rating) => [rating.menuId, rating.score]));
        res.json(menus.map((menu) => {
            const summary = summaries.get(menu.menuId);
            const average = summary?._avg.score ?? null;
            return {
                ...menu,
                averageRating: average === null ? null : Number(average.toFixed(1)),
                ratingCount: summary?._count._all ?? 0,
                myRating: userRatings.get(menu.menuId) ?? null,
            };
        }));
    } catch (err) {
        console.error('Error fetching menu:', err);
        res.status(500).json({ error: 'Database error' });
    }
};

const createMenu = async (req, res) => {
    const { data, error } = parseMenuBody(req.body);
    if (error) {
        return res.status(400).json({ error });
    }

    try {
        const menu = await prisma.menu.create({
            data: data,
            include: { type: true },
        });
        res.status(201).json(menu);
    } catch (err) {
        sendPrismaError(res, err, 'Error creating menu:');
    }
};

const updateMenu = async (req, res) => {
    const menuId = parseMenuId(req.params.id);
    if (menuId === null) {
        return res.status(400).json({ error: 'id must be a positive integer' });
    }

    const { data, error } = parseMenuBody(req.body);
    if (error) {
        return res.status(400).json({ error });
    }

    try {
        const menu = await prisma.menu.update({
            where: { menuId: menuId },
            data: data,
            include: { type: true },
        });
        res.json(menu);
    } catch (err) {
        sendPrismaError(res, err, 'Error updating menu:');
    }
};

const deleteMenu = async (req, res) => {
    const menuId = parseMenuId(req.params.id);
    if (menuId === null) {
        return res.status(400).json({ error: 'id must be a positive integer' });
    }

    try {
        await prisma.menu.delete({
            where: { menuId: menuId },
        });
        res.json({ message: 'Menu deleted successfully', menuId: menuId });
    } catch (err) {
        sendPrismaError(res, err, 'Error deleting menu:');
    }
};

module.exports = {
    getMenu,
    createMenu,
    updateMenu,
    deleteMenu,
};
