const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const ctrl = require('../controllers/appointmentController');

// Get all appointments for a patient
router.get('/', authenticate, ctrl.getAppointments);

// Create a new appointment
router.post('/', authenticate, ctrl.createAppointment);

// Update appointment status (complete, cancelled)
router.patch('/:id', authenticate, ctrl.updateAppointmentStatus);

// Cancel an appointment
router.delete('/:id', authenticate, ctrl.cancelAppointment);

module.exports = router;
