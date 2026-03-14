const mongoose = require('mongoose');

const jobInterestSchema = new mongoose.Schema(
  {
    projectId: {
      type: String,
      required: true,
      trim: true
    },
    projectName: {
      type: String,
      default: 'Untitled Project',
      trim: true
    },
    employerId: {
      type: String,
      default: null,
      trim: true
    },
    freelancerId: {
      type: String,
      required: true,
      trim: true
    },
    freelancerName: {
      type: String,
      default: 'Freelancer',
      trim: true
    },
    freelancerEmail: {
      type: String,
      default: 'N/A',
      trim: true
    },
      freelancerPfiScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending'
    },
    requestedAtTimestamp: {
      type: Number,
      default: () => Date.now()
    }
  },
  {
    timestamps: true
  }
);

jobInterestSchema.index({ projectId: 1, freelancerId: 1 }, { unique: true });
jobInterestSchema.index({ employerId: 1, status: 1 });

module.exports = mongoose.model('JobInterest', jobInterestSchema);
