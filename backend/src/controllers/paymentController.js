const pool = require('../config/db');
const { validateVPA, validateLuhn, getCardNetwork, validateExpiry } = require('../validators/validation');

function generatePaymentId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 16; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return 'pay_' + result;
}

async function generateUniquePaymentId() {
    let id;
    let exists = true;
    while (exists) {
        id = generatePaymentId();
        const res = await pool.query('SELECT 1 FROM payments WHERE id = $1', [id]);
        exists = res.rows.length > 0;
    }
    return id;
}

// Logic extracted to reuse
const processPaymentCreation = async (res, orderId, merchantId, amount, currency, method, vpa, card) => {
    // 2. Validate inputs
    let cardNetwork = null;
    let cardLast4 = null;

    if (method === 'upi') {
        if (!validateVPA(vpa)) {
            return res.status(400).json({
                error: {
                    code: 'INVALID_VPA',
                    description: 'VPA format invalid'
                }
            });
        }
    } else if (method === 'card') {
        if (!card || !validateLuhn(card.number)) {
            return res.status(400).json({
                error: {
                    code: 'INVALID_CARD',
                    description: 'Card validation failed'
                }
            });
        }
        if (!validateExpiry(card.expiry_month, card.expiry_year)) {
            return res.status(400).json({
                error: {
                    code: 'EXPIRED_CARD',
                    description: 'Card expiry date invalid'
                }
            });
        }
        cardNetwork = getCardNetwork(card.number);
        cardLast4 = card.number.slice(-4);
    } else {
        return res.status(400).json({
            error: {
                code: 'BAD_REQUEST_ERROR',
                description: 'Invalid payment method'
            }
        });
    }

    // 3. Create payment (processing)
    const paymentId = await generateUniquePaymentId();
    await pool.query(
        `INSERT INTO payments (id, order_id, merchant_id, amount, currency, method, status, vpa, card_network, card_last4)
             VALUES ($1, $2, $3, $4, $5, $6, 'processing', $7, $8, $9)`,
        [paymentId, orderId, merchantId, amount, currency, method, vpa || null, cardNetwork, cardLast4]
    );

    // 4. Simulate processing delay
    const isTestMode = process.env.TEST_MODE === 'true';
    let delay = isTestMode
        ? parseInt(process.env.TEST_PROCESSING_DELAY || '1000')
        : Math.floor(Math.random() * (10000 - 5000 + 1) + 5000);

    await new Promise(resolve => setTimeout(resolve, delay));

    // 5. Determine success
    let success;
    if (isTestMode) {
        success = process.env.TEST_PAYMENT_SUCCESS !== 'false';
    } else {
        // Random
        const rate = method === 'upi'
            ? (parseFloat(process.env.UPI_SUCCESS_RATE) || 0.90)
            : (parseFloat(process.env.CARD_SUCCESS_RATE) || 0.95);
        success = Math.random() < rate;
    }

    // 6. Update status
    const finalStatus = success ? 'success' : 'failed';
    let errorCode = null;
    let errorDesc = null;

    if (!success) {
        errorCode = 'PAYMENT_FAILED';
        errorDesc = 'Payment processing failed';
    }

    const updateRes = await pool.query(
        `UPDATE payments 
             SET status = $1, error_code = $2, error_description = $3, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $4 
             RETURNING *`,
        [finalStatus, errorCode, errorDesc, paymentId]
    );
    const payment = updateRes.rows[0];

    // 7. Return response
    const response = {
        id: payment.id,
        order_id: payment.order_id,
        amount: payment.amount,
        currency: payment.currency,
        method: payment.method,
        status: payment.status,
        created_at: payment.created_at
    };
    if (method === 'upi') response.vpa = payment.vpa;
    if (method === 'card') {
        response.card_network = payment.card_network;
        response.card_last4 = payment.card_last4;
    }

    res.status(201).json(response);
}

const createPayment = async (req, res) => {
    const { order_id, method, vpa, card } = req.body;
    const merchantId = req.merchant.id;

    try {
        const orderRes = await pool.query('SELECT * FROM orders WHERE id = $1', [order_id]);
        if (orderRes.rows.length === 0 || orderRes.rows[0].merchant_id !== merchantId) {
            return res.status(404).json({
                error: {
                    code: 'NOT_FOUND_ERROR',
                    description: 'Order not found'
                }
            });
        }
        const order = orderRes.rows[0];
        await processPaymentCreation(res, order.id, merchantId, order.amount, order.currency, method, vpa, card);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Internal error' });
    }
};

const createPaymentPublic = async (req, res) => {
    const { order_id, method, vpa, card } = req.body;

    try {
        const orderRes = await pool.query('SELECT * FROM orders WHERE id = $1', [order_id]);
        if (orderRes.rows.length === 0) {
            return res.status(404).json({
                error: {
                    code: 'NOT_FOUND_ERROR',
                    description: 'Order not found'
                }
            });
        }
        const order = orderRes.rows[0];

        await processPaymentCreation(res, order.id, order.merchant_id, order.amount, order.currency, method, vpa, card);

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Internal error' });
    }
};

const getPayment = async (req, res) => {
    const { payment_id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM payments WHERE id = $1', [payment_id]);
        if (result.rows.length === 0 || result.rows[0].merchant_id !== req.merchant.id) {
            return res.status(404).json({ error: { code: 'NOT_FOUND_ERROR', description: 'Payment not found' } });
        }
        res.json(_formatPayment(result.rows[0]));
    } catch (e) {
        res.status(500).json({ error: 'Db error' });
    }
};

const getPaymentPublic = async (req, res) => {
    const { payment_id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM payments WHERE id = $1', [payment_id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: { code: 'NOT_FOUND_ERROR', description: 'Payment not found' } });
        }
        res.json(_formatPayment(result.rows[0]));
    } catch (e) {
        res.status(500).json({ error: 'Db error' });
    }
};

function _formatPayment(p) {
    const r = {
        id: p.id,
        order_id: p.order_id,
        amount: p.amount,
        currency: p.currency,
        method: p.method,
        status: p.status,
        created_at: p.created_at,
        updated_at: p.updated_at
    };
    if (p.method === 'upi') r.vpa = p.vpa;
    if (p.method === 'card') {
        r.card_network = p.card_network;
        r.card_last4 = p.card_last4;
    }
    return r;
}

const listPayments = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM payments WHERE merchant_id = $1 ORDER BY created_at DESC', [req.merchant.id]);
        res.json(result.rows.map(_formatPayment));
    } catch (e) {
        res.status(500).json({ error: 'db error' });
    }
};

module.exports = { createPayment, getPayment, createPaymentPublic, getPaymentPublic, listPayments };

