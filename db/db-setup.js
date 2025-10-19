const pool = require("./pool");
const bcrypt = require("bcrypt");

// Updated table schemas
const createAdminTableSQL = `
  CREATE TABLE IF NOT EXISTS admin (
    id SERIAL PRIMARY KEY,
    firstName VARCHAR(255) NOT NULL,
    lastName VARCHAR(255) NOT NULL,
    userName VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(15),
    role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin'))
  );
`;

const createVotingStatsTableSQL = `
  CREATE TABLE IF NOT EXISTS votingstats (
    id SERIAL PRIMARY KEY,
    total_number_of_voters INT DEFAULT 0,
    voter_turnout INT DEFAULT 0,
    voter_turnoff INT DEFAULT 0,
    total_votes_cast INT DEFAULT 0,
    skipped_votes INT DEFAULT 0
  );
`;

const createCandidatesTableSQL = `
  CREATE TABLE IF NOT EXISTS candidates (
    id SERIAL PRIMARY KEY,
    firstName VARCHAR(255) NOT NULL,
    lastName VARCHAR(255) NOT NULL,
    position VARCHAR(255) NOT NULL,
    number_of_votes INT DEFAULT 0,
    votingstats_id INT,
    profilePhoto TEXT,
    CONSTRAINT fk_votingstats
      FOREIGN KEY (votingstats_id)
      REFERENCES votingstats(id)
      ON DELETE CASCADE
  );
`;

const createVotersTableSQL = `
  CREATE TABLE IF NOT EXISTS voters (
    id SERIAL PRIMARY KEY,
    firstName VARCHAR(255) NOT NULL,
    lastName VARCHAR(255) NOT NULL,
    voterId VARCHAR(50) UNIQUE NOT NULL,
    approvalStatus BOOLEAN DEFAULT FALSE,
    voteStatus BOOLEAN DEFAULT FALSE,
    phone_number VARCHAR(15),
    current_session_id INT
  );
`;

async function initializeDatabase() {
  const client = await pool.connect();

  try {
    console.log("Initializing the database...");

    await client.query(createAdminTableSQL);
    console.log("✓ Admin table created");

    await client.query(createVotingStatsTableSQL);
    console.log("✓ Voting stats table created");

    await client.query(createCandidatesTableSQL);
    console.log("✓ Candidates table created");

    await client.query(createVotersTableSQL);
    console.log("✓ Voters table created");

    console.log("Database initialization completed successfully.");
    return true;
  } catch (err) {
    console.error("Error during database initialization:", err);
    throw err;
  } finally {
    client.release();
  }
}

async function seedDefaultAdmin() {
  const client = await pool.connect();

  try {
    console.log("Seeding default super admin user...");

    const firstName = process.env.DEFAULT_ADMIN_FIRSTNAME || "Super";
    const lastName = process.env.DEFAULT_ADMIN_LASTNAME || "Admin";
    const userName = process.env.DEFAULT_ADMIN_USERNAME || "admin";
    const password = process.env.DEFAULT_ADMIN_PASSWORD || "1234";
    const phone = process.env.DEFAULT_ADMIN_PHONE || null;

    if (!userName || !password) {
      throw new Error(
        "DEFAULT_ADMIN_USERNAME and DEFAULT_ADMIN_PASSWORD must be set in environment variables"
      );
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const seedDefaultAdminSQL = `
      INSERT INTO admin (firstName, lastName, userName, password, phone, role)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (userName) DO NOTHING;
    `;

    const result = await client.query(seedDefaultAdminSQL, [
      firstName,
      lastName,
      userName,
      hashedPassword,
      phone,
      "super_admin",
    ]);

    if (result.rowCount > 0) {
      console.log("✓ Default super admin user created successfully");
      console.log(`  Username: ${userName}`);
    } else {
      console.log("ℹ Default super admin user already exists");
    }

    return true;
  } catch (err) {
    console.error("Error seeding default admin:", err);
    throw err;
  } finally {
    client.release();
  }
}

async function setupDatabase() {
  try {
    console.log("Starting database setup...\n");

    const client = await pool.connect();
    client.release();

    await initializeDatabase();
    await seedDefaultAdmin();

    console.log("\n✓ Database setup completed successfully!");
    return true;
  } catch (err) {
    if (err.code === "3D000") {
      console.error("\n✗ Database does not exist.");
      console.error("Please create the database manually first.");
      console.error(
        "PostgreSQL does not allow automatic database creation from client connections."
      );
      console.error("\nTo create the database, run:");
      console.error("CREATE DATABASE your_database_name;");
    } else if (err.code === "ECONNREFUSED") {
      console.error("\n✗ Could not connect to PostgreSQL server.");
      console.error(
        "Please ensure PostgreSQL is running and connection details are correct."
      );
    } else {
      console.error("\n✗ Error during database setup:", err.message);
    }
    throw err;
  }
}

module.exports = {
  initializeDatabase,
  seedDefaultAdmin,
  setupDatabase,
};
