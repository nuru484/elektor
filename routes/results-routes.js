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

    console.log("Voting Stats Query Result:", votingStatsResult);

    if (votingStatsResult.rows.length === 0) {
      // Initialize voting stats if none exist
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

    console.log(`The voting stats ID: ${votingStats.id}`);

    // Define the custom order of positions
    const positionOrder = [
      "PRESIDENT",
      "AMBASSADOR",
      "GENERAL SECRETARY",
      "WOCOM",
      "FINANCIAL OFFICER",
      "PRO",
      "ENTERTAINMENT SECRETARY",
      "SPORTS SECRETARY",
    ];

    // Sort results by position order
    results.sort((a, b) => {
      const indexA = positionOrder.indexOf(a.position);
      const indexB = positionOrder.indexOf(b.position);
      // If position not in order array, put it at the end
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });

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
