// script to delete all students
`DELETE FROM students`;

// some sample
`INSERT INTO students (student_name, index_number, status, voted) VALUES
('Student1', 'index001', false, false),
('Student2', 'index002', false, false),
('Student3', 'index003', false, false),
('Student4', 'index004', false, false),
('Student5', 'index005', false, false),
('Student6', 'index006', false, false),
('Student7', 'index007', false, false),
('Student8', 'index008', false, false),
('Student9', 'index009', false, false),
('Student10', 'index010', false, false),
('Student11', 'index011', false, false),
('Student12', 'index012', false, false),
('Student13', 'index013', false, false),
('Student14', 'index014', false, false),
('Student15', 'index015', false, false),
('Student16', 'index016', false, false),
('Student17', 'index017', false, false),
('Student18', 'index018', false, false),
('Student19', 'index019', false, false),
('Student20', 'index020', false, false);`;

` id | candidate_name |        position        | number_of_votes
----+----------------+------------------------+-----------------
 17 | JaneSmith      | President              |              11
 20 | BobBrown       | Ambassador             |              11
 22 | DianaEvans     | Wocom                  |              11
 24 | EvanFox        | Secretary              |              11
 27 | GeorgeHill     | FinancialOfficer       |              11
 29 | IanJones       | EntertainmentSecretary |              11
 25 | KyleLong       | Pro                    |              11
 32 | NinaOwen       | SportsSecretary        |              11
 18 | JohnDoe        | President              |               2
 19 | AliceJohnson   | Ambassador             |               2
 21 | CharlieDavis   | Wocom                  |               2
 23 | FionaGreen     | Secretary              |               2
 28 | HannahIvy      | FinancialOfficer       |               2
 30 | JennyKing      | EntertainmentSecretary |               2
 26 | LauraMoore     | Pro                    |               2
 31 | MarkNelson     | SportsSecretary        |               2`;

//  update voting statistics
`UPDATE votingstats
SET total_votes_cast = 0,
    voter_turnout = 0,
    voter_turnoff = 0
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
