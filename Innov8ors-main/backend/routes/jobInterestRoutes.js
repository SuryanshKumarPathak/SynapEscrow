const express = require('express');
const jobInterestController = require('../controllers/jobInterestController');

const router = express.Router();

router.post('/', jobInterestController.createInterest);
router.get('/', jobInterestController.listInterests);
router.patch('/:id/status', jobInterestController.updateInterestStatus);

module.exports = router;
