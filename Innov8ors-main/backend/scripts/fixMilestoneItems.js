const mongoose = require('mongoose');
const Project = require('../models/Project');

require('dotenv').config();

const toPayableAmount = (budgetAmount, payoutPercentage) => {
  const budget = Number(budgetAmount);
  const payout = Number(payoutPercentage);

  if (!Number.isFinite(budget) || budget <= 0) return 0;
  if (!Number.isFinite(payout) || payout <= 0) return 0;

  return Math.round((budget * payout) / 100);
};

async function fixMilestoneItems() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const projects = await Project.find({
      $or: [
        { milestone_items: { $exists: false } },
        { milestone_items: { $size: 0 } }
      ]
    });

    console.log(`\n📋 Found ${projects.length} projects without milestone_items\n`);

    for (const project of projects) {
      console.log(`Processing: ${project.name || project.title}`);
      
      const budgetAmount = Number(project.budget || 0);
      
      // Create a default milestone if project has no milestones_text
      let newMilestoneItems = [];
      
      if (project.milestones_text && project.milestones_text.trim()) {
        // Parse existing milestones_text (simplified parsing)
        const description = project.milestones_text;
        newMilestoneItems = [{
          title: 'Project Completion',
          description: description.substring(0, 200),
          expectedDeliverable: 'Project deliverables',
          estimatedTimeRange: 'Based on project scope',
          workloadComplexity: 'Medium',
          payoutPercentage: 100,
          payableAmount: budgetAmount,
          requirement: description
        }];
      } else {
        // Create default milestone
        newMilestoneItems = [{
          title: 'Project Completion',
          description: project.description || 'Project completion milestone',
          expectedDeliverable: 'Project deliverables',
          estimatedTimeRange: 'Based on project scope',
          workloadComplexity: 'Medium',
          payoutPercentage: 100,
          payableAmount: budgetAmount,
          requirement: ''
        }];
      }

      project.milestone_items = newMilestoneItems;
      await project.save();
      console.log(`   ✅ Updated with ${newMilestoneItems.length} milestone(s), payable: ₹${newMilestoneItems[0]?.payableAmount || 0}\n`);
    }

    console.log('✅ Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixMilestoneItems();
