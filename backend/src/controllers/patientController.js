const Patient = require('../models/Patient');
const HealthRecord = require('../models/HealthRecord');
const Appointment = require('../models/Appointment');
const Consent = require('../models/Consent');
const crypto = require('crypto');
const QRCode = require('qrcode');
const { signToken, verifyToken } = require('../utils/jwt');

// Get current user's profile
exports.getMe = async (req, res, next) => {
  try {
    const user = await Patient.findById(req.user.id).select('-password -__v');
    if (!user) return res.status(404).json({ error: 'Not found' });
    const userObj = user.toObject();
    if (!userObj.photoUrl) {
      userObj.isProfileComplete = false;
    }
    res.json({ user: userObj });
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
    const user = await Patient.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Not found' });

    const allowed = ['name', 'preferredLanguage', 'phone', 'bloodGroup', 'allergies', 'emergencyContact', 'dob', 'gender', 'abhaId'];
    const updates = {};
    
    allowed.forEach(k => { 
      if (k in req.body) {
        // Handle empty strings for Date fields or other specific types
        if ((k === 'dob' || k === 'gender') && req.body[k] === '') {
          updates[k] = null;
        } else if (k === 'abhaId' && req.body[k] === '') {
          // Prevent duplicate-key issues on unique sparse index for empty string values
          updates[k] = undefined;
        } else if (req.body[k] !== undefined) {
          // Once profile is complete, name, bloodGroup and abhaId become static
          if (user.isProfileComplete && (k === 'bloodGroup' || k === 'abhaId' || k === 'name')) {
             return;
          }
          updates[k] = req.body[k];
        }
      }
    });

    // Apply updates manually to ensure virtuals and other logic are triggered correctly
    Object.keys(updates).forEach(key => {
      user[key] = updates[key];
    });

    // If it's the first time completing the profile
    if (!user.isProfileComplete && user.dob && user.bloodGroup && user.gender && user.photoUrl) {
      user.isProfileComplete = true;
    }

    await user.save();
    res.json({ ok: true, user });
  } catch (err) {
    console.error('Update Profile Error:', err);
    res.status(400).json({ error: err.message || 'Failed to update profile' });
  }
};

// Upload profile photo (one time only)
exports.uploadProfilePhoto = async (req, res, next) => {
  try {
    const user = await Patient.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Not found' });

    if (user.photoUrl) {
      return res.status(400).json({ error: 'Profile photo cannot be changed once uploaded' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Photo file is required' });
    }

    if (!req.file.mimetype || !req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'Only image files are allowed for profile photo' });
    }

    user.photoUrl = req.file.filename;
    await user.save();

    res.json({ ok: true, photoUrl: user.photoUrl, user });
  } catch (err) {
    next(err);
  }
};

// Generate QR Code for Patient
exports.getQRCode = async (req, res, next) => {
  try {
    const user = await Patient.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Not found' });

    // The QR code should point to a public profile URL
    // We'll use the blockchainId as a unique identifier
    // Use FRONTEND_URL from env or try to derive it from Origin header
    const origin = req.get('origin');
    const frontendUrl = process.env.FRONTEND_URL || origin || 'http://localhost:5173';
    // Use query-string URL so it works even when direct path routing is not configured.
    const publicUrl = `${frontendUrl}/?publicProfile=${encodeURIComponent(user.blockchainId)}`;
    const qrCodeDataUrl = await QRCode.toDataURL(publicUrl);
    
    res.json({ qrCodeDataUrl, blockchainId: user.blockchainId });
  } catch (err) { next(err); }
};

// Get Public Profile by blockchainId
exports.getPublicProfile = async (req, res, next) => {
  try {
    const { blockchainId } = req.params;
    const patient = await Patient.findOne({ blockchainId }).select('name age gender bloodGroup blockchainId abhaId allergies emergencyContact dob photoUrl');
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const healthRecords = await HealthRecord.find({ patient: patient._id }).sort({ createdAt: -1 });
    const appointments = await Appointment.find({ patient: patient._id }).sort({ date: -1 });

    res.json({
      patient,
      healthRecords,
      appointments
    });
  } catch (err) { next(err); }
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
