const Appointment = require('../models/Appointment');
const { resolveDoctorByInput, resolveDoctorFromUser } = require('../utils/doctorIdentity');
const { OpenAI } = require('openai');

const LANGUAGE_NAMES = {
  en: 'English',
  ml: 'Malayalam',
  hi: 'Hindi',
  ta: 'Tamil',
  bn: 'Bengali',
  kn: 'Kannada'
};

function getLanguageName(code = 'en') {
  return LANGUAGE_NAMES[code] || 'English';
}

let openai = null;
if (process.env.AI_API_KEY && process.env.AI_API_KEY !== 'replace_with_your_api_key') {
  openai = new OpenAI({
    apiKey: process.env.AI_API_KEY,
    baseURL: process.env.AI_BASE_URL || 'https://api.groq.com/openai/v1',
  });
}

async function translateText(text, languageName) {
  if (!text || languageName === 'English' || !openai) return text;
  try {
    const translationResponse = await openai.chat.completions.create({
      model: process.env.AI_MODEL || 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are a professional translator. Translate into ${languageName}. Do not leave any English words. Return only the translated text.`
        },
        { role: 'user', content: String(text) }
      ]
    });
    return translationResponse.choices[0].message.content || text;
  } catch (err) {
    console.error('Translation failed', err);
    return text;
  }
}

exports.getAppointments = async (req, res, next) => {
  try {
    const appointments = await Appointment.find({ patient: req.user.id })
      .populate('patient', 'name email abhaId')
      .sort({ date: 1, time: 1 });
    res.json({ appointments });
  } catch (err) { next(err); }
};

exports.getDoctorAppointments = async (req, res, next) => {
  try {
    if (req.user.role !== 'DOCTOR') {
      return res.status(403).json({ error: 'Only doctors can access doctor appointments' });
    }

    const doctorIdentity = resolveDoctorFromUser(req.user);
    if (!doctorIdentity) {
      return res.status(403).json({ error: 'Doctor profile is not in allowed appointment list' });
    }

    const query = {
      $or: [
        { doctorKey: doctorIdentity.key },
        { doctor: doctorIdentity.displayName },
        { doctor: req.user.name }
      ]
    };
    const appointments = await Appointment.find(query)
      .populate('patient', 'name email abhaId dob gender chronicConditions')
      .sort({ date: 1, time: 1 });
    res.json({ appointments: appointments.filter((a) => !!a.patient) });
  } catch (err) { next(err); }
};

exports.createAppointment = async (req, res, next) => {
  try {
    const { doctor, specialty, hospital, date, time, type, language = 'en' } = req.body;
    const selectedDoctor = resolveDoctorByInput(doctor);
    if (!selectedDoctor) {
      return res.status(400).json({ error: 'Please select either Dr. Sureka or Dr. Soniya' });
    }

    const languageName = getLanguageName(language);
    const [translatedSpecialty, translatedHospital, translatedType] = await Promise.all([
      translateText(specialty, languageName),
      translateText(hospital, languageName),
      translateText(type, languageName),
    ]);

    const appointment = new Appointment({
      patient: req.user.id,
      doctor: selectedDoctor.displayName,
      doctorKey: selectedDoctor.key,
      specialty: translatedSpecialty,
      hospital: translatedHospital,
      date,
      time,
      type: translatedType
    });
    await appointment.save();
    res.status(201).json({ appointment });
  } catch (err) { next(err); }
};

exports.updateAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;
    const language = updateFields.language || 'en';
    const languageName = getLanguageName(language);
    // Patient can update their own appointment
    let query = { _id: id, patient: req.user.id };

    // Doctor can only update their own assigned appointments.
    if (req.user.role === 'DOCTOR') {
      const doctorIdentity = resolveDoctorFromUser(req.user);
      if (!doctorIdentity) {
        return res.status(403).json({ error: 'Doctor profile is not in allowed appointment list' });
      }
      query = {
        _id: id,
        $or: [
          { doctorKey: doctorIdentity.key },
          { doctor: doctorIdentity.displayName },
          { doctor: req.user.name }
        ]
      };
    }

    delete updateFields.doctor;
    delete updateFields.doctorKey;
    delete updateFields.language;

    if (updateFields.specialty) {
      updateFields.specialty = await translateText(updateFields.specialty, languageName);
    }
    if (updateFields.hospital) {
      updateFields.hospital = await translateText(updateFields.hospital, languageName);
    }
    if (updateFields.type) {
      updateFields.type = await translateText(updateFields.type, languageName);
    }
    if (updateFields.summary) {
      updateFields.summary = await translateText(updateFields.summary, languageName);
    }
    if (updateFields.clinicalNotes) {
      updateFields.clinicalNotes = await translateText(updateFields.clinicalNotes, languageName);
    }
    if (updateFields.prescriptions) {
      if (Array.isArray(updateFields.prescriptions)) {
        updateFields.prescriptions = await Promise.all(
          updateFields.prescriptions.map((item) => translateText(item, languageName))
        );
      } else {
        updateFields.prescriptions = await translateText(updateFields.prescriptions, languageName);
      }
    }

    const appointment = await Appointment.findOneAndUpdate(
      query,
      updateFields,
      { new: true }
    );
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
    res.json({ appointment });
  } catch (err) { next(err); }
};

exports.updateAppointmentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, summary, clinicalNotes, prescriptions, language = 'en' } = req.body;
    const languageName = getLanguageName(language);
    
    let query = { _id: id };
    if (req.user.role !== 'DOCTOR') {
      query.patient = req.user.id;
    } else {
      const doctorIdentity = resolveDoctorFromUser(req.user);
      if (!doctorIdentity) {
        return res.status(403).json({ error: 'Doctor profile is not in allowed appointment list' });
      }
      query.$or = [
        { doctorKey: doctorIdentity.key },
        { doctor: doctorIdentity.displayName },
        { doctor: req.user.name }
      ];
    }

    const update = { status };
    if (summary) update.summary = await translateText(summary, languageName);
    if (clinicalNotes) update.clinicalNotes = await translateText(clinicalNotes, languageName);
    if (prescriptions) {
      if (Array.isArray(prescriptions)) {
        update.prescriptions = await Promise.all(
          prescriptions.map((item) => translateText(item, languageName))
        );
      } else {
        update.prescriptions = await translateText(prescriptions, languageName);
      }
    }

    const appointment = await Appointment.findOneAndUpdate(
      query,
      update,
      { new: true }
    );
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
    res.json({ appointment });
  } catch (err) { next(err); }
};

exports.cancelAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const appointment = await Appointment.findOneAndUpdate(
      { _id: id, patient: req.user.id },
      { status: 'cancelled' },
      { new: true }
    );
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
    res.json({ ok: true });
  } catch (err) { next(err); }
};
