const Patient = require('../models/Patient');
const HealthRecord = require('../models/HealthRecord');
const Consent = require('../models/Consent');
const crypto = require('crypto');
const { signToken, verifyToken } = require('../utils/jwt');

// Get current user's profile
exports.getMe = async (req, res, next) => {
  try {
    const user = await Patient.findById(req.user.id).select('-password -__v');
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json({ user });
  } catch (err) { next(err); }
};

// Get Dashboard Data (Summary)
exports.getDashboard = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // 1. Fetch user profile
    const user = await Patient.findById(userId).select('-password -__v');
    if (!user) return res.status(404).json({ error: 'User not found' });

    let dashboardData = { user };

    if (userRole === 'PATIENT') {
      // 2. Fetch recent records (limit 5)
      const recentRecords = await HealthRecord.find({ patient: userId })
        .sort({ createdAt: -1 })
        .limit(5);

      // 3. Count active consents
      const activeConsentsCount = await Consent.countDocuments({ 
        patient: userId, 
        granted: true, 
        expiresAt: { $gt: new Date() } 
      });

      // 4. Calculate stats
      const totalRecords = await HealthRecord.countDocuments({ patient: userId });

      dashboardData.stats = {
        totalRecords,
        activeConsentsCount,
      };
      dashboardData.recentRecords = recentRecords;
    } else if (userRole === 'DOCTOR') {
      // 2. Fetch records created by doctor
      const createdRecordsCount = await HealthRecord.countDocuments({ createdBy: userId });

      // 3. Count patients who granted consent
      const activeConsentsCount = await Consent.countDocuments({ 
        grantee: userId, 
        granted: true, 
        expiresAt: { $gt: new Date() } 
      });

      // 4. Fetch recent patients (unique patients from consents)
      const recentConsents = await Consent.find({ 
        grantee: userId, 
        granted: true, 
        expiresAt: { $gt: new Date() } 
      })
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate('patient', 'name email');

      dashboardData.stats = {
        createdRecordsCount,
        activeConsentsCount,
      };
      dashboardData.recentConsents = recentConsents;
    }

    res.json(dashboardData);
  } catch (err) { next(err); }
};

// Update profile (patient only or admin)
exports.updateProfile = async (req, res, next) => {
  try {
    const allowed = ['name', 'preferredLanguage', 'phone', 'bloodGroup', 'allergies', 'emergencyContact', 'dob', 'gender'];
    const updates = {};
    
    allowed.forEach(k => { 
      if (k in req.body) {
        // Handle empty strings for Date fields or other specific types
        if ((k === 'dob' || k === 'gender') && req.body[k] === '') {
          updates[k] = null;
        } else if (req.body[k] !== undefined) {
          updates[k] = req.body[k];
        }
      }
    });

    const user = await Patient.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Not found' });

    // Apply updates manually to ensure virtuals and other logic are triggered correctly
    Object.keys(updates).forEach(key => {
      user[key] = updates[key];
    });

    await user.save();
    res.json({ ok: true });
  } catch (err) {
    console.error('Update Profile Error:', err);
    res.status(400).json({ error: err.message || 'Failed to update profile' });
  }
};

// Enable emergency access: generate one-time emergency token with expiry stored hashed
exports.enableEmergency = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.user.id);
    if (!patient) return res.status(404).json({ error: 'Not found' });
    const raw = crypto.randomBytes(24).toString('hex');
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    patient.emergency = { enabled: true, tokenHash: hash, expiresAt: new Date(Date.now() + 1000 * 60 * 60) }; // 1 hour
    await patient.save();
    // return raw to patient so they can encode as QR or print; server stores only hash
    res.json({ emergencyToken: raw, expiresAt: patient.emergency.expiresAt });
  } catch (err) { next(err); }
};

// Emergency access endpoint: accepts token and patient id, returns limited profile and records allowed
exports.emergencyAccess = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Missing token' });
    const patient = await Patient.findById(patientId).select('-password');
    if (!patient || !patient.emergency || !patient.emergency.enabled) return res.status(403).json({ error: 'No emergency access' });
    if (new Date() > new Date(patient.emergency.expiresAt)) return res.status(403).json({ error: 'Token expired' });
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    if (hash !== patient.emergency.tokenHash) return res.status(403).json({ error: 'Invalid token' });
    // issue a short-lived JWT for emergency services
    const jwt = signToken({ id: patient._id, role: 'EMERGENCY' }, { expiresIn: '15m' });
    res.json({ emergencyJwt: jwt });
  } catch (err) { next(err); }
};
