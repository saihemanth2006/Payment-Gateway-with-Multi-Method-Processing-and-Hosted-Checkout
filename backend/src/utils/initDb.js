const pool = require('../config/db');

const initDb = async () => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const schema = `
        CREATE TABLE IF NOT EXISTS merchants (
            id UUID PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            api_key VARCHAR(64) UNIQUE NOT NULL,
            api_secret VARCHAR(64) NOT NULL,
            webhook_url TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS orders (
            id VARCHAR(64) PRIMARY KEY,
            merchant_id UUID NOT NULL REFERENCES merchants(id),
            amount INTEGER NOT NULL CHECK (amount >= 100),
            currency VARCHAR(3) DEFAULT 'INR',
            receipt VARCHAR(255),
            notes JSONB,
            status VARCHAR(20) DEFAULT 'created',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS payments (
            id VARCHAR(64) PRIMARY KEY,
            order_id VARCHAR(64) NOT NULL REFERENCES orders(id),
            merchant_id UUID NOT NULL REFERENCES merchants(id),
            amount INTEGER NOT NULL,
            currency VARCHAR(3) DEFAULT 'INR',
            method VARCHAR(20) NOT NULL,
            status VARCHAR(20) DEFAULT 'processing',
            vpa VARCHAR(255),
            card_network VARCHAR(20),
            card_last4 VARCHAR(4),
            error_code VARCHAR(50),
            error_description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_orders_merchant_id ON orders(merchant_id);
        CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
        CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
        `;

        await client.query(schema);

        // Seed test merchant
        const testMerchant = {
            id: '550e8400-e29b-41d4-a716-446655440000',
            name: 'Test Merchant',
            email: process.env.TEST_MERCHANT_EMAIL || 'test@example.com',
            api_key: process.env.TEST_API_KEY || 'key_test_abc123',
            api_secret: process.env.TEST_API_SECRET || 'secret_test_xyz789'
        };

        const checkMerchant = await client.query('SELECT * FROM merchants WHERE email = $1', [testMerchant.email]);
        if (checkMerchant.rows.length === 0) {
            await client.query(
                `INSERT INTO merchants (id, name, email, api_key, api_secret) 
                 VALUES ($1, $2, $3, $4, $5)`,
                [testMerchant.id, testMerchant.name, testMerchant.email, testMerchant.api_key, testMerchant.api_secret]
            );
            console.log('Test merchant seeded.');
        } else {
            console.log('Test merchant already exists.');
        }

        await client.query('COMMIT');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Database initialization failed:', e);
        throw e;
    } finally {
        client.release();
    }
};

module.exports = initDb;
