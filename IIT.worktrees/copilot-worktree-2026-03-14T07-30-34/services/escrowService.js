function calculatePayment(milestoneAmount, completionPercentage) {

let freelancerPayment = 0;
let employerRefund = 0;

if (completionPercentage === 100) {

freelancerPayment = milestoneAmount;
employerRefund = 0;

}

else if (completionPercentage > 0) {

freelancerPayment =
(milestoneAmount * completionPercentage) / 100;

employerRefund =
milestoneAmount - freelancerPayment;

}

else {

freelancerPayment = 0;
employerRefund = milestoneAmount;

}

return {
freelancerPayment: Math.round(freelancerPayment),
employerRefund: Math.round(employerRefund)
};

}

module.exports = { calculatePayment };