function calculatePFI(data) {

const {
completedMilestones,
totalMilestones,
onTimeDeliveries,
totalDeliveries,
averageQualityScore
} = data;

/* success rate */

const successRate =
(completedMilestones / totalMilestones) * 100;

/* deadline adherence */

const deadlineScore =
(onTimeDeliveries / totalDeliveries) * 100;

/* quality score already percentage */

const qualityScore = averageQualityScore;

/* final PFI calculation */

const PFI =
(successRate * 0.5) +
(deadlineScore * 0.3) +
(qualityScore * 0.2);

return Math.round(PFI);
}

module.exports = { calculatePFI };