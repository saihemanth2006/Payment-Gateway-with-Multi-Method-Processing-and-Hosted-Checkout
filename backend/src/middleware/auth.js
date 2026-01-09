const pool = require('../config/db');

const authenticate = async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    const apiSecret = req.headers['x-api-secret'];

    if (!apiKey || !apiSecret) {
        return res.status(401).json({
            error: {
                code: 'AUTHENTICATION_ERROR',
                description: 'Invalid API credentials'
            }
        });
    }

    try {
        const result = await pool.query(
            'SELECT * FROM merchants WHERE api_key = $1 AND api_secret = $2',
            [apiKey, apiSecret]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                error: {
                    code: 'AUTHENTICATION_ERROR',
                    description: 'Invalid API credentials'
                }
            });
        }

        req.merchant = result.rows[0];
        next();
    } catch (e) {
        console.error(e);
        // Don't leak internals
        res.status(401).json({
            error: {
                code: 'AUTHENTICATION_ERROR',
                description: 'Invalid API credentials'
            }
        });
    }
};

module.exports = authenticate;
