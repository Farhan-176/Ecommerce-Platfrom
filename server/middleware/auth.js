const jwt = require('jsonwebtoken');
const { get } = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'encoderx_super_secure_jwt_secret_key_2026';

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.substring(7)
    : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please provide a valid token.'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({
      success: false,
      error: 'Invalid or expired token.'
    });
  }
}

function optionalToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.substring(7)
    : null;

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      // Ignore invalid optional token
      req.user = null;
    }
  } else {
    req.user = null;
  }
  next();
}

function requireRole(requiredRole) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.'
      });
    }

    const currentUser = get('SELECT id, name, email, role FROM users WHERE id = ?', [req.user.id]);
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        error: 'User account is no longer available.'
      });
    }

    req.user = currentUser;

    if (currentUser.role !== requiredRole) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Requires '${requiredRole}' role privilege.`
      });
    }

    next();
  };
}

module.exports = {
  JWT_SECRET,
  generateToken,
  authenticateToken,
  optionalToken,
  requireRole
};
