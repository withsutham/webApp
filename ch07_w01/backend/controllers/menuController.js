const prisma = require('../db/prisma');

const getMenu = async (req, res) => {
    try {
        const menu = await prisma.menu.findMany();
        res.json(menu);
    } catch (err) {
        console.error('Error fetching menu:', err);
        res.status(500).json({ error: 'Database error' });
    }
};

module.exports = { getMenu };