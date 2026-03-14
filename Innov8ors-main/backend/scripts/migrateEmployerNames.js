require('dotenv').config();
const mongoose = require('mongoose');
const Project = require('../models/Project');
const User = require('../models/User');

(async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI or MONGODB_URI environment variable not set');
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Find all projects with employer_id but no employer_name
    const projectsToUpdate = await Project.find({
      employer_id: { $exists: true, $ne: null },
      $or: [
        { employer_name: { $exists: false } },
        { employer_name: null }
      ]
    });

    console.log(`Found ${projectsToUpdate.length} projects to update with employer names`);

    let updateCount = 0;
    for (const project of projectsToUpdate) {
      if (!project.employer_id) continue;

      try {
        const employer = await User.findById(project.employer_id).lean();
        if (employer?.name) {
          project.employer_name = employer.name;
          await project.save();
          updateCount++;
          console.log(`✓ Updated project "${project.name}" with employer name: ${employer.name}`);
        }
      } catch (err) {
        console.warn(`✗ Failed to update project ${project._id}:`, err.message);
      }
    }

    console.log(`\nMigration complete: ${updateCount} projects updated with employer names`);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
})();
