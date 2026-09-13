const express = require('express');
const cors = require('cors');
const path = require('node:path');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { initDb } = require('./db/database');

const app = express();

// Ensure DB schema is initialized
initDb();

// 1. HTTP Compression (Gzip / Deflate for fast JSON & asset transfers)
app.use(compression());

// 2. Helmet Security Headers with Tailored CSP
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https://images.unsplash.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdnjs.cloudflare.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: null
      }
    },
    crossOriginEmbedderPolicy: false
  })
);

// 3. CORS & Body Parsers
app.use(cors({
  origin: process.env.CORS_ORIGIN || true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 4. Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many authentication attempts. Please try again after 15 minutes.' }
});

const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many checkout attempts. Please try again after 15 minutes.' }
});

// Apply rate limiters to API routes
app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/orders/checkout', checkoutLimiter);
app.use('/api/orders', orderRoutes);
app.use('/api/products', productRoutes);
app.use('/api/admin', adminRoutes);

// Serve static frontend assets
const publicDir = path.resolve(__dirname, '../public');
app.use(express.static(publicDir));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// SPA fallback for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

module.exports = app;
