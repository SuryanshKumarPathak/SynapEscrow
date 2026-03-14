const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    name: {
      type: String,
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    employer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    employer_name: {
      type: String,
      default: null
    },
    freelancer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    budget: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      default: 'Active'
    },
    deadline: {
      type: Date,
      default: null
    },
    posted_at_timestamp: {
      type: Number,
      default: () => Date.now()
    },
    milestones_text: {
      type: String,
      default: ''
    },
    milestone_items: [
      {
        title: { type: String, required: true },
        description: { type: String, default: '' },
        expectedDeliverable: { type: String, default: '' },
        estimatedTimeRange: { type: String, default: '' },
        workloadComplexity: { type: String, default: '' },
        payoutPercentage: { type: Number, default: null },
        payableAmount: { type: Number, default: 0 },
        requirement: { type: String, default: '' }
      }
    ],
    completed_milestones: [
      {
        milestoneTitle: { type: String, required: true },
        freelancerId: { type: String, required: true },
        completedAtTimestamp: { type: Number, required: true }
      }
    ],
    payment_history: [
      {
        milestoneTitle: { type: String, required: true },
        freelancerId: { type: String, required: true },
        freelancerName: { type: String, default: 'Freelancer' },
        completionPercentage: { type: Number, default: 100 },
        releasedAmount: { type: Number, default: 0 },
        paidAtTimestamp: { type: Number, required: true },
        transactionId: { type: String, default: null }, // Razorpay payout ID or unique transaction ID
        paymentStatus: { type: String, enum: ['initiated', 'processing', 'completed', 'failed', 'pending'], default: 'initiated' }, // Payment status
        freelancerUPI: { type: String, default: null }, // Masked or full UPI for reference
        paymentMethod: { type: String, default: 'UPI' }, // Payment method
        autoPayoutTriggered: { type: Boolean, default: false }, // Whether automatic payout was triggered
        payoutTimestamp: { type: Number, default: null } // When the payout was processed
      }
    ],
    milestones: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Milestone'
      }
    ]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Project', projectSchema);
