const express = require('express');
const router = express.Router();
const passport = require('passport');
const pool = require('../db/pool');
const imageMapping = require('../public/imageMapping');

router.get('/', (req, res) => {
  const errors = req.session.errors || [];
  req.session.errors = [];
  res.render('index', { user: req.user, errors });
});

router.post('/userLogin', (req, res, next) => {
  passport.authenticate('student', (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      // Handle different error cases and pass them as an array of objects
      const errors = [];
      if (info.message.includes('Invalid')) {
        errors.push({
          field: 'username',
          message: 'Invalid username or index number',
        });
      }
      if (info.message.includes('Incorrect')) {
        errors.push({ field: 'password', message: 'Incorrect password' });
      }
      if (info.message.includes('voted already')) {
        errors.push({ field: 'voted', message: 'Student has already voted' });
      }
      if (info.message.includes('not approved')) {
        errors.push({
          field: 'status',
          message: 'Student account not approved by admin',
        });
      }

      // Render the index page with the error messages
      return res.render('index', { errors });
    }

    req.logIn(user, (err) => {
      if (err) {
        return next(err); // Handle error during login
      }
      return res.redirect('/votes');
    });
  })(req, res, next);
});

router.get('/votes', async (req, res) => {
  if (req.isAuthenticated() && req.user.status === true) {
    const student = req.user;

    try {
      const candidatesResult = await pool.query('SELECT * FROM candidates');
      const candidates = candidatesResult.rows;

      // Group candidates by position and add image path
      const groupedCandidates = candidates.reduce((acc, candidate) => {
        const imageFileName = imageMapping[candidate.id] || 'default.jpg';
        const imagePath = `/images/${imageFileName}`;

        if (!acc[candidate.position]) {
          acc[candidate.position] = [];
        }
        acc[candidate.position].push({
          ...candidate,
          photo: imagePath, // Add image path
        });
        return acc;
      }, {});

      res.render('votes', { student, groupedCandidates });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch candidates.' });
    }
  } else {
    res.redirect('/');
  }
});

router.get('/', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.redirect('/');
    }

    res.redirect('/');
  });
});

module.exports = router;
