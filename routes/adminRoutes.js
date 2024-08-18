const express = require('express');
const router = express.Router();
const passport = require('passport');
const pool = require('../db/pool');

// Admin Login Route
router.post('/login', (req, res, next) => {
  passport.authenticate('admin', (err, user, info) => {
    if (err) {
      return next(err); // Handle error during authentication
    }
    if (!user) {
      // Handle different error cases and pass them as an array of objects
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

      // Render the login page with the error messages
      return res.render('adminLogIn', { errors });
    }

    req.logIn(user, (err) => {
      if (err) {
        return next(err); // Handle error during login
      }
      return res.redirect('/admin/dashboard');
    });
  })(req, res, next);
});

// Admin Dashboard Route
router.get('/dashboard', async (req, res) => {
  console.log(`user type in router: ${req.locals}`);
  if (req.isAuthenticated()) {
    try {
      // Query for students who are not approved to vote (status = false)
      const result = await pool.query(
        'SELECT * FROM students WHERE status = $1',
        [false]
      );

      // Render the admin dashboard with pending students
      res.render('adminDashboard', { pendingStudents: result.rows });
    } catch (err) {
      console.error('Error fetching pending students:', err);
      res.status(500).json({ error: 'Failed to fetch pending students.' });
    }
  } else {
    res.redirect('/admin/login');
  }
});

router.get('/login', (req, res) => {
  res.render('adminLogIn', { errors: [] });
});

module.exports = router;
