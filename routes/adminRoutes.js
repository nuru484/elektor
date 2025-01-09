const express = require('express');
const router = express.Router();
const passport = require('passport');
const pool = require('../db/pool');
const axios = require('axios');
require('dotenv').config();

// Admin Login Page Route
router.get('/login', (req, res) => {
  res.render('adminLogIn', { errors: [] });
});

// Admin Login Route
router.post('/login', (req, res, next) => {
  passport.authenticate('admin', (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      const errors = [];
      if (info.message.includes('No admin found')) {
        errors.push({
          field: 'username',
          message: 'No admin found with that name',
        });
      }
      if (info.message.includes('Incorrect password')) {
        errors.push({ field: 'password', message: 'Incorrect password' });
      }
      return res.render('adminLogIn', { errors });
    }

    req.logIn(user, (err) => {
      if (err) {
        return next(err);
      }
      return res.redirect('/admin/dashboard');
    });
  })(req, res, next);
});

// Admin Dashboard Route
router.get('/dashboard', async (req, res) => {
  if (req.isAuthenticated()) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      const result = await pool.query(
        'SELECT * FROM students WHERE status = $1 LIMIT $2 OFFSET $3',
        [false, limit, offset]
      );

      const totalResult = await pool.query(
        'SELECT COUNT(*) FROM students WHERE status = $1',
        [false]
      );

      const totalStudents = parseInt(totalResult.rows[0].count);

      const totalPages = Math.ceil(totalStudents / limit);

      res.setHeader(
        'Cache-Control',
        'no-store, no-cache, must-revalidate, proxy-revalidate'
      );
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');

      res.render('adminDashboard', {
        pendingStudents: result.rows,
        currentPage: page,
        totalPages: totalPages,
        limit: limit,
      });
    } catch (err) {
      return res
        .status(500)
        .json({ error: 'Failed to fetch pending students.' });
    }
  } else {
    res.redirect('/admin/login');
  }
});

// Route to Request OTP
router.post('/request-otp/:studentId', async (req, res) => {
  const studentId = req.params.studentId;

  try {
    const result = await pool.query(
      'SELECT phone_number FROM students WHERE id = $1',
      [studentId]
    );
    const phoneNumber = result.rows[0].phone_number;

    const data = {
      expiry: 5,
      length: 6,
      medium: 'sms',
      message: `Your OTP for voting is %otp_code%. Valid for 5 minutes. Do not share this code.`,
      number: phoneNumber,
      sender_id: 'CivicLogic',
      type: 'numeric',
    };

    const headers = {
      'api-key': process.env.ARKISEL_API_KEY,
    };

    await axios.post('https://sms.arkesel.com/api/otp/generate', data, {
      headers,
    });

    res.redirect('/admin/dashboard');
  } catch (err) {
    return res.status(500).json({ error: 'Failed to generate or send OTP.' });
  }
});

// Admin Logout Route
router.get('/logoutAdmin', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.redirect('/admin/login');
    }
    res.redirect('/admin/login');
  });
});

module.exports = router;
