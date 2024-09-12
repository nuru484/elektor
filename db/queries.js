// script to delete all students
`DELETE FROM students`;

//  update voting statistics
`UPDATE votingstats
SET total_number_of_voters = 7000,
    total_votes_cast = 0,
    voter_turnout = 0,
    voter_turnoff = 0,
    skipped_votes = 0
WHERE total_number_of_voters IS NOT NULL;
`;

// update candidates stats
1`UPDATE candidates
SET number_of_votes = 0;
`;

// update students to vote
`UPDATE students
SET status = false,
    voted = false;
`;

`DROP TABLE admin, students, candidates, votingstats;`;
`SELECT * FROM votingstats;`;
`SELECT * FROM students;``SELECT * FROM candidates;`;
