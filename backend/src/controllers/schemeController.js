const Scheme = require('../models/Scheme');
const Patient = require('../models/Patient');
const { generateSchemeRecommendations } = require('./aiController');

// Get all schemes
exports.getAllSchemes = async (req, res, next) => {
  try {
    const schemes = await Scheme.find({});
    res.json(schemes);
  } catch (err) { next(err); }
};

// Check eligibility for schemes
exports.checkEligibility = async (req, res, next) => {
  try {
    const { lang = 'en' } = req.query;
    const patient = await Patient.findById(req.user.id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const schemes = await Scheme.find({});
    const results = schemes.map(scheme => {
      let eligible = true;
      const criteria = scheme.eligibilityCriteria;
      
      // Calculate age
      if (patient.dob) {
        const age = new Date().getFullYear() - new Date(patient.dob).getFullYear();
        if (criteria.minAge && age < criteria.minAge) eligible = false;
        if (criteria.maxAge && age > criteria.maxAge) eligible = false;
      }

      // Check income
      if (criteria.incomeLimit && (patient.income || 0) > criteria.incomeLimit) eligible = false;

      // Check BPL
      if (criteria.isBPLRequired && !patient.isBPL) eligible = false;

      // Check migrant status
      if (criteria.employmentType === 'Migrant Worker' && !patient.isMigrant) eligible = false;

      // Check conditions
      if (criteria.requiredConditions && criteria.requiredConditions.length > 0) {
        const hasAll = criteria.requiredConditions.every(c => (patient.chronicConditions || []).includes(c));
        if (!hasAll) eligible = false;
      }

      // Check if already applied
      const applied = patient.appliedSchemes.some(s => s.schemeId.toString() === scheme._id.toString());

      return {
        scheme,
        eligible,
        applied
      };
    });

    // Generate AI recommendations
    let aiRecommendations = null;
    try {
      aiRecommendations = await generateSchemeRecommendations(patient, lang);
    } catch (err) {
      console.error('Failed to generate AI recommendations in checkEligibility:', err);
    }

    res.json({ manualResults: results, aiRecommendations });
  } catch (err) { next(err); }
};

// Apply to a scheme
exports.applyToScheme = async (req, res, next) => {
  try {
    const { schemeId } = req.params;
    const patient = await Patient.findById(req.user.id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    // Check if already applied
    if (patient.appliedSchemes.some(s => s.schemeId.toString() === schemeId)) {
      return res.status(400).json({ error: 'Already applied' });
    }

    const scheme = await Scheme.findById(schemeId);
    if (!scheme) return res.status(404).json({ error: 'Scheme not found' });

    patient.appliedSchemes.push({ schemeId, status: 'Pending' });
    await patient.save();

    res.json({ ok: true, message: 'Application submitted successfully' });
  } catch (err) { next(err); }
};

// Update profile for eligibility
exports.updateEligibilityProfile = async (req, res, next) => {
  try {
    const { lang = 'en' } = req.body;
    const allowed = ['dob', 'gender', 'income', 'isBPL', 'isMigrant', 'disabilities', 'chronicConditions', 'employmentType'];
    const updates = {};
    allowed.forEach(k => { if (k in req.body) updates[k] = req.body[k]; });
    
    const user = await Patient.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Not found' });
    
    Object.assign(user, updates);
    await user.save();
    
    // Generate AI recommendations after update
    let aiRecommendations = null;
    try {
      aiRecommendations = await generateSchemeRecommendations(user, lang);
    } catch (err) {
      console.error('Failed to generate AI recommendations in update:', err);
    }

    res.json({ ok: true, user, aiRecommendations });
  } catch (err) { next(err); }
};
