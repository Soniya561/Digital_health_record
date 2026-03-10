const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const ctrl = require('../controllers/patientController');
const schemeCtrl = require('../controllers/schemeController');
const upload = require('../middlewares/upload');

// ✅ Patient profile
router.get('/me', authenticate, ctrl.getMe);

// ✅ Patient dashboard data
router.get('/dashboard', authenticate, ctrl.getDashboard);

// ✅ Update patient profile
router.put('/me', authenticate, ctrl.updateProfile);
router.post('/me/photo', authenticate, upload.single('file'), ctrl.uploadProfilePhoto);

// ✅ Get QR Code
router.get('/me/qr-code', authenticate, ctrl.getQRCode);

// ✅ Public Profile
router.get('/public-profile/:blockchainId', ctrl.getPublicProfile);

// ✅ Schemes
router.get('/schemes', authenticate, schemeCtrl.checkEligibility);
router.post('/schemes/:schemeId/apply', authenticate, schemeCtrl.applyToScheme);
router.put('/me/eligibility', authenticate, schemeCtrl.updateEligibilityProfile);

// ✅ Enable emergency mode
router.post('/me/emergency', authenticate, ctrl.enableEmergency);

// ✅ Public emergency / QR access
router.post('/:patientId/emergency-access', ctrl.emergencyAccess);

module.exports = router;
