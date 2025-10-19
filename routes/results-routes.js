const express = require("express");
const router = express.Router();
const pool = require("../db/pool");

router.get("/resultsPage", async (req, res) => {
  try {
    const resultsQuery = `
      SELECT 
        id,
        CONCAT(firstName, ' ', lastName) as candidate_name,
        position, 
        number_of_votes,
        profilePhoto
      FROM candidates
      ORDER BY id ASC;
    `;
    const { rows: results } = await pool.query(resultsQuery);

    const votingStatsQuery =
      "SELECT * FROM votingstats ORDER BY id ASC LIMIT 1";

    const votingStatsResult = await pool.query(votingStatsQuery);

    if (votingStatsResult.rows.length === 0) {
      const initStatsQuery = `
        INSERT INTO votingstats (total_number_of_voters, voter_turnout, voter_turnoff, total_votes_cast, skipped_votes)
        VALUES (0, 0, 0, 0, 0)
        RETURNING *;
      `;
      const initResult = await pool.query(initStatsQuery);
      var votingStats = initResult.rows[0];
    } else {
      var votingStats = votingStatsResult.rows[0];
    }

    res.render("results", {
      results,
      votingStats,
    });
  } catch (err) {
    console.error("Error fetching results:", err);
    res.status(500).send("An error occurred during results page display");
  }
});

module.exports = router;
