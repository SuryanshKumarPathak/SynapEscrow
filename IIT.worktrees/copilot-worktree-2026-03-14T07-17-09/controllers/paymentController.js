const { createOrder } = require("../services/paymentService");

async function createPayment(req,res){

try{

const { amount } = req.body;

const order = await createOrder(amount);

res.json({ ...order, key_id: process.env.RAZORPAY_KEY_ID });

}catch(err){

console.log(err);

res.status(500).json({
error:"Payment failed"
});

}

}

module.exports = { createPayment };