const Appointment = require('../models/Appointment');

exports.getAppointments = async (req, res, next) => {
  try {
    const appointments = await Appointment.find({ patient: req.user.id })
      .sort({ date: 1, time: 1 });
    res.json({ appointments });
  } catch (err) { next(err); }
};

exports.createAppointment = async (req, res, next) => {
  try {
    const { doctor, specialty, hospital, date, time, type } = req.body;
    const appointment = new Appointment({
      patient: req.user.id,
      doctor,
      specialty,
      hospital,
      date,
      time,
      type
    });
    await appointment.save();
    res.status(201).json({ appointment });
  } catch (err) { next(err); }
};

exports.updateAppointmentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, summary } = req.body;
    const appointment = await Appointment.findOneAndUpdate(
      { _id: id, patient: req.user.id },
      { status, summary },
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
