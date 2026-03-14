const express = require('express');
const { 
  listUsers, 
  verifyUser, 
  updateStatus, 
  updateUser, 
  getUserDetail, 
  getPendingAppointments,
  deleteUser
} = require('../controllers/adminController');
const { authenticate, authorize } = require('../middlewares/auth');

const router = express.Router();

router.get('/users', authenticate, authorize('ADMIN'), listUsers);
router.get('/users/:id', authenticate, authorize('ADMIN'), getUserDetail);
router.patch('/users/:id/verify', authenticate, authorize('ADMIN'), verifyUser);
router.patch('/users/:id/status', authenticate, authorize('ADMIN'), updateStatus);
router.patch('/users/:id', authenticate, authorize('ADMIN'), updateUser);
router.delete('/users/:id', authenticate, authorize('ADMIN'), deleteUser);
router.get('/pending-appointments', authenticate, authorize('ADMIN'), getPendingAppointments);

module.exports = router;
