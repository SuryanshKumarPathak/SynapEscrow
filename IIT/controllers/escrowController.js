const { calculatePayment } = require("../services/escrowService");

async function releasePayment(req, res) {

try {

const {
milestoneAmount,
completion_percentage
} = req.body;

const result = calculatePayment(
milestoneAmount,
completion_percentage
);

res.json({
milestone_amount: milestoneAmount,
completion_percentage: completion_percentage,
freelancer_payment: result.freelancerPayment,
employer_refund: result.employerRefund
});

} catch (error) {

console.log(error);

res.status(500).json({
error: "Escrow payment calculation failed"
});

}

}

module.exports = { releasePayment };