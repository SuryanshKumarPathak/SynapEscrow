const express = require('express');
const projectController = require('../controllers/projectController');

const router = express.Router();

router.post('/', projectController.createProject);
router.get('/', projectController.listProjects);
router.get('/:id', projectController.getProjectById);
router.post('/:id/milestones/progress', projectController.recordMilestoneProgress);

module.exports = router;
