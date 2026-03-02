const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
    index: true
  },
  doctor: {
    type: String, // In a real app, this would be a ref to a Doctor model
    required: true
  },
  specialty: {
    type: String,
    required: true
  },
  hospital: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['in-person', 'video'],
    default: 'in-person'
  },
  status: {
    type: String,
    enum: ['upcoming', 'completed', 'cancelled'],
    default: 'upcoming'
  },
  summary: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Appointment', AppointmentSchema);
