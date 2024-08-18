const express = require('express');
const pool = require('../db/pool');

module.exports = function (io) {
  const router = express.Router();

  router.post('/votes', async (req, res) => {
    try {
      // Process votes as before...

      // Extract candidate IDs from the request body
      const {
        PRESIDENTCandidateId,
        AMBASSADORCandidateId,
        WOCOMCandidateId,
        SECRETARYCandidateId,
        FINANCIALOFFICERCandidateId,
        ENTERTAINMENTSECRETARYCandidateId,
        PROCandidateId,
        SPORTSSECRETARYCandidateId,
      } = req.body;

      // Process votes, ensure handling arrays and empty strings
      const votes = [
        PRESIDENTCandidateId,
        AMBASSADORCandidateId,
        WOCOMCandidateId,
        SECRETARYCandidateId,
        FINANCIALOFFICERCandidateId,
        ENTERTAINMENTSECRETARYCandidateId,
        PROCandidateId,
        SPORTSSECRETARYCandidateId,
      ]
        .map((id) => {
          if (Array.isArray(id)) {
            // If id is an array, take the first non-empty string
            return id.find((item) => item.trim() !== '')?.trim();
          }
          return typeof id === 'string' ? id.trim() : null;
        })
        .filter((id) => id && !isNaN(id)); // Filter out invalid and empty IDs

      // Check if at least one vote is cast
      if (votes.length !== 8) {
        return res.status(400);
      }

      // Update the votes for each candidate
      for (const candidateId of votes) {
        try {
          await pool.query(
            'UPDATE candidates SET number_of_votes = number_of_votes + 1 WHERE id = $1',
            [parseInt(candidateId, 10)]
          );
        } catch (err) {
          console.error(`Error updating candidate ID ${candidateId}:`, err);
        }

        if (req.user.id) {
          try {
            await pool.query('UPDATE students SET voted = true WHERE id = $1', [
              parseInt(req.user.id, 10),
            ]);
            console.log(
              `Student ID ${req.user.id} voted status updated to true.`
            );
          } catch (err) {
            console.error(`Error updating student ID ${req.user.id}:`, err);
          }
        }
      }

      // Update the voting statistics
      try {
        await pool.query(
          'UPDATE votingstats SET total_votes_cast = total_votes_cast + 1, voter_turnout = voter_turnout + 1, voter_turnoff = total_number_of_voters - voter_turnout'
        );
        console.log('Voting statistics updated successfully.');
      } catch (err) {
        console.error('Error updating voting statistics:', err);
      }

      // After updating the votes in the database, emit the update
      const resultsQuery = `
        SELECT position, candidate_name, number_of_votes
        FROM candidates
        ORDER BY position ASC, number_of_votes DESC
      `;
      const { rows: results } = await pool.query(resultsQuery);

      // Emit the updated results to all connected clients
      io.emit('updateResults', results);

      // Send status after voting
      res.status(200);
    } catch (err) {
      console.error('Error handling vote submission:', err);
      res.status(500).send('An error occurred');
    }
  });

  return router;
};
