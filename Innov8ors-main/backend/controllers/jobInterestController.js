const JobInterest = require('../models/JobInterest');
const User = require('../models/User');

const normalizeItem = (doc) => ({
  id: doc._id,
  projectId: doc.projectId,
  projectName: doc.projectName,
  employerId: doc.employerId,
  freelancerId: doc.freelancerId,
  freelancerName: doc.freelancerName,
  freelancerEmail: doc.freelancerEmail,
  status: doc.status,
    freelancerPfiScore: doc.freelancerPfiScore ?? 0,
  requestedAtTimestamp: doc.requestedAtTimestamp,
  requestedAt: new Date(doc.requestedAtTimestamp).toLocaleString('en-IN')
});

exports.createInterest = async (req, res) => {
  try {
    const {
      projectId,
      projectName,
      employerId,
      freelancerId,
      freelancerName,
      freelancerEmail
    } = req.body;

    if (!projectId || !freelancerId) {
      return res.status(400).json({ message: 'projectId and freelancerId are required.' });
    }

    const timestamp = Date.now();

    let freelancerPfiScore = 0;
    try {
      const userDoc = await User.findById(freelancerId).lean();
      if (userDoc) freelancerPfiScore = userDoc.pfi_score || 0;
    } catch { /* silently fall through */ }

    const interest = await JobInterest.create({
      projectId: String(projectId),
      projectName: projectName || 'Untitled Project',
      employerId: employerId ? String(employerId) : null,
      freelancerId: String(freelancerId),
      freelancerName: freelancerName || 'Freelancer',
      freelancerEmail: freelancerEmail || 'N/A',
      freelancerPfiScore,
      status: 'pending',
      requestedAtTimestamp: timestamp
    });

    return res.status(201).json({
      message: 'Request sent to employer successfully.',
      interest: normalizeItem(interest)
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Request already sent for this project.' });
    }

    console.error('createInterest error:', error);
    return res.status(500).json({ message: 'Failed to create job interest.' });
  }
};

exports.listInterests = async (req, res) => {
  try {
    const { employerId, freelancerId, projectId, projectIds, status } = req.query;
    const filter = {};

    if (status) {
      filter.status = String(status);
    }

    if (projectId) {
      filter.projectId = String(projectId);
    }

    if (projectIds) {
      const parsed = String(projectIds)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

      if (parsed.length > 0) {
        filter.projectId = { $in: parsed };
      }
    }

    if (employerId) {
      filter.employerId = String(employerId);
    }

    if (freelancerId) {
      filter.freelancerId = String(freelancerId);
    }

    const items = await JobInterest.find(filter).sort({ requestedAtTimestamp: -1 }).lean();

    return res.status(200).json({
      count: items.length,
      interests: items.map((item) => normalizeItem(item))
    });
  } catch (error) {
    console.error('listInterests error:', error);
    return res.status(500).json({ message: 'Failed to fetch job interests.' });
  }
};

exports.updateInterestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, employerId } = req.body;

    if (!['pending', 'accepted', 'rejected'].includes(String(status))) {
      return res.status(400).json({ message: 'Valid status is required.' });
    }

    const interest = await JobInterest.findById(id);

    if (!interest) {
      return res.status(404).json({ message: 'Interest request not found.' });
    }

    if (employerId && interest.employerId && String(interest.employerId) !== String(employerId)) {
      return res.status(403).json({ message: 'Not authorized to update this request.' });
    }

    interest.status = String(status);
    await interest.save();

    return res.status(200).json({
      message: 'Interest status updated.',
      interest: normalizeItem(interest)
    });
  } catch (error) {
    console.error('updateInterestStatus error:', error);
    return res.status(500).json({ message: 'Failed to update interest status.' });
  }
};
