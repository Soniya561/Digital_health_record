const Patient = require('../models/Patient');
const HealthRecord = require('../models/HealthRecord');
const Appointment = require('../models/Appointment');
const { decryptField } = require('../utils/crypto');

function mapUser(doc) {
  const resolvedVerified = doc.verified !== undefined ? doc.verified : (doc.role === 'DOCTOR' || doc.role === 'ADMIN');
  const resolvedStatus = doc.status || (resolvedVerified ? 'active' : 'pending');
  
  // Manually decrypt phone if it's not already decrypted by virtuals
  let phone = doc.phone;
  if (!phone && doc.phone_enc) {
    try {
      phone = decryptField(doc.phone_enc);
    } catch (err) {
      phone = '';
    }
  }

  return {
    id: String(doc._id),
    name: doc.name,
    role: doc.role || 'PATIENT',
    email: doc.email,
    phone: phone || '',
    organization: doc.organization || '',
    verified: Boolean(resolvedVerified),
    status: resolvedStatus,
    lastActive: doc.updatedAt || doc.createdAt,
    photoUrl: doc.photoUrl || null,
    abhaId: doc.abhaId || '',
    blockchainId: doc.blockchainId || '',
  };
}

// List all users for admin user management with search and filters
exports.listUsers = async (req, res, next) => {
  try {
    const { search, role, status, verified, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (role && role !== 'all') {
      filter.role = role.toUpperCase();
    }
    if (status && status !== 'all') {
      filter.status = status;
    }
    if (verified !== undefined) {
      filter.verified = verified === 'true';
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { abhaId: searchRegex },
        { organization: searchRegex }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const users = await Patient.find(filter)
      .select('name email role photoUrl updatedAt createdAt phone_enc verified status organization abhaId blockchainId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean({ virtuals: true });

    const total = await Patient.countDocuments(filter);
    const mapped = users.map(mapUser);

    res.json({ 
      users: mapped,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.verifyUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await Patient.findByIdAndUpdate(
      id,
      { verified: true, status: 'active' },
      { new: true, runValidators: true }
    ).lean({ virtuals: true });

    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: mapUser(user) });
  } catch (err) {
    next(err);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    const allowed = ['active', 'pending', 'suspended'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const user = await Patient.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    ).lean({ virtuals: true });

    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: mapUser(user) });
  } catch (err) {
    next(err);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = {};
    const allowedStatuses = ['active', 'pending', 'suspended'];
    const allowedRoles = ['PATIENT', 'DOCTOR', 'ADMIN', 'HOSPITAL'];

    if (req.body.status && allowedStatuses.includes(req.body.status)) {
      updates.status = req.body.status;
    }
    if (req.body.role && allowedRoles.includes(req.body.role)) {
      updates.role = req.body.role;
    }
    if (typeof req.body.verified === 'boolean') {
      updates.verified = req.body.verified;
    }
    if (req.body.organization !== undefined) {
      updates.organization = req.body.organization;
    }

    const user = await Patient.findByIdAndUpdate(id, updates, { new: true, runValidators: true })
      .lean({ virtuals: true });
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ user: mapUser(user) });
  } catch (err) {
    next(err);
  }
};

exports.getUserDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await Patient.findById(id)
      .select('-password -otp -otpExpiresAt')
      .lean({ virtuals: true });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const [recordCount, upcomingAppointments, completedAppointments] = await Promise.all([
      HealthRecord.countDocuments({ patient: id }),
      Appointment.countDocuments({ patient: id, status: 'upcoming' }),
      Appointment.countDocuments({ patient: id, status: 'completed' }),
    ]);

    res.json({
      user: {
        ...mapUser(user),
        abhaId: user.abhaId || '',
        blockchainId: user.blockchainId || '',
        gender: user.gender || '',
        bloodGroup: user.bloodGroup || '',
        preferredLanguage: user.preferredLanguage || '',
        homeState: user.homeState || '',
        dob: user.dob || null,
        isProfileComplete: !!user.isProfileComplete,
        stats: {
          recordCount,
          upcomingAppointments,
          completedAppointments,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getPendingAppointments = async (_req, res, next) => {
  try {
    const appointments = await Appointment.find({ status: 'upcoming' })
      .sort({ date: 1, createdAt: -1 })
      .limit(20)
      .populate('patient', 'name email');

    const mapped = appointments.map((a) => ({
      id: String(a._id),
      patientName: a.patient?.name || 'Unknown',
      patientEmail: a.patient?.email || '',
      doctor: a.doctor,
      hospital: a.hospital,
      specialty: a.specialty,
      date: a.date,
      time: a.time,
      status: a.status,
    }));

    res.json({ appointments: mapped });
  } catch (err) {
    next(err);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await Patient.findByIdAndDelete(id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Clean up related data if necessary
    await Promise.all([
      HealthRecord.deleteMany({ patient: id }),
      Appointment.deleteMany({ patient: id }),
    ]);

    res.json({ message: 'User and associated data deleted successfully' });
  } catch (err) {
    next(err);
  }
};
