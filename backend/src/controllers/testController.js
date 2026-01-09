const pool = require('../config/db');

const getTestMerchant = async (req, res) => {
    try {
        const email = process.env.TEST_MERCHANT_EMAIL || 'test@example.com';
        const result = await pool.query('SELECT * FROM merchants WHERE email = $1', [email]);

        if (result.rows.length > 0) {
            const m = result.rows[0];
            res.status(200).json({
                id: m.id,
                email: m.email,
                api_key: m.api_key,
                api_secret: m.api_secret,
                seeded: true
            });
        } else {
            res.status(404).json({ error: 'Test merchant not found' });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

module.exports = { getTestMerchant };
