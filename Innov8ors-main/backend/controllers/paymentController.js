const { createOrder } = require('../services/paymentService');

async function createPayment(req, res) {
  try {
    const { amount } = req.body;
    const order = await createOrder(amount);

    return res.json({
      ...order,
      key_id: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('CREATE_PAYMENT_ERROR:', error);

    return res.status(500).json({
      error: error.message || 'Payment failed'
    });
  }
}

module.exports = {
  createPayment
};
