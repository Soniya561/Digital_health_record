const HealthRecord = require('../models/HealthRecord');
const Consent = require('../models/Consent');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const { signToken, verifyToken } = require('../utils/jwt');
const { OpenAI } = require('openai');
const { resolveDoctorFromUser } = require('../utils/doctorIdentity');
const mongoose = require('mongoose');

const openai = new OpenAI({
  apiKey: process.env.AI_API_KEY,
  baseURL: process.env.AI_BASE_URL || 'https://api.groq.com/openai/v1',
});

function escapeRegex(value = '') {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function resolvePatientByIdentifier(rawIdentifier) {
  const identifier = String(rawIdentifier || '')
    .trim()
    .replace(/^id:\s*/i, '')
    .replace(/…/g, '...');
  if (!identifier) return null;

  if (mongoose.Types.ObjectId.isValid(identifier)) {
    const byId = await Patient.findById(identifier).select('_id name blockchainId abhaId email');
    if (byId) return byId;
  }

  if (identifier.includes('...')) {
    const [prefix, suffix] = identifier.split('...').map((part) => part.trim());
    if (prefix && suffix) {
      const fuzzyBlockchainRegex = new RegExp(`^${escapeRegex(prefix)}[a-fA-F0-9]*${escapeRegex(suffix)}$`, 'i');
      const byShortBlockchain = await Patient.findOne({ blockchainId: fuzzyBlockchainRegex }).select('_id name blockchainId abhaId email');
      if (byShortBlockchain) return byShortBlockchain;
    }
  }

  if (/^0x[a-fA-F0-9]+$/.test(identifier)) {
    const byBlockchain = await Patient.findOne({ blockchainId: new RegExp(`^${escapeRegex(identifier)}$`, 'i') }).select('_id name blockchainId abhaId email');
    if (byBlockchain) return byBlockchain;
  }

  if (identifier.includes('@')) {
    const byEmail = await Patient.findOne({ email: new RegExp(`^${escapeRegex(identifier)}$`, 'i') }).select('_id name blockchainId abhaId email');
    if (byEmail) return byEmail;
  }

  const byAbha = await Patient.findOne({ abhaId: identifier }).select('_id name blockchainId abhaId email');
  if (byAbha) return byAbha;

  return null;
}

// Get all records for the logged-in patient (their own or shared with them)
exports.getRecords = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    if (userRole === 'PATIENT') {
      // Patients see only their own records
      const records = await HealthRecord.find({ patient: userId }).sort({ createdAt: -1 });
      
      // Migrate: populate missing qrTokens
      for (const rec of records) {
        if (!rec.qrToken) {
          try {
            rec.qrToken = signToken({ type: 'qr', recordId: rec._id.toString(), patientId: rec.patient.toString() }, { expiresIn: '3650d' });
            await rec.save();
          } catch (migrateErr) {
            console.error(`Migration failed for record ${rec._id}:`, migrateErr.message);
          }
        }
      }

      return res.json({ records });
    }
    
    if (userRole === 'ADMIN') {
      // Admins see all records
      const records = await HealthRecord.find().sort({ createdAt: -1 });
      return res.json({ records });
    }
    
    if (userRole === 'DOCTOR') {
      // 1. Get all consents for this doctor
      const consents = await Consent.find({ 
        grantee: userId, 
        granted: true, 
        expiresAt: { $gt: new Date() } 
      });

      // 2. Separate patients where doctor has full access vs limited access
      const fullAccessPatientIds = [];
      const specificRecordIds = [];

      consents.forEach(c => {
        if (!c.records || c.records.length === 0) {
          fullAccessPatientIds.push(c.patient);
        } else {
          specificRecordIds.push(...c.records);
        }
      });

      // 3. Find records
      const records = await HealthRecord.find({
        $or: [
          { createdBy: userId },
          { patient: { $in: fullAccessPatientIds } },
          { _id: { $in: specificRecordIds } }
        ]
      }).sort({ createdAt: -1 });

      return res.json({ records });
    }
    
    res.status(403).json({ error: 'Forbidden' });
  } catch (err) { next(err); }
};

// Get records of a specific patient for a doctor (if authorized)
exports.getPatientRecordsForDoctor = async (req, res, next) => {
  try {
    const { patientId: patientIdentifier } = req.params;
    const userId = req.user.id;
    const doctorIdentity = resolveDoctorFromUser(req.user);
    const patient = await resolvePatientByIdentifier(patientIdentifier);

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found for provided identifier' });
    }
    const patientId = patient._id;

    // Check if there is an appointment between this doctor and patient
    const appointment = await Appointment.findOne({
      patient: patientId,
      $or: [
        ...(doctorIdentity ? [{ doctorKey: doctorIdentity.key }] : []),
        { doctor: req.user.name }
      ]
    });

    // Check if there is a consent
    const consent = await Consent.findOne({
      patient: patientId,
      grantee: userId,
      granted: true,
      expiresAt: { $gt: new Date() }
    });

    if (!appointment && !consent && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized: No appointment or consent found for this patient' });
    }

    const records = await HealthRecord.find({ patient: patientId }).sort({ createdAt: -1 });
    res.json({ records });
  } catch (err) {
    next(err);
  }
};

// Get a single record by ID
exports.getRecordById = async (req, res, next) => {
  try {
    const { recordId } = req.params;
    const record = await HealthRecord.findById(recordId);
    if (!record) return res.status(404).json({ error: 'Record not found' });
    
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Authorization: owner, admin, or consented doctor
    const isOwner = String(record.patient) === userId;
    const isAdmin = userRole === 'ADMIN';
    const isCreator = String(record.createdBy) === userId;
    
    if (!isOwner && !isAdmin && !isCreator) {
      if (userRole === 'DOCTOR') {
        const consent = await Consent.findOne({
          patient: record.patient,
          grantee: userId,
          granted: true,
          expiresAt: { $gt: new Date() }
        });
        if (!consent) return res.status(403).json({ error: 'No consent granted' });
        
        // If consent is limited to specific records, check if this record is included
        if (consent.records && consent.records.length > 0) {
          if (!consent.records.includes(record._id)) {
            return res.status(403).json({ error: 'Access to this specific record not granted' });
          }
        }
      } else {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }
    
    res.json({ record });
  } catch (err) { next(err); }
};

// Get records by QR token (public endpoint) - handles both single record and patient profile
exports.getRecordByQR = async (req, res, next) => {
  try {
    const { qrId } = req.params;
    const payload = verifyToken(qrId);
    if (!payload || !['qr', 'patient_qr'].includes(payload.type)) {
      return res.status(401).json({ error: 'Invalid or expired QR token' });
    }
    
    if (payload.type === 'qr') {
      const record = await HealthRecord.findById(payload.recordId).select('-__v');
      if (!record) return res.status(404).json({ error: 'Record not found' });
      return res.json({ type: 'single', record });
    }

    if (payload.type === 'patient_qr') {
      const records = await HealthRecord.find({ 
        patient: payload.patientId,
        consentEnabled: true 
      }).sort({ createdAt: -1 }).select('-__v');
      const patient = await Patient.findById(payload.patientId).select('name abhaId');
      return res.json({ type: 'patient', records, patient });
    }
    
    res.status(400).json({ error: 'Unknown QR type' });
  } catch (err) { next(err); }
};

// Create a new health record (metadata only). Only patient owner or doctor can create.
exports.createRecord = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Only PATIENT and DOCTOR can create records
    if (!['PATIENT', 'DOCTOR'].includes(userRole)) {
      return res.status(403).json({ error: 'Only patients and doctors can create records' });
    }
    
    // Patients can only create for themselves; doctors can create for any patient
    const patientIdentifier = req.body.patientId || userId;
    if (userRole === 'PATIENT' && patientIdentifier !== userId) {
      return res.status(403).json({ error: 'Patients can only create records for themselves' });
    }

    let resolvedPatient;
    if (userRole === 'PATIENT') {
      resolvedPatient = await Patient.findById(userId).select('_id');
    } else {
      resolvedPatient = await resolvePatientByIdentifier(patientIdentifier);
    }
    
    if (!resolvedPatient) {
      return res.status(404).json({
        error: 'Patient not found. Use Mongo patient ID, blockchain ID (0x...), ABHA ID, or email.',
      });
    }

    const payload = { 
      patient: resolvedPatient._id,
      title: req.body.title || 'Untitled', 
      description: req.body.description || '', 
      category: req.body.category || '',
      hospital: req.body.hospital || '',
      doctor: req.body.doctor || '',
      emergencyContactNumber: req.body.emergencyContactNumber || '',
      metadata: req.body.metadata || {}, 
      fileUrl: req.file ? req.file.filename : (req.body.fileUrl || null),
      createdBy: userId, 
      createdByRole: userRole
    };
    const rec = new HealthRecord(payload);
    await rec.save();
    
    // Generate and save QR token for the record
    const qrToken = signToken({ type: 'qr', recordId: rec._id.toString(), patientId: rec.patient.toString() }, { expiresIn: '3650d' }); // 10 years
    rec.qrToken = qrToken;
    await rec.save();

    res.status(201).json({ record: rec });
  } catch (err) { next(err); }
};

// Create or Get a QR token for a record (long-lived)
exports.createQrToken = async (req, res, next) => {
  try {
    const { recordId } = req.params;
    const record = await HealthRecord.findById(recordId);
    if (!record) return res.status(404).json({ error: 'Not found' });
    if (req.user.role === 'PATIENT' && req.user.id !== String(record.patient)) return res.status(403).json({ error: 'Forbidden' });
    
    // Use existing token if available, else generate new one
    if (!record.qrToken) {
      record.qrToken = signToken({ type: 'qr', recordId: record._id.toString(), patientId: record.patient.toString() }, { expiresIn: '3650d' });
      await record.save();
    }
    
    res.json({ qrToken: record.qrToken });
  } catch (err) { next(err); }
};

// Create/Get a permanent QR token for the patient's entire profile
exports.getPatientProfileQr = async (req, res, next) => {
  try {
    const patientId = req.user.id;
    // Permanent-ish token (10 years)
    const token = signToken({ type: 'patient_qr', patientId }, { expiresIn: '3650d' });
    res.json({ qrToken: token });
  } catch (err) { next(err); }
};

// Toggle consentEnabled for a record
exports.toggleConsent = async (req, res, next) => {
  try {
    const { recordId } = req.params;
    const record = await HealthRecord.findById(recordId);
    if (!record) return res.status(404).json({ error: 'Record not found' });

    // Only owner can toggle
    if (String(record.patient) !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    record.consentEnabled = !record.consentEnabled;
    record.visibility = record.consentEnabled ? 'shared' : 'private';
    await record.save();

    res.json({ record });
  } catch (err) { next(err); }
};

// Access via QR token (public endpoint)
exports.qrAccess = async (req, res, next) => {
  try {
    const { token } = req.query;
    const payload = verifyToken(token);
    if (!payload || payload.type !== 'qr') return res.status(401).json({ error: 'Invalid token' });
    const record = await HealthRecord.findById(payload.recordId).select('-__v');
    if (!record) return res.status(404).json({ error: 'Not found' });
    res.json({ record });
  } catch (err) { next(err); }
};

// Download or return the file URL for a record
exports.downloadRecord = async (req, res, next) => {
  try {
    const { recordId } = req.params;
    const record = await HealthRecord.findById(recordId);
    if (!record) return res.status(404).json({ error: 'Not found' });
    // permission: owner or admin or consented doctor
    const user = req.user || {};
    const isOwner = user.id && String(record.patient) === String(user.id);
    if (user.role === 'ADMIN' || isOwner) {
      // allowed
    } else if (user.role === 'DOCTOR') {
      const consent = await Consent.findOne({ patient: record.patient, grantee: user.id, granted: true, expiresAt: { $gt: new Date() } });
      if (!consent) return res.status(403).json({ error: 'No consent' });
      if (consent.records && consent.records.length && !consent.records.includes(record._id)) return res.status(403).json({ error: 'Not allowed for this record' });
    } else if (user.role === 'EMERGENCY') {
      // emergency tokens may allow limited access; allow download of record metadata and fileUrl only
    } else {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (!record.fileUrl) return res.status(404).json({ error: 'No file attached' });

    // If fileUrl is an http(s) link, redirect the client to it so browser downloads from origin
    if (/^https?:\/\//i.test(record.fileUrl)) {
      return res.redirect(record.fileUrl);
    }

    // If fileUrl is local path inside server, stream it
    const path = require('path');
    const fs = require('fs');
    const localPath = path.join(__dirname, '..', '..', 'uploads', record.fileUrl);
    if (!fs.existsSync(localPath)) return res.status(404).json({ error: 'File missing on server' });
    res.download(localPath, `${record.title || 'record'}${path.extname(localPath)}`);
  } catch (err) { next(err); }
};

// AI Chat endpoint (Uses real AI integration with patient records for context)
exports.aiChat = async (req, res, next) => {
  try {
    const { message, history } = req.body;
    const userId = req.user.id;
    
    // Fetch user records to provide "context"
    const records = await HealthRecord.find({ patient: userId }).sort({ createdAt: -1 }).limit(10);
    const recordsSummary = records.map(r => `${r.title} (${r.category}): ${r.description}`).join('\n');

    const messages = [
      { 
        role: 'system', 
        content: `You are a helpful AI health assistant for a Digital Health Record application. 
        Current user health records context:
        ${recordsSummary || 'No records found.'}
        
        Answer questions based on this context if applicable, but also answer general health questions like ChatGPT. 
        Always remind users to consult with a doctor for serious medical issues.` 
      },
      ...(history || []),
      { role: 'user', content: message }
    ];

    const completion = await openai.chat.completions.create({
      model: process.env.AI_MODEL || 'llama-3.3-70b-versatile',
      messages,
    });

    res.json({ response: completion.choices[0].message.content });
  } catch (err) { 
    console.error('AI Chat Error:', err);
    res.status(500).json({ error: 'Failed to connect to AI service' }); 
  }
};

exports.getInsights = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const records = await HealthRecord.find({ patient: userId }).sort({ createdAt: -1 }).limit(10);
    const recordsSummary = records.map(r => `${r.title} (${r.category}): ${r.description}`).join('\n');

    if (records.length === 0) {
      return res.json({ 
        insights: [
          { title: 'Welcome', message: 'Upload your first medical record to get AI health insights!', type: 'info' }
        ] 
      });
    }

    const messages = [
      { 
        role: 'system', 
        content: `You are a medical AI analyzer. Based on the following health records, provide 3 short, actionable health insights.
        Format your response as a JSON object with an "insights" key containing an array of objects with keys: "title", "message", and "type" (one of "success", "warning", "info").
        Return ONLY the JSON object.
        
        Records Context:
        ${recordsSummary}` 
      }
    ];

    const completion = await openai.chat.completions.create({
      model: process.env.AI_MODEL || 'llama-3.3-70b-versatile',
      messages,
      response_format: { type: "json_object" }
    });

    let insights;
    try {
      const parsed = JSON.parse(completion.choices[0].message.content);
      insights = parsed.insights || parsed;
      if (!Array.isArray(insights)) insights = [insights];
    } catch (e) {
      insights = [
        { title: 'Analysis Complete', message: 'We have reviewed your recent records. Stay healthy!', type: 'info' }
      ];
    }

    res.json({ insights });
  } catch (err) {
    console.error('AI Insights Error:', err);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
};

exports.getVoiceExplanation = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const records = await HealthRecord.find({ patient: userId }).sort({ createdAt: -1 }).limit(5);
    const recordsSummary = records.map(r => `${r.title} (${r.category}): ${r.description}`).join('\n');

    const messages = [
      { 
        role: 'system', 
        content: `You are a helpful AI health assistant. Your task is to explain the user's recent medical records in very simple language, like explaining to a 10-year-old child.
        Focus on "what's in that" - specifically explain the most recent reports and important medical findings found in their records.
        Keep it very simple, friendly, and brief (max 3-4 sentences).
        
        Recent Records:
        ${recordsSummary || 'No recent records found.'}` 
      },
      { role: 'user', content: 'Explain my latest health report to me in simple terms.' }
    ];

    const completion = await openai.chat.completions.create({
      model: process.env.AI_MODEL || 'llama-3.3-70b-versatile',
      messages,
    });

    res.json({ explanation: completion.choices[0].message.content });
  } catch (err) {
    console.error('AI Voice Explanation Error:', err);
    res.status(500).json({ error: 'Failed to generate explanation' });
  }
};
