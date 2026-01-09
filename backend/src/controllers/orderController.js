const pool = require('../config/db');

function generateOrderId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 16; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return 'order_' + result;
}

async function generateUniqueOrderId() {
    // Ensure ID uniqueness by checking collisions
    let id;
    let exists = true;
    while (exists) {
        id = generateOrderId();
        const res = await pool.query('SELECT 1 FROM orders WHERE id = $1', [id]);
        exists = res.rows.length > 0;
    }
    return id;
}

const createOrder = async (req, res) => {
    const { amount, currency = 'INR', receipt, notes } = req.body;

    // Amount must be integer >= 100
    if (!Number.isInteger(amount) || amount < 100) {
        return res.status(400).json({
            error: {
                code: 'BAD_REQUEST_ERROR',
                description: 'amount must be at least 100'
            }
        });
    }

    const orderId = await generateUniqueOrderId();
    const merchantId = req.merchant.id;

    try {
        const query = `
            INSERT INTO orders (id, merchant_id, amount, currency, receipt, notes, status)
            VALUES ($1, $2, $3, $4, $5, $6, 'created')
            RETURNING *
        `;
        const values = [orderId, merchantId, amount, currency, receipt, JSON.stringify(notes || {})];

        const result = await pool.query(query, values);
        const order = result.rows[0];

        res.status(201).json({
            id: order.id,
            merchant_id: order.merchant_id,
            amount: order.amount,
            currency: order.currency,
            receipt: order.receipt,
            notes: order.notes,
            status: order.status,
            created_at: order.created_at
        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Database error' });
    }
};

const getOrder = async (req, res) => {
    const { order_id } = req.params;

    try {
        const result = await pool.query('SELECT * FROM orders WHERE id = $1', [order_id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: {
                    code: 'NOT_FOUND_ERROR',
                    description: 'Order not found'
                }
            });
        }

        const order = result.rows[0];

        if (order.merchant_id !== req.merchant.id) {
            return res.status(404).json({
                error: {
                    code: 'NOT_FOUND_ERROR',
                    description: 'Order not found'
                }
            });
        }

        res.status(200).json(order);

    } catch (e) {
        res.status(500).json({ error: 'Database error' });
    }
};

const getOrderPublic = async (req, res) => {
    const { order_id } = req.params;

    try {
        const result = await pool.query('SELECT id, amount, currency, status, merchant_id, receipt, notes FROM orders WHERE id = $1', [order_id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: {
                    code: 'NOT_FOUND_ERROR',
                    description: 'Order not found'
                }
            });
        }

        const order = result.rows[0];
        res.status(200).json(order);

    } catch (e) {
        res.status(500).json({ error: 'Database error' });
    }
};

module.exports = { createOrder, getOrder, getOrderPublic };

