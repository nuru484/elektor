const { Client } = require("pg");
const pool = require("./pool");
const { buildSslConfig } = require("./pool");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

// In dev, create the target database if it doesn't exist by connecting to the
// server's "postgres" maintenance DB. Skipped in production (the host
// provisions the DB and the app user usually can't CREATE DATABASE).
async function ensureDatabaseExists() {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return;
  }

  let targetUrl;
  try {
    targetUrl = new URL(connectionString);
  } catch {
    return; // not a parseable URL; let the normal connection surface the error
  }

  const dbName = decodeURIComponent(targetUrl.pathname.replace(/^\//, ""));
  if (!dbName) {
    return;
  }

  // Connect to the maintenance database on the same server.
  const adminUrl = new URL(connectionString);
  adminUrl.pathname = "/postgres";

  const client = new Client({
    connectionString: adminUrl.toString(),
    ssl: buildSslConfig(),
  });

  try {
    await client.connect();
    const { rowCount } = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    );

    if (rowCount === 0) {
      // Database identifiers can't be parameterized; quote and escape it.
      const safeName = `"${dbName.replace(/"/g, '""')}"`;
      await client.query(`CREATE DATABASE ${safeName}`);
      console.log(`✓ Created database "${dbName}"`);
    } else {
      console.log(`ℹ Database "${dbName}" already exists`);
    }
  } catch (err) {
    // Non-fatal: if we can't auto-create (e.g. no maintenance access), fall
    // through and let initializeDatabase report a clear error if it's missing.
    console.warn(
      `⚠ Could not auto-create database (${err.message}). Continuing...`
    );
  } finally {
    await client.end().catch(() => {});
  }
}

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
    const userName = process.env.DEFAULT_ADMIN_USERNAME;
    const password = process.env.DEFAULT_ADMIN_PASSWORD;
    const phone = process.env.DEFAULT_ADMIN_PHONE || null;

    // No insecure fallbacks (the old default was "1234"). Require real
    // credentials and a minimum password strength before seeding.
    if (!userName || !password) {
      throw new Error(
        "DEFAULT_ADMIN_USERNAME and DEFAULT_ADMIN_PASSWORD must be set in environment variables"
      );
    }

    if (password.length < 8) {
      throw new Error(
        "DEFAULT_ADMIN_PASSWORD must be at least 8 characters long"
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

// Ensures the read-only demo-admin account exists when DEMO_MODE=true.
// Idempotent and safe to call on every demo-login attempt; the password is
// random since the demo login is gated and passwordless.
async function ensureDemoAdmin() {
  if (process.env.DEMO_MODE !== "true") {
    return null;
  }

  const userName = process.env.DEMO_ADMIN_USERNAME || "demo-admin";

  const existing = await pool.query(
    "SELECT * FROM admin WHERE username = $1",
    [userName]
  );
  if (existing.rows.length > 0) {
    return existing.rows[0];
  }

  const randomPassword = crypto.randomBytes(24).toString("hex");
  const hashedPassword = await bcrypt.hash(randomPassword, 10);

  await pool.query(
    `INSERT INTO admin (firstName, lastName, userName, password, role)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (userName) DO NOTHING`,
    ["Demo", "Admin", userName, hashedPassword, "super_admin"]
  );

  const { rows } = await pool.query(
    "SELECT * FROM admin WHERE username = $1",
    [userName]
  );
  return rows[0] || null;
}

async function setupDatabase() {
  try {
    console.log("Starting database setup...\n");

    await ensureDatabaseExists();

    const client = await pool.connect();
    client.release();

    await initializeDatabase();
    await seedDefaultAdmin();

    const demo = await ensureDemoAdmin();
    if (demo) {
      console.log("✓ Demo admin account ready (DEMO_MODE enabled)");
    }

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
  ensureDemoAdmin,
  ensureDatabaseExists,
  setupDatabase,
};
