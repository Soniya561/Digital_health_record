const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
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
const aiRoutes = require('./routes/ai');
const analyticsRoutes = require('./routes/analytics');
const adminRoutes = require('./routes/admin');
const { errorHandler } = require('./middlewares/errorHandler');
const fs = require('fs');
const http = require('http');
const https = require('https');

const app = express();
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: '*', // Replace '*' with the frontend's domain for better security
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));
app.use(express.json());
app.use(morgan('dev'));

// serve uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

async function startServer() {
  try {
    await connectDB();

    const PORT = process.env.PORT || 4000;
    const sslKeyPath = process.env.SSL_KEY_PATH;
    const sslCertPath = process.env.SSL_CERT_PATH;
    const useHttps = process.env.USE_HTTPS === 'true' && sslKeyPath && sslCertPath;

    if (useHttps) {
      const backendRoot = path.resolve(__dirname, '..');
      const keyFile = path.isAbsolute(sslKeyPath) ? sslKeyPath : path.resolve(backendRoot, sslKeyPath);
      const certFile = path.isAbsolute(sslCertPath) ? sslCertPath : path.resolve(backendRoot, sslCertPath);
      const key = fs.readFileSync(keyFile);
      const cert = fs.readFileSync(certFile);
      https.createServer({ key, cert }, app).listen(PORT, () => {
        console.log(`HTTPS server running on port ${PORT}`);
      });
    } else {
      http.createServer(app).listen(PORT, () => {
        console.log(`HTTP server running on port ${PORT}`);
      });
    }
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/consents', consentRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);

app.get('/', (req, res) => res.json({ ok: true, service: 'patient-module' }));

// central error handler
app.use(errorHandler);

startServer();
