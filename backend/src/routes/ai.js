const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authenticate } = require('../middlewares/auth');

// Allow users to ask the AI. Auth is recommended for production.
router.post('/ask', authenticate, aiController.askAI);
router.get('/schemes', authenticate, aiController.getAiSchemeRecommendations);
router.post('/schemes/chat', authenticate, aiController.chatAboutSchemes);
router.get('/insights', authenticate, aiController.getHealthInsights);
router.post('/clinical-notes', authenticate, aiController.generateClinicalNotes);
router.post('/clinical-chat', authenticate, aiController.clinicalChat);
router.post('/translate-ui', aiController.translateUi);
router.post('/translate-ui/batch', aiController.translateUiBatch);

module.exports = router;
