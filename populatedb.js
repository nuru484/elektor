const ExcelJS = require('exceljs');
const pool = require('./db/pool');

const createAdminTableSQL = `CREATE TABLE IF NOT EXISTS admin (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    password VARCHAR(255)
);`;

const insertAdminSQL = `INSERT INTO admin (name, password) VALUES ('admin', '1234')`;

const createVotingStatsTableSQL = `
  CREATE TABLE IF NOT EXISTS votingstats (
    id SERIAL PRIMARY KEY,
    total_number_of_voters INT DEFAULT 0,
    voter_turnout INT DEFAULT 0,
    voter_turnoff INT DEFAULT 0,
    total_votes_cast INT DEFAULT 0,
    skipped_votes INT DEFAULT 0
);`;

const createCandidatesTableSQL = `
  CREATE TABLE IF NOT EXISTS candidates (
    id SERIAL PRIMARY KEY,
    candidate_name VARCHAR(255),
    position VARCHAR(255),
    number_of_votes INT,
    votingstats_id INT,
    profile TEXT,
    CONSTRAINT fk_votingstats
      FOREIGN KEY (votingstats_id)
      REFERENCES votingstats(id)
      ON DELETE CASCADE
);`;

const createStudentsTableSQL = `CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    student_name VARCHAR(255),
    index_number VARCHAR(50),
    status BOOLEAN DEFAULT FALSE,
    voted BOOLEAN DEFAULT FALSE,
    profile_photo TEXT,
    otp VARCHAR(10),
    phone_number VARCHAR(15),
    current_session_id INT
);`;

const createDeploymentStatusTableSQL = `
  CREATE TABLE IF NOT EXISTS deployment_status (
    id SERIAL PRIMARY KEY,
    task_name VARCHAR(255) UNIQUE,
    completed BOOLEAN DEFAULT FALSE
  );
`;

async function initializeDatabase() {
  try {
    console.log('Initializing the database...');

    await pool.query(createAdminTableSQL);
    await pool.query(createVotingStatsTableSQL);
    await pool.query(createCandidatesTableSQL);
    await pool.query(createStudentsTableSQL);
    await pool.query(createDeploymentStatusTableSQL);

    await pool.query(insertAdminSQL);
    console.log('Admin inserted successfully.');
  } catch (err) {
    console.error('Error during database initialization:', err);
    throw err;
  }
}

async function updateDatabaseFromExcel() {
  const workbook = new ExcelJS.Workbook();
  const client = await pool.connect();

  try {
    // Check if this task has already been completed
    const checkStatusQuery = `SELECT completed FROM deployment_status WHERE task_name = 'updateDatabaseFromExcel'`;
    const statusResult = await client.query(checkStatusQuery);

    if (statusResult.rows.length > 0 && statusResult.rows[0].completed) {
      console.log('Database update already completed. Skipping update.');
      return; // Exit the function, no need to run it again
    }

    await client.query('BEGIN');

    // PART 1: Read and update students data
    await workbook.xlsx.readFile('public/students_data.xlsx');
    const studentsWorksheet = workbook.getWorksheet(1);
    const studentsData = [];

    studentsWorksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header row

      const student = {
        id: row.getCell(1).value,
        student_name: row.getCell(2).value,
        index_number: row.getCell(3).value,
        status: row.getCell(4).value,
        voted: row.getCell(5).value,
        profile_photo: row.getCell(6).value,
        phone_number: row.getCell(7).value,
      };

      studentsData.push(student);
    });

    const studentQuery = `
    INSERT INTO students (id, student_name, index_number, status, voted, profile_photo, phone_number)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (id) DO NOTHING
  `;

    for (let student of studentsData) {
      await client.query(studentQuery, [
        student.id,
        student.student_name,
        student.index_number,
        student.status,
        student.voted,
        student.profile_photo,
        student.phone_number,
      ]);
    }

    await client.query('COMMIT');

    // Update voting stats
    const getTotalNumberOfStudents = 'SELECT COUNT(*) FROM students';
    const result = await pool.query(getTotalNumberOfStudents);
    const totalRegisteredVoters = result.rows[0].count;

    const insertVotingStatsSQL = `INSERT INTO votingstats (id, total_number_of_voters)
          VALUES (1, $1)
          ON CONFLICT (id)
          DO UPDATE SET total_number_of_voters = EXCLUDED.total_number_of_voters;
`;
    await pool.query(insertVotingStatsSQL, [totalRegisteredVoters]);

    // PART 2: Read and update candidates data
    await client.query('BEGIN');

    await workbook.xlsx.readFile('public/candidates_data.xlsx');
    const candidatesWorksheet = workbook.getWorksheet(1);
    const candidatesData = [];

    candidatesWorksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      if (rowNumber === 1) return;

      const candidate = {
        id: row.getCell(1).value,
        candidate_name: row.getCell(2).value,
        position: row.getCell(3).value,
        number_of_votes: row.getCell(4).value,
        profile: row.getCell(5).value,
      };

      candidatesData.push(candidate);
    });

    const votingStatsQuery =
      'SELECT id FROM votingstats ORDER BY id ASC LIMIT 1';
    const votingStatsResult = await pool.query(votingStatsQuery);

    if (votingStatsResult.rows.length === 0) {
      throw new Error('No votingstats rows found.');
    }

    const votingStatsId = votingStatsResult.rows[0].id;

    for (let candidate of candidatesData) {
      candidate.votingstats_id = votingStatsId;
    }

    const candidateQuery = `
      INSERT INTO candidates (id, candidate_name, position, number_of_votes, votingstats_id, profile)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO NOTHING
    `;

    await Promise.all(
      candidatesData.map((candidate) =>
        client.query(candidateQuery, [
          candidate.id,
          candidate.candidate_name,
          candidate.position,
          candidate.number_of_votes,
          candidate.votingstats_id,
          candidate.profile,
        ])
      )
    );

    console.log('Candidates inserted or updated successfully.');

    await client.query('COMMIT');

    // Mark the task as completed in the deployment_status table
    const updateStatusQuery = `
      INSERT INTO deployment_status (task_name, completed)
      VALUES ('updateDatabaseFromExcel', true)
      ON CONFLICT (task_name)
      DO UPDATE SET completed = EXCLUDED.completed;
    `;
    await client.query(updateStatusQuery);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error during database update:', error.message);
  } finally {
    client.release();
  }
}

module.exports = { initializeDatabase, updateDatabaseFromExcel };
