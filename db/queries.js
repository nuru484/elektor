// create candidates table
`CREATE TABLE candidates (
    id SERIAL PRIMARY KEY,
    candidate_name VARCHAR(255) NOT NULL,
    position VARCHAR(255) NOT NULL,
    number_of_votes INT DEFAULT 0
);
`;

// create students table
`CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    student_name VARCHAR(255) NOT NULL,
    index_number VARCHAR(50) NOT NULL,
    status BOOLEAN NOT NULL,
    voted BOOLEAN NOT NULL
);

`;

// create admin table
`CREATE TABLE admin (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL
);
`;

// create votingstats table
`CREATE TABLE voter_statistics (
    id SERIAL PRIMARY KEY,
    total_number_of_voters INT NOT NULL,
    voter_turnout INT NOT NULL,
    voter_turnoff INT NOT NULL,
    total_votes_cast INT NOT NULL
);`;

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

// -- Insert data into the candidates table without specifying the id
`-- Insert data into the candidates table without specifying the id
INSERT INTO candidates (candidate_name, position, number_of_votes)
VALUES
    ('Evan Fox', 'SECRETARY', 0),
    ('Hannah Ivy', 'FINANCIALOFFICER', 0),
    ('Kyle Long', 'PRO', 0),
    ('Nina Owen', 'SPORTSSECRETARY', 0),
    ('Salam Musharifa', 'PRESIDENT', 1),
    ('Bob Brown', 'AMBASSADOR', 1),
    ('Charlie Davis', 'WOCOM', 1),
    ('Jenny King', 'ENTERTAINMENTSECRETARY', 1),
    ('John Doe', 'PRESIDENT', 1),
    ('Alice Johnson', 'AMBASSADOR', 1),
    ('Diana Evans', 'WOCOM', 1),
    ('Fiona Green', 'SECRETARY', 2),
    ('George Hill', 'FINANCIALOFFICER', 2),
    ('Ian Jones', 'ENTERTAINMENTSECRETARY', 1),
    ('Laura Moore', 'PRO', 2),
    ('Mark Nelson', 'SPORTSSECRETARY', 2);
`;
