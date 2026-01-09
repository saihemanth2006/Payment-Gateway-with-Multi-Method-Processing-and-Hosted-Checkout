const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const initDb = require('./utils/initDb');
const apiRoutes = require('./routes/api');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/', apiRoutes);

// Initialize DB first, then start server
(async () => {
    try {
        await initDb();
        console.log('Database initialized');
    } catch (e) {
        console.error('Failed to initialize DB', e);
        // Exit if DB init fails to avoid serving without schema
        process.exit(1);
    }
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
})();
