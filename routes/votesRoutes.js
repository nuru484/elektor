const express = require('express');
const pool = require('../db/pool');

module.exports = function (io) {
  const router = express.Router();

  router.post('/votes', async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN'); // Start transaction

      // Extract candidate IDs from request body
      const {
        PRESIDENTCandidateId,
        AMBASSADORCandidateId,
        WOCOMCandidateId,
        GENERALSECRETARYCandidateId,
        FINANCIALOFFICERCandidateId,
        ENTERTAINMENTSECRETARYCandidateId,
        PROCandidateId,
        SPORTSSECRETARYCandidateId,
      } = req.body;

      // Process votes, handling arrays and empty strings
      const votes = [
        PRESIDENTCandidateId,
        AMBASSADORCandidateId,
        WOCOMCandidateId,
        GENERALSECRETARYCandidateId,
        FINANCIALOFFICERCandidateId,
        ENTERTAINMENTSECRETARYCandidateId,
        PROCandidateId,
        SPORTSSECRETARYCandidateId,
      ]
        .map((id) =>
          Array.isArray(id)
            ? id.find((item) => item.trim() !== '')?.trim()
            : typeof id === 'string'
            ? id.trim()
            : null
        )
        .filter((id) => id && (id === 'skipped' || !isNaN(id))); // Valid IDs and "skipped"

      // Number of skipped votes
      const skippedVotes = votes.filter((id) => id === 'skipped').length;

      // Ensure all positions have been voted or skipped
      if (votes.length !== 8) {
        await client.query('ROLLBACK'); // Rollback transaction on failure
        return res.status(400).send('All positions must be voted or skipped.');
      }

      // Check if the student has already voted
      const { rows: studentRows } = await client.query(
        'SELECT voted FROM students WHERE id = $1',
        [parseInt(req.user.id, 10)]
      );

      if (studentRows.length === 0 || studentRows[0].voted) {
        await client.query('ROLLBACK'); // Rollback transaction on failure
        return res.redirect('/alreadyVoted');
      }

      // Update votes for each candidate
      const updateCandidatesQuery = `
        UPDATE candidates 
        SET number_of_votes = number_of_votes + 1 
        WHERE id = ANY($1::int[])
      `;
      const candidateIds = votes
        .filter((id) => id !== 'skipped')
        .map((id) => parseInt(id, 10));
      await client.query(updateCandidatesQuery, [candidateIds]);

      // Update skipped votes in the database
      if (skippedVotes > 0) {
        await client.query(
          'UPDATE votingstats SET skipped_votes = skipped_votes + $1',
          [skippedVotes]
        );
      }

      // Mark student as having voted
      if (req.user.id) {
        await client.query('UPDATE students SET voted = true WHERE id = $1', [
          parseInt(req.user.id, 10),
        ]);
      }

      // Update voting statistics
      await client.query(
        `UPDATE votingstats 
         SET voter_turnout = voter_turnout + 1;`
      );

      await client.query(
        `UPDATE votingstats 
         SET total_votes_cast = total_votes_cast + 1, 
             voter_turnoff = total_number_of_voters - voter_turnout`
      );

      await client.query('COMMIT'); // Commit transaction

      // Fetch updated results
      const resultsQuery = `
        SELECT 
          c.position, 
          c.candidate_name, 
          c.number_of_votes,
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

      io.emit('updateResults', results);

      // Set headers to prevent caching
      res.setHeader('Surrogate-Control', 'no-store');
      res.setHeader(
        'Cache-Control',
        'no-store, no-cache, must-revalidate, proxy-revalidate'
      );
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      // Send status after voting
      res.status(201);
    } catch (err) {
      await client.query('ROLLBACK'); // Rollback transaction on error
      res.status(500).send('An error occurred');
    } finally {
      client.release(); // Release client back to the pool
    }
  });

  router.get('/alreadyVoted', (req, res) => {
    res.render('alreadyVoted');
  });

  return router;
};
