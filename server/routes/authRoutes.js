const express = require('express');
const bcrypt = require('bcryptjs');
const { get, run } = require('../db/database');
const { generateToken, authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Register a new customer
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide name, email, and password.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = get('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email already exists.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long.'
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = run(
      `INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'customer')`,
      [name.trim(), cleanEmail, passwordHash]
    );

    const newUser = {
      id: result.lastInsertRowid,
      name: name.trim(),
      email: cleanEmail,
      role: 'customer'
    };

    const token = generateToken(newUser);

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      user: newUser,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during registration.'
    });
  }
});

// Login customer or administrator
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = get('SELECT * FROM users WHERE email = ?', [cleanEmail]);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.'
      });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.'
      });
    }

    const userPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    const token = generateToken(userPayload);

    return res.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      user: userPayload,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during login.'
    });
  }
});

// Get current profile
router.get('/me', authenticateToken, (req, res) => {
  const user = get('SELECT id, name, email, role, created_at FROM users WHERE id = ?', [req.user.id]);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found.' });
  }
  return res.json({ success: true, user });
});

module.exports = router;
