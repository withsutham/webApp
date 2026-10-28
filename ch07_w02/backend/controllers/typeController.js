const prisma = require('../db/prisma');

const getType = async (req, res) => {
    try {
        const type = await prisma.type.findMany();
        res.json(type);
    } catch (err) {
        console.error('Error fetching type:', err);
        res.status(500).json({ error: 'Database error' });
    }
};

module.exports = { getType };