const express = require('express');
const cors = require('cors');
require('dotenv').config();

const menuRoutes = require('./routes/menuRoutes');
const typeRoutes = require('./routes/typeRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/menu', menuRoutes);
app.use('/api/type', typeRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server start at port ${PORT}`);
});