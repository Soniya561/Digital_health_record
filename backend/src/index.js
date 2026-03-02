require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');
const { connectDB } = require('./config/db');
const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const recordRoutes = require('./routes/records');
const consentRoutes = require('./routes/consent');
const appointmentRoutes = require('./routes/appointments');
const { errorHandler } = require('./middlewares/errorHandler');

const path = require('path');

const app = express();
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// serve uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// connect DB
connectDB();

app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/consents', consentRoutes);
app.use('/api/appointments', appointmentRoutes);

app.get('/', (req, res) => res.json({ ok: true, service: 'patient-module' }));

// central error handler
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
