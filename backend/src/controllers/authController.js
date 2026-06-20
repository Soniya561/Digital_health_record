const Patient = require('../models/Patient');
const { signToken } = require('../utils/jwt');
const { sendOTPEmail, sendLoginNotification } = require('../utils/email');
const { body, validationResult } = require('express-validator');

exports.registerValidators = [
  body('name').isLength({ min: 2 }),
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  body('abhaId').optional().matches(/^[0-9]{14}$/).withMessage('ABHA ID must be 14 digits'),
  body('homeState').optional().isString()
];

exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { name, email, password, phone, preferredLanguage, role, abhaId, homeState } = req.body;
    
    // Check if email or abhaId already exists
    const emailExists = await Patient.findOne({ email });
    if (emailExists) return res.status(409).json({ error: 'Email already registered' });

    if (abhaId) {
      const abhaExists = await Patient.findOne({ abhaId });
      if (abhaExists) return res.status(409).json({ error: 'ABHA ID already registered' });
    }
    
    const userData = { name, email, password, preferredLanguage, abhaId, homeState };
    if (role && ['PATIENT', 'DOCTOR'].includes(role)) {
      userData.role = role;
    }
    
    const patient = new Patient(userData);
    if (phone) patient.phone = phone; // virtual will encrypt
    await patient.save();
    const token = signToken({ id: patient._id, role: patient.role });
    res.status(201).json({ token });
  } catch (err) { next(err); }
};

exports.loginValidators = [ body('email').isEmail(), body('password').exists() ];

exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { email, password } = req.body;
    const user = await Patient.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    
    const token = signToken({ id: user._id, role: user.role });
    
    // Send login notification email
    try {
      await sendLoginNotification(email);
    } catch (emailErr) {
      console.error('Failed to send login notification email:', emailErr);
    }

    res.json({ token });
  } catch (err) { next(err); }
};

exports.sendOTPValidators = [ 
  body('email').isEmail(),
  body('role').optional().isIn(['PATIENT', 'DOCTOR', 'ADMIN'])
];

exports.sendAbhaOTPValidators = [
  body('aadhaar').matches(/^[0-9]{12}$/).withMessage('Aadhaar number must be 12 digits')
];

exports.sendAbhaOTP = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { aadhaar } = req.body;
    
    // In a real scenario, this would call ABDM API to trigger Aadhaar OTP
    // For now, we mock it.
    const mockOtp = "123456"; 
    const mockPhone = "XXXXXX" + aadhaar.slice(-4); // Show last 4 digits of Aadhaar as mock phone
    
    console.log(`[ABHA OTP] Mocking Aadhaar OTP for ${aadhaar}: ${mockOtp}`);
    
    res.json({ 
      message: 'OTP sent to your linked phone number', 
      phoneMask: mockPhone,
      txnId: `mock-txn-${aadhaar}-${Date.now()}` // Include aadhaar in txnId for persistence-less demo
    });
  } catch (err) {
    next(err);
  }
};

exports.verifyAbhaOTPValidators = [
  body('txnId').exists(),
  body('otp').isLength({ min: 6, max: 6 })
];

exports.verifyAbhaOTP = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { txnId, otp } = req.body;

    // In a real scenario, this would verify the OTP with ABDM API
    if (otp !== '123456') {
      return res.status(401).json({ error: 'Invalid Aadhaar OTP' });
    }

    // Extract aadhaar from our mock txnId
    const aadhaar = txnId.split('-')[2];
    
    // Generate a consistent ABHA ID based on Aadhaar (1:1 mapping)
    // Using a simple deterministic "hash" for the demo
    let hash = 0;
    for (let i = 0; i < aadhaar.length; i++) {
        hash = ((hash << 5) - hash) + aadhaar.charCodeAt(i);
        hash |= 0;
    }
    const deterministicPart = Math.abs(hash).toString().padStart(10, '0').slice(0, 10);
    const mockAbhaId = "91" + deterministicPart + (parseInt(aadhaar.slice(-2)) % 100).toString().padStart(2, '0');
    
    res.json({ 
      message: 'ABHA generated successfully', 
      abhaId: mockAbhaId 
    });
  } catch (err) {
    next(err);
  }
};

exports.sendOTP = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, role } = req.body;
    const normalizedEmail = String(email || '').toLowerCase();

    // Role-based email validation
    if (role === 'ADMIN') {
      if (normalizedEmail !== 'soniyavinoth07@gmail.com') {
        return res.status(403).json({ error: 'Access Denied: Unauthorized email for Admin role' });
      }
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    let user = await Patient.findOne({ email });

    if (user) {
      // Update role if provided and user exists
      if (role && ['PATIENT', 'DOCTOR', 'ADMIN'].includes(role)) {
        user.role = role;
      }
      user.otp = otp;
      user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      await user.save();
    } else {
      // If user doesn't exist, create one with the specified role
      user = new Patient({
        name: email.split('@')[0],
        email: email,
        password: 'password123', // Default password for OTP-based login
        role: role || 'PATIENT',
        otp: otp,
        otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000)
      });
      await user.save();
    }

    await sendOTPEmail(email, otp);
    console.log(`[OTP] Sent ${otp} to ${email} for role ${role}`);
    res.json({ message: 'OTP sent successfully', email });
  } catch (err) {
    next(err);
  }
};

exports.verifyOTPValidators = [
  body('email').isEmail(),
  body('otp').isLength({ min: 6, max: 6 })
];

exports.verifyOTP = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, otp } = req.body;
    const user = await Patient.findOne({ email });

    if (!user || user.otp !== otp || user.otpExpiresAt < new Date()) {
      return res.status(401).json({ error: 'Invalid or expired OTP' });
    }

    // Clear OTP after successful verification
    user.otp = undefined;
    user.otpExpiresAt = undefined;
    await user.save();

    const token = signToken({ id: user._id, role: user.role });

    // Send login notification
    try {
      await sendLoginNotification(email);
    } catch (emailErr) {
      console.error('Failed to send login notification email:', emailErr);
    }

    res.json({ token, role: user.role });
  } catch (err) {
    next(err);
  }
};
