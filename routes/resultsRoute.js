const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

router.get('/resultsPage', async (req, res) => {
  try {
    // Fetch the voting results ordered by position and number of votes
    const resultsQuery = `
      SELECT position, candidate_name, number_of_votes
      FROM candidates
      ORDER BY position ASC, number_of_votes DESC
    `;
    const { rows: results } = await pool.query(resultsQuery);

    // Fetch the voting statistics
    const statsQuery = `
      SELECT total_number_of_voters, voter_turnout, voter_turnoff, total_votes_cast
      FROM votingstats
      WHERE id = 2
    `;
    const { rows: stats } = await pool.query(statsQuery);
    const votingStats = stats[0]; // Assuming there's only one row with id = 2

    // Render the results page with the results and voting stats
    res.render('results', {
      results,
      votingStats,
    });
  } catch (err) {
    console.error('Error fetching results:', err);
    res.status(500).send('An error occurred');
  }
});

module.exports = router;
