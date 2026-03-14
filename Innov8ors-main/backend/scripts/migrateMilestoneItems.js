require('dotenv').config();
const mongoose = require('mongoose');
const Project = require('../models/Project');

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

  const blocks = text
    .replace(/\r/g, '')
    .split(/\n\s*\n(?=-\s*milestone\s*name\s*:|milestone\s*\d+\s*[:\-]|\d+\.\s+)/i)
    .map((block) => block.trim())
    .filter(Boolean);

  const items = blocks
    .map((block, index) => {
      const titleMatch =
        block.match(/^-\s*milestone\s*name\s*:\s*(.+)$/im) ||
        block.match(/^(Milestone\s*\d+\s*[:\-]\s*.+)$/im) ||
        block.match(/^(\d+\.\s*.+)$/im);

      const payoutMatch = block.match(/^\s*payout\s+percentage[^\d]*([\d.]+)\s*%/im);

      return {
        title: (titleMatch ? titleMatch[1] : `Milestone ${index + 1}`).trim(),
        description: (block.match(/^\s*description\s*:\s*(.+)$/im)?.[1] || '').trim(),
        expectedDeliverable: (block.match(/^\s*expected\s+deliverable\s*:\s*(.+)$/im)?.[1] || '').trim(),
        estimatedTimeRange: (block.match(/^\s*estimated\s+time\s+range(?:\s+in\s+days)?\s*:\s*(.+)$/im)?.[1] || '').trim(),
        workloadComplexity: (block.match(/^\s*workload\s+complexity\s*:\s*(.+)$/im)?.[1] || '').trim(),
        payoutPercentage: payoutMatch ? Number(payoutMatch[1]) : null,
        payableAmount: payoutMatch ? toPayableAmount(budgetAmount, Number(payoutMatch[1])) : 0,
        requirement: block
      };
    })
    .filter((item) => item.title);

  if (items.length > 0) {
    return items;
  }

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

    const payableAmount = Number.isFinite(payoutPercentage) && payoutPercentage > 0
      ? toPayableAmount(budgetAmount, payoutPercentage)
      : Number.isFinite(Number(item?.payableAmount))
      ? Math.round(Number(item.payableAmount))
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

async function run() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI or MONGODB_URI is not configured');
  }

  await mongoose.connect(mongoUri);

  const projects = await Project.find({
    $or: [
      { milestones_text: { $exists: true, $ne: '' } },
      { milestone_items: { $exists: true, $not: { $size: 0 } } }
    ]
  });

  let updatedCount = 0;

  for (const project of projects) {
    const budgetAmount = Number(project?.budget || 0);
    const items = Array.isArray(project?.milestone_items) && project.milestone_items.length > 0
      ? normalizeMilestoneItems(project.milestone_items, budgetAmount)
      : parseMilestoneItems(project.milestones_text, budgetAmount);

    if (items.length === 0) continue;

    const previous = JSON.stringify(project.milestone_items || []);
    const next = JSON.stringify(items);
    if (previous !== next) {
      project.milestone_items = items;
      await project.save();
      updatedCount += 1;
    }
  }

  console.log(`Migrated projects: ${updatedCount}`);
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error('Migration failed:', error.message);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
