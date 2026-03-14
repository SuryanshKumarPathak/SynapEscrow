const express = require("express");

const { analyzeRequirement } =
require("../controllers/aiController");

const { verifyMilestone } =
require("../controllers/qualityController");

const { getPFI } =
require("../controllers/pfiController");

const { releasePayment } =
require("../controllers/escrowController");

const router = express.Router();

router.post("/generate-milestones", analyzeRequirement);

router.post("/verify-milestone", verifyMilestone);

router.post("/calculate-pfi", getPFI);

router.post("/release-payment", releasePayment);

const { createPayment } =
require("../controllers/paymentController");

router.post("/create-payment", createPayment);

module.exports = router;