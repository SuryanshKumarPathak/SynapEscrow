const express = require("express");

const { analyzeRequirement } = require("../controllers/aiController");
const { verifyMilestone } = require("../controllers/qualityController");
const { createPayment } = require('../controllers/paymentController');

const router = express.Router();

/* requirement analyzer */
router.post("/generate-milestones", analyzeRequirement);

/* github repo code analyzer */
router.post("/verify-milestone", verifyMilestone);
router.post('/create-payment', createPayment);

module.exports = router;