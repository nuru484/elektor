const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

router.get('/resultsPage', async (req, res) => {
  try {
    // Fetch the voting results ordered by position and number of votes
    const resultsQuery = `
    SELECT position, candidate_name, number_of_votes
    FROM candidates
    ORDER BY id ASC;

    `;
    const { rows: results } = await pool.query(resultsQuery);

    // Fetch the voting statistics
    const statsQuery = `SELECT * FROM votingstats WHERE id = 2`;
    const { rows: stats } = await pool.query(statsQuery);
    const votingStats = stats[0];

    // Define the custom order of positions
    const positionOrder = [
      'PRESIDENT',
      'AMBASSADOR',
      'GENERAL SECRETARY',
      'WOCOM',
      'FINANCIAL OFFICER',
      'PRO',
      'ENTERTAINMENT SECRETARY',
      'SPORTS SECRETARY',
    ];

    results.sort((a, b) => {
      return (
        positionOrder.indexOf(a.position) - positionOrder.indexOf(b.position)
      );
    });

    res.render('results', {
      results,
      votingStats,
    });
  } catch (err) {
    console.error('Error fetching results:', err);
    res.status(500).send('An error occurred');
  }
});

router.get('/VotingRoomResultsPage', async (req, res) => {
  try {
    const statsQuery = `SELECT * FROM votingstats WHERE id = 2`;
    const { rows: stats } = await pool.query(statsQuery);
    const votingStats = stats[0];

    res.render('resultsForVotingRoom', {
      votingStats,
    });
  } catch (err) {
    console.error('Error fetching results:', err);
    res.status(500).send('An error occurred');
  }
});

module.exports = router;
