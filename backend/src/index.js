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
const http = require('http');

const app = express();
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
// Configure CORS with explicit origins and credentials support.
// Do NOT allow wildcard '*' when credentials are used.
const allowedOrigins = [];
if (process.env.FRONTEND_URL) allowedOrigins.push(process.env.FRONTEND_URL);
if (process.env.FRONTEND_URLS) {
  // Optional: comma-separated list of allowed origins
  allowedOrigins.push(...process.env.FRONTEND_URLS.split(',').map((s) => s.trim()).filter(Boolean));
}
// Allow common localhost dev origins when not in production so developers can test locally
if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push('http://localhost:5173', 'https://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000');
}

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like curl, mobile apps, same-origin)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    console.warn('Blocked CORS request from origin:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  // expose common headers for clients
  exposedHeaders: ['Content-Range', 'X-Content-Range', 'Authorization', 'Set-Cookie'],
}));
// Log configured CORS origins for visibility on startup
const configuredFrontend = process.env.FRONTEND_URL || null;
console.log('Configured FRONTEND_URL:', configuredFrontend);
console.log('Allowed CORS origins:', allowedOrigins);

// Health/debug endpoint for deployment verification
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    env: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 4001,
    frontend: configuredFrontend,
    allowedOrigins,
  });
});
app.use(express.json());
app.use(morgan('dev'));

// serve uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

async function startServer() {
  try {
    await connectDB();

    const PORT = process.env.PORT || 4001;
    http.createServer(app).listen(PORT, '0.0.0.0', () => {
      console.log(`HTTP server running on port ${PORT}`);
    });
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
