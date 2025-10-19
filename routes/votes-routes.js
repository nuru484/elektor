// routes/votes-routes.js
const express = require("express");
const router = express.Router();
const pool = require("../db/pool");

module.exports = function (io) {
  const router = express.Router();

  router.get("/cast-votes", async (req, res) => {
    if (req.isAuthenticated()) {
      const voter = req.user;

      if (voter.votestatus === true) {
        return res.redirect("/login");
      }

      try {
        const candidatesResult = await pool.query(
          "SELECT * FROM candidates ORDER BY position, id ASC"
        );
        const candidates = candidatesResult.rows;

        if (candidates.length === 0) {
          return res.render("cast-votes", {
            voter,
            groupedCandidates: {},
            noCandidates: true,
          });
        }

        const groupedCandidates = candidates.reduce((acc, candidate) => {
          if (!acc[candidate.position]) {
            acc[candidate.position] = [];
          }
          acc[candidate.position].push(candidate);
          return acc;
        }, {});

        res.setHeader(
          "Cache-Control",
          "no-store, no-cache, must-revalidate, proxy-revalidate"
        );
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
        res.setHeader("Surrogate-Control", "no-store");

        res.render("cast-votes", {
          voter,
          groupedCandidates,
          noCandidates: false,
        });
      } catch (err) {
        console.error("Error fetching candidates:", err);
        return res.status(500).json({ error: "Failed to fetch candidates." });
      }
    } else {
      res.redirect("/login");
    }
  });

  router.post("/votes", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized, Please login",
      });
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const voter = req.user;

      const { rows: voterRows } = await client.query(
        'SELECT "votestatus" FROM voters WHERE id = $1',
        [voter.id]
      );

      if (voterRows.length === 0 || voterRows[0].votestatus === true) {
        console.log("Voter has already voted or does not exist");
        await client.query("ROLLBACK");
        return res.status(403).json({
          success: false,
          error: "You have already voted",
        });
      }

      const { rows: positionsRows } = await client.query(
        "SELECT DISTINCT position FROM candidates ORDER BY position"
      );
      const allPositions = positionsRows.map((row) => row.position);

      if (allPositions.length === 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          success: false,
          error:
            "No candidates available. Voting is not possible at this time.",
        });
      }

      const votes = {};
      let totalVotesCast = 0;
      let skippedVotes = 0;

      for (const position of allPositions) {
        const fieldName = `${position.replace(/\s+/g, "")}CandidateId`;
        const candidateId = req.body[fieldName];

        if (!candidateId || candidateId.trim() === "") {
          await client.query("ROLLBACK");
          return res.status(400).json({
            success: false,
            error: "All positions must have a selection (vote or skip).",
          });
        }

        votes[position] = candidateId.trim();
      }

      for (const [position, candidateId] of Object.entries(votes)) {
        if (candidateId === "skipped") {
          skippedVotes++;
        } else {
          const candidateIdInt = parseInt(candidateId, 10);

          if (isNaN(candidateIdInt)) {
            await client.query("ROLLBACK");
            return res.status(400).json({
              success: false,
              error: "Invalid candidate ID",
            });
          }

          const updateResult = await client.query(
            `UPDATE candidates 
           SET number_of_votes = number_of_votes + 1 
           WHERE id = $1 AND position = $2
           RETURNING id`,
            [candidateIdInt, position]
          );

          if (updateResult.rowCount === 0) {
            await client.query("ROLLBACK");
            return res.status(400).json({
              success: false,
              error: `Invalid candidate for position: ${position}`,
            });
          }

          totalVotesCast++;
        }
      }

      await client.query(
        'UPDATE voters SET "votestatus" = true WHERE id = $1',
        [voter.id]
      );

      await client.query(
        `UPDATE votingstats 
       SET voter_turnout = voter_turnout + 1,
           total_votes_cast = total_votes_cast + $1,
           skipped_votes = skipped_votes + $2`,
        [totalVotesCast, skippedVotes]
      );

      await client.query(
        `UPDATE votingstats 
       SET voter_turnoff = total_number_of_voters - voter_turnout`
      );

      await client.query("COMMIT");

      const resultsQuery = `
      SELECT 
        c.id,
        c.firstname,
        c.lastname,
        c.position, 
        c.number_of_votes,
        c.profilephoto,
        vs.total_number_of_voters, 
        vs.voter_turnout, 
        vs.voter_turnoff, 
        vs.total_votes_cast,
        vs.skipped_votes
      FROM 
        candidates c
      JOIN 
        votingstats vs ON c.votingstats_id = vs.id
      ORDER BY 
        c.position ASC, 
        c.id ASC
    `;
      const { rows: results } = await client.query(resultsQuery);

      io.emit("updateResults", results);

      res.setHeader("Surrogate-Control", "no-store");
      res.setHeader(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, proxy-revalidate"
      );
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");

      req.logout((err) => {
        if (err) {
          console.error("Error during logout:", err);
          return res.status(500).json({
            success: false,
            error: "Vote recorded but logout failed",
          });
        }

        res.status(201).json({
          success: true,
          message: "Vote submitted successfully",
        });
      });
    } catch (err) {
      console.error("Error occurred:", err);
      await client.query("ROLLBACK");
      res.status(500).json({
        success: false,
        error: "An error occurred during vote submission",
      });
    } finally {
      client.release();
    }
  });

  return router;
};
