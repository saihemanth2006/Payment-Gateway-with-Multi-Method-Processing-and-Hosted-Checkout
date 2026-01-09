const pool = require('../config/db');

const getHealth = async (req, res) => {
    let dbStatus = 'disconnected';
    try {
        await pool.query('SELECT 1');
        dbStatus = 'connected';
    } catch (e) {
        // failed
    }

    res.status(200).json({
        status: 'healthy',
        database: dbStatus,
        timestamp: new Date().toISOString()
    });
};

module.exports = { getHealth };
