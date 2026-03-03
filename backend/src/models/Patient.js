const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { encryptField, decryptField } = require('../utils/crypto');

const roles = ['PATIENT', 'DOCTOR', 'ADMIN'];

const PatientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  abhaId: { type: String, unique: true, sparse: true, index: true },
  password: { type: String, required: true },
  phone_enc: { type: String },
  role: { type: String, enum: roles, default: 'PATIENT' },
  preferredLanguage: { type: String, default: 'en' },
  homeState: { type: String }, // For migrant workers
  dob: { type: Date },
  gender: { type: String, enum: ['Male', 'Female', 'Other'] },
  income: { type: Number },
  isBPL: { type: Boolean, default: false },
  isMigrant: { type: Boolean, default: false },
  disabilities: [{ type: String }],
  chronicConditions: [{ type: String }],
  employmentType: { type: String },
  bloodGroup: { type: String },
  allergies: [{ type: String }],
  emergencyContact: {
    name: { type: String },
    phone: { type: String },
    relation: { type: String }
  },
  appliedSchemes: [{
    schemeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Scheme' },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    appliedAt: { type: Date, default: Date.now }
  }],
  // AI-ready fields
  aiSummary: { type: String },
  embedding: { type: [Number] },
  // emergency access token hash and flag
  emergency: {
    enabled: { type: Boolean, default: false },
    tokenHash: { type: String },
    expiresAt: { type: Date }
  },
  otp: { type: String },
  otpExpiresAt: { type: Date }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

PatientSchema.virtual('phone')
  .get(function () { return this.phone_enc ? decryptField(this.phone_enc) : null; })
  .set(function (v) { this.phone_enc = v ? encryptField(v) : null; });

PatientSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

PatientSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('Patient', PatientSchema);
