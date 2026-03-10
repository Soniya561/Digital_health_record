const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { Wallet } = require('ethers');
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
  photoUrl: { type: String },
  blockchainId: { type: String, unique: true, sparse: true },
  isProfileComplete: { type: Boolean, default: false },
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

PatientSchema.virtual('age')
  .get(function () {
    if (!this.dob) return null;
    const diff = Date.now() - this.dob.getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  });

PatientSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }

  if (!this.blockchainId) {
    const wallet = Wallet.createRandom();
    this.blockchainId = wallet.address;
  }
  
  // Set isProfileComplete if all mandatory fields are present
  if (!this.isProfileComplete && this.name && this.dob && this.gender && this.bloodGroup && this.photoUrl) {
    this.isProfileComplete = true;
  }
  next();
});

PatientSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('Patient', PatientSchema);
