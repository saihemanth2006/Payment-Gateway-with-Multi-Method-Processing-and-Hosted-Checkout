const express = require('express');
const router = express.Router();
const healthController = require('../controllers/healthController');
const orderController = require('../controllers/orderController');
const paymentController = require('../controllers/paymentController');
const testController = require('../controllers/testController');
const authenticate = require('../middleware/auth');

// Health
router.get('/health', healthController.getHealth);

// Test
router.get('/api/v1/test/merchant', testController.getTestMerchant);

// Orders
router.post('/api/v1/orders', authenticate, orderController.createOrder);
router.get('/api/v1/orders/:order_id', authenticate, orderController.getOrder);
router.get('/api/v1/orders/:order_id/public', orderController.getOrderPublic);

// Payments
router.post('/api/v1/payments', authenticate, paymentController.createPayment);
router.post('/api/v1/payments/public', paymentController.createPaymentPublic);

router.get('/api/v1/payments/:payment_id', authenticate, paymentController.getPayment);
router.get('/api/v1/payments', authenticate, paymentController.listPayments);
router.get('/api/v1/payments/:payment_id/public', paymentController.getPaymentPublic);

module.exports = router;
