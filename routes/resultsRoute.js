const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// Route for rendering the results page
router.get('/resultsPage', async (req, res) => {
  try {
    // Fetch the voting results ordered by position and number of votes
    const resultsQuery = `
      SELECT position, candidate_name, number_of_votes
      FROM candidates
      ORDER BY id ASC;
    `;
    const { rows: results } = await pool.query(resultsQuery);

    const votingStatsQuery =
      'SELECT id FROM votingstats ORDER BY id ASC LIMIT 1';
    const votingStatsResult = await pool.query(votingStatsQuery);

    if (votingStatsResult.rows.length === 0) {
      throw new Error('No votingstats rows found.');
    }

    const votingStatsId = votingStatsResult.rows[0].id;

    console.log(`The voting stats ID: ${votingStatsId}`);

    console.log(`The voting stats ID: STRING`);

    // Fetch the voting statistics
    const statsQuery = `SELECT * FROM votingstats WHERE id = $1`;
    const { rows: stats } = await pool.query(statsQuery, [votingStatsId]);
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
    res.status(500).send('An error occurred during results page display');
  }
});

// Route for rendering results for the voting room
router.get('/VotingRoomResultsPage', async (req, res) => {
  try {
    const statsQuery = `SELECT * FROM votingstats WHERE id = 1`;
    const { rows: stats } = await pool.query(statsQuery);
    const votingStats = stats[0];

    res.render('resultsForVotingRoom', {
      votingStats,
    });
  } catch (err) {
    res.status(500).send('An error occurred during votingRoom results display');
  }
});

module.exports = router;
