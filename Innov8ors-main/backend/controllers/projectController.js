const mongoose = require('mongoose');
const Project = require('../models/Project');
const User = require('../models/User');
const { processAutomaticPayout } = require('../services/paymentService');

const formatINR = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN')}`;

const toPayableAmount = (budgetAmount, payoutPercentage) => {
  const budget = Number(budgetAmount);
  const payout = Number(payoutPercentage);

  if (!Number.isFinite(budget) || budget <= 0) return 0;
  if (!Number.isFinite(payout) || payout <= 0) return 0;

  return Math.round((budget * payout) / 100);
};

const parseMilestoneItems = (milestonesText = '', budgetAmount = 0) => {
  const text = String(milestonesText || '').trim();
  if (!text) return [];

  const normalizedText = text.replace(/\r/g, '');
  const blocks = normalizedText
    .split(/\n\s*\n(?=-\s*milestone\s*name\s*:|milestone\s*\d+\s*[:\-]|\d+\.\s+)/i)
    .map((block) => block.trim())
    .filter(Boolean);

  const parsed = blocks
    .map((block, index) => {
      const titleMatch =
        block.match(/^-\s*milestone\s*name\s*:\s*(.+)$/im) ||
        block.match(/^(Milestone\s*\d+\s*[:\-]\s*.+)$/im) ||
        block.match(/^(\d+\.\s*.+)$/im);

      const descriptionMatch = block.match(/^\s*description\s*:\s*(.+)$/im);
      const deliverableMatch = block.match(/^\s*expected\s+deliverable\s*:\s*(.+)$/im);
      const timeRangeMatch = block.match(/^\s*estimated\s+time\s+range(?:\s+in\s+days)?\s*:\s*(.+)$/im);
      const complexityMatch = block.match(/^\s*workload\s+complexity\s*:\s*(.+)$/im);
      const payoutMatch = block.match(/^\s*payout\s+percentage[^\d]*([\d.]+)\s*%/im);

      const title = titleMatch
        ? titleMatch[1].trim()
        : `Milestone ${index + 1}`;

      return {
        title,
        description: descriptionMatch ? descriptionMatch[1].trim() : '',
        expectedDeliverable: deliverableMatch ? deliverableMatch[1].trim() : '',
        estimatedTimeRange: timeRangeMatch ? timeRangeMatch[1].trim() : '',
        workloadComplexity: complexityMatch ? complexityMatch[1].trim() : '',
        payoutPercentage: payoutMatch ? Number(payoutMatch[1]) : null,
        payableAmount: payoutMatch ? toPayableAmount(budgetAmount, Number(payoutMatch[1])) : 0,
        requirement: block
      };
    })
    .filter((item) => item.title);

  if (parsed.length > 0) return parsed;

  return [
    {
      title: 'Project Milestone',
      description: text,
      expectedDeliverable: '',
      estimatedTimeRange: '',
      workloadComplexity: '',
      payoutPercentage: null,
      payableAmount: 0,
      requirement: text
    }
  ];
};

const normalizeMilestoneItems = (milestoneItems = [], budgetAmount = 0) =>
  (Array.isArray(milestoneItems) ? milestoneItems : []).map((item, index) => {
    const payoutPercentage =
      item?.payoutPercentage === null || item?.payoutPercentage === undefined || Number.isNaN(Number(item?.payoutPercentage))
        ? null
        : Number(item.payoutPercentage);

    const payableFromPayload = Number(item?.payableAmount);
    const payableAmount = Number.isFinite(payoutPercentage) && payoutPercentage > 0
      ? toPayableAmount(budgetAmount, payoutPercentage)
      : Number.isFinite(payableFromPayload) && payableFromPayload >= 0
      ? Math.round(payableFromPayload)
      : 0;

    return {
      title: String(item?.title || `Milestone ${index + 1}`).trim(),
      description: String(item?.description || ''),
      expectedDeliverable: String(item?.expectedDeliverable || ''),
      estimatedTimeRange: String(item?.estimatedTimeRange || ''),
      workloadComplexity: String(item?.workloadComplexity || ''),
      payoutPercentage,
      payableAmount,
      requirement: String(item?.requirement || '')
    };
  });

const normalizeProject = (doc) => {
  const project = doc.toObject ? doc.toObject() : doc;
  const postedAtTimestamp =
    Number(project?.posted_at_timestamp) ||
    Number(new Date(project?.createdAt || Date.now()).getTime());
  const budgetAmount = Number(project?.budget || 0);
  
  let milestoneItems = [];
  if (Array.isArray(project?.milestone_items) && project.milestone_items.length > 0) {
    milestoneItems = normalizeMilestoneItems(project.milestone_items, budgetAmount);
  } else if (project?.milestones_text) {
    milestoneItems = parseMilestoneItems(project.milestones_text, budgetAmount);
  } else {
    // Fallback: create a default milestone if nothing else exists
    milestoneItems = [{
      title: 'Project Completion',
      description: project?.description || 'Project completion milestone',
      expectedDeliverable: 'Project deliverables',
      estimatedTimeRange: 'Based on project scope',
      workloadComplexity: 'Medium',
      payoutPercentage: 100,
      payableAmount: budgetAmount,
      requirement: ''
    }];
  }

  return {
    id: String(project?._id),
    _id: String(project?._id),
    name: project?.name || project?.title || 'Untitled Project',
    description: project?.description || '',
    budgetAmount,
    budget: formatINR(budgetAmount),
    status: project?.status || 'Active',
    milestones: project?.milestones_text || '',
    milestoneItems,
    payableAmounts: milestoneItems.map(m => m.payableAmount),
    employerId: project?.employer_id ? String(project.employer_id) : null,
    employerName: project?.employer_name || null,
    postedAtTimestamp,
    postedAt: new Date(postedAtTimestamp).toLocaleDateString('en-IN'),
    completedMilestones: Array.isArray(project?.completed_milestones)
      ? project.completed_milestones
      : [],
    paymentHistory: Array.isArray(project?.payment_history)
      ? project.payment_history
      : []
  };
};

const parseBudgetAmount = (body = {}) => {
  if (typeof body?.budgetAmount === 'number' && Number.isFinite(body.budgetAmount)) {
    return body.budgetAmount;
  }

  if (typeof body?.budget === 'number' && Number.isFinite(body.budget)) {
    return body.budget;
  }

  const fromString = Number(String(body?.budget || body?.budgetAmount || '0').replace(/[^\d.]/g, ''));
  return Number.isFinite(fromString) ? fromString : 0;
};

exports.createProject = async (req, res) => {
  try {
    const { name, title, description, milestones, milestoneItems, status, postedAtTimestamp, employerId } = req.body || {};

    const projectName = String(name || title || '').trim();
    if (!projectName) {
      return res.status(400).json({ message: 'Project name is required.' });
    }

    const budget = parseBudgetAmount(req.body);
    if (!budget || budget <= 0) {
      return res.status(400).json({ message: 'Valid budget is required.' });
    }

    const normalizedMilestoneItems = Array.isArray(milestoneItems) && milestoneItems.length > 0
      ? normalizeMilestoneItems(milestoneItems, budget)
      : parseMilestoneItems(milestones, budget);

    // Fetch employer name if employerId is provided
    let employerName = null;
    if (employerId && mongoose.Types.ObjectId.isValid(employerId)) {
      try {
        const employer = await User.findById(employerId).lean();
        employerName = employer?.name || null;
      } catch (err) {
        console.warn(`Failed to fetch employer name for ID: ${employerId}`, err.message);
      }
    }

    const project = await Project.create({
      title: projectName,
      name: projectName,
      description: String(description || ''),
      budget,
      status: String(status || 'Active'),
      milestones_text: String(milestones || ''),
      milestone_items: normalizedMilestoneItems,
      posted_at_timestamp: Number(postedAtTimestamp) || Date.now(),
      employer_id: mongoose.Types.ObjectId.isValid(employerId) ? employerId : null,
      employer_name: employerName,
      deadline: null
    });

    return res.status(201).json({
      message: 'Project saved successfully.',
      project: normalizeProject(project)
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to save project.' });
  }
};

exports.listProjects = async (req, res) => {
  try {
    const { employerId } = req.query || {};
    const filter = {};

    if (employerId && mongoose.Types.ObjectId.isValid(employerId)) {
      filter.employer_id = employerId;
    }

    const projects = await Project.find(filter)
      .sort({ posted_at_timestamp: -1, createdAt: -1 })
      .lean();

    return res.json({
      count: projects.length,
      projects: projects.map(normalizeProject)
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to fetch projects.' });
  }
};

exports.getProjectById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid project id.' });
    }

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    return res.json({ project: normalizeProject(project) });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to fetch project.' });
  }
};

exports.recordMilestoneProgress = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid project id.' });
    }

    const {
      milestoneTitle,
      freelancerId,
      freelancerName,
      completionPercentage,
      releasedAmount,
      paidAtTimestamp
    } = req.body || {};

    if (!milestoneTitle || !freelancerId) {
      return res.status(400).json({ message: 'milestoneTitle and freelancerId are required.' });
    }

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    const normalizedFreelancerId = String(freelancerId);
    const normalizedMilestoneTitle = String(milestoneTitle).trim();
    const normalizedCompletionPercentage = Number(completionPercentage) || 100;

    const completedAlready = (project.completed_milestones || []).some(
      (entry) =>
        entry?.milestoneTitle === normalizedMilestoneTitle &&
        String(entry?.freelancerId) === normalizedFreelancerId
    );

    if (!completedAlready) {
      project.completed_milestones.push({
        milestoneTitle: normalizedMilestoneTitle,
        freelancerId: normalizedFreelancerId,
        completedAtTimestamp: Date.now()
      });
    }

    const paymentRecordedAlready = (project.payment_history || []).some(
      (entry) =>
        entry?.milestoneTitle === normalizedMilestoneTitle &&
        String(entry?.freelancerId) === normalizedFreelancerId
    );

    let paymentRecord = null;
    let autoPayoutResult = null;

    if (!paymentRecordedAlready) {
      paymentRecord = {
        milestoneTitle: normalizedMilestoneTitle,
        freelancerId: normalizedFreelancerId,
        freelancerName: String(freelancerName || 'Freelancer'),
        completionPercentage: normalizedCompletionPercentage,
        releasedAmount: Number(releasedAmount) || 0,
        paidAtTimestamp: Number(paidAtTimestamp) || Date.now(),
        autoPayoutTriggered: false,
        paymentStatus: 'initiated'
      };

      // AUTO-PAYMENT TRIGGER: If milestone is 100% complete, initiate automatic payout
      if (normalizedCompletionPercentage === 100 && Number(releasedAmount) > 0) {
        try {
          // Fetch freelancer details including UPI ID
          const freelancer = await User.findById(normalizedFreelancerId).lean();
          const freelancerUPI = freelancer?.freelancerProfile?.upiId;

          if (freelancerUPI) {
            // Trigger automatic payout to freelancer's UPI
            autoPayoutResult = await processAutomaticPayout({
              freelancerId: normalizedFreelancerId,
              freelancerName: String(freelancerName || 'Freelancer'),
              freelancerUPI,
              amount: Number(releasedAmount),
              milestoneTitle: normalizedMilestoneTitle,
              projectId: String(id)
            });

            // Update payment record with payout details
            paymentRecord.autoPayoutTriggered = true;
            paymentRecord.transactionId = autoPayoutResult.transactionId || null;
            paymentRecord.paymentStatus = autoPayoutResult.status || 'initiated';
            paymentRecord.freelancerUPI = autoPayoutResult.freelancerUPI || freelancerUPI;
            paymentRecord.payoutTimestamp = autoPayoutResult.processedAtTimestamp || Date.now();

            console.log(`[AUTO-PAYOUT] Milestone "${normalizedMilestoneTitle}" verified 100% - Payout of ₹${releasedAmount} initiated to ${freelancerUPI}`);
          } else {
            // UPI not available, mark as pending
            paymentRecord.autoPayoutTriggered = false;
            paymentRecord.paymentStatus = 'pending';
            console.log(`[AUTO-PAYOUT] Milestone "${normalizedMilestoneTitle}" verified 100% but freelancer UPI not available. Payment pending.`);
          }
        } catch (payoutError) {
          console.error(`[AUTO-PAYOUT ERROR] Failed to process automatic payout:`, payoutError);
          // Continue with payment record even if payout fails
          paymentRecord.autoPayoutTriggered = false;
          paymentRecord.paymentStatus = 'failed';
          paymentRecord.transactionId = null;
        }
      }

      project.payment_history.push(paymentRecord);
    }

    await project.save();

    const response = {
      message: 'Milestone progress saved.',
      project: normalizeProject(project)
    };

    // Include auto-payout information in response if triggered
    if (autoPayoutResult) {
      response.autopayoutDetails = autoPayoutResult;
    }

    return res.json(response);
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to save milestone progress.' });
  }
};
