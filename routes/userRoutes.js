const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const axios = require('axios');

// Route for approving a user
router.post('/approve-user/:id', async (req, res) => {
  try {
    const { otp: otpFromUser } = req.body;
    const { id } = req.params;

    if (otpFromUser) {
      const result = await pool.query(
        'SELECT phone_number FROM students WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).send('Student not found');
      }

      const phoneNumber = result.rows[0].phone_number;

      const data = {
        code: otpFromUser,
        number: phoneNumber,
      };
      const headers = {
        'api-key': process.env.ARKISEL_API_KEY, // Use environment variable for API key
      };

      const response = await axios.post(
        'https://sms.arkesel.com/api/otp/verify',
        data,
        { headers }
      );

      if (response.data.code === '1100') {
        await pool.query('UPDATE students SET status = TRUE WHERE id = $1', [
          id,
        ]);
        return res.redirect('/admin/dashboard');
      } else {
        return res.status(400).send('Invalid OTP');
      }
    } else {
      await pool.query('UPDATE students SET status = TRUE WHERE id = $1', [id]);
      return res.redirect('/admin/dashboard');
    }
  } catch (err) {
    return res.status(500).send('Server error');
  }
});

// Route for searching students
router.get('/search', async (req, res) => {
  const searchTerm = req.query.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    const { rows: pendingStudents } = await pool.query(
      'SELECT * FROM students WHERE student_name ILIKE $1 AND status = false LIMIT $2 OFFSET $3',
      [`%${searchTerm}%`, limit, offset]
    );

    const totalResult = await pool.query(
      'SELECT COUNT(*) FROM students WHERE student_name ILIKE $1 AND status = false',
      [`%${searchTerm}%`]
    );
    const totalStudents = parseInt(totalResult.rows[0].count);
    const totalPages = Math.ceil(totalStudents / limit);

    res.render('adminDashboard', {
      pendingStudents,
      currentPage: page,
      totalPages: totalPages,
      limit: limit,
      searchQuery: searchTerm,
    });
  } catch (err) {
    return res.status(500).send('Server Error');
  }
});

module.exports = router;
