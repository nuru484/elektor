const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// Approve user route
router.post('/approve-user/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('UPDATE students SET status = TRUE WHERE id = $1', [id]);
    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Reject user route
router.post('/reject-user/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM students WHERE id = $1', [id]);
    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

router.get('/search', async (req, res) => {
  const searchTerm = req.query.query;
  try {
    // Query to search students by name (case-insensitive)
    const { rows: pendingStudents } = await pool.query(
      'SELECT * FROM students WHERE student_name ILIKE $1 AND status = false',
      [`%${searchTerm}%`]
    );
    res.render('adminDashboard', { pendingStudents });
  } catch (err) {
    console.error('Error searching for students:', err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
