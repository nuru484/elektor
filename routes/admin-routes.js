const express = require("express");
const router = express.Router();
const passport = require("passport");
const pool = require("../db/pool");
const multer = require("multer");
const xlsx = require("xlsx");
const bcrypt = require("bcrypt");

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Middleware to check if user is super admin
function isSuperAdmin(req, res, next) {
  if (req.isAuthenticated() && req.user.role === "super_admin") {
    return next();
  }
  return res.status(403).json({
    success: false,
    error: "Access denied. Super admin only.",
  });
}

// Helper function to ensure votingstats record exists
async function ensureVotingStatsExists(client) {
  const result = await client.query("SELECT id FROM votingstats LIMIT 1");

  if (result.rows.length === 0) {
    const insertResult = await client.query(
      "INSERT INTO votingstats (total_number_of_voters, voter_turnout, voter_turnoff, total_votes_cast, skipped_votes) VALUES (0, 0, 0, 0, 0) RETURNING id"
    );
    return insertResult.rows[0].id;
  }

  return result.rows[0].id;
}

// Helper function to update voting stats
async function updateVotingStats(client, increment = 1) {
  await client.query(
    "UPDATE votingstats SET total_number_of_voters = total_number_of_voters + $1",
    [increment]
  );
}

// Admin Login Page Route
router.get("/login", (req, res) => {
  res.render("admin-login", { errors: [] });
});

router.post("/login", (req, res, next) => {
  passport.authenticate("admin", (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.render("admin-login", {
        errors: [
          {
            field: "general",
            message: info?.message || "Invalid username or password",
          },
        ],
      });
    }

    req.logIn(user, (err) => {
      if (err) {
        return next(err);
      }

      console.log("Admin logged in:", user);
      return res.redirect("/admin/dashboard");
    });
  })(req, res, next);
});

// Admin Dashboard Route
router.get("/dashboard", async (req, res) => {
  if (req.isAuthenticated()) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      const result = await pool.query(
        "SELECT * FROM voters ORDER BY id DESC LIMIT $1 OFFSET $2",
        [limit, offset]
      );

      const totalResult = await pool.query("SELECT COUNT(*) FROM voters");
      const totalVoters = parseInt(totalResult.rows[0].count);
      const totalPages = Math.ceil(totalVoters / limit);

      res.setHeader(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, proxy-revalidate"
      );
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.setHeader("Surrogate-Control", "no-store");

      res.render("admin-dashboard", {
        voters: result.rows,
        currentPage: page,
        totalPages: totalPages,
        limit: limit,
        totalVoters: totalVoters,
        user: req.user,
        isSuperAdmin: req.user.role === "super_admin",
      });
    } catch (err) {
      console.error("Error fetching voters:", err);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch voters.",
      });
    }
  } else {
    res.redirect("/admin/login");
  }
});

// Form Routes
router.get("/add-voter-form", isSuperAdmin, (req, res) => {
  res.render("add-voter-form");
});

router.get("/add-candidate-form", (req, res) => {
  res.render("add-candidate-form");
});

router.get("/upload-voters-form", isSuperAdmin, (req, res) => {
  res.render("upload-voters-form");
});

router.get("/add-admin-form", isSuperAdmin, (req, res) => {
  res.render("add-admin-form");
});

// Add Admin (Super Admin Only)
router.post("/add-admin", isSuperAdmin, async (req, res) => {
  try {
    const { firstName, lastName, userName, password, phone, role } = req.body;

    // Validate role
    if (!["admin", "super_admin"].includes(role)) {
      return res.status(400).json({
        success: false,
        error: "Invalid role specified.",
      });
    }

    // Check if username already exists
    const existingUser = await pool.query(
      "SELECT id FROM admin WHERE userName = $1",
      [userName]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Username already exists.",
      });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    await pool.query(
      "INSERT INTO admin (firstName, lastName, userName, password, phone, role) VALUES ($1, $2, $3, $4, $5, $6)",
      [firstName, lastName, userName, hashedPassword, phone || null, role]
    );

    return res.status(201).json({
      success: true,
      message: "Admin added successfully",
    });
  } catch (err) {
    console.error("Error adding admin:", err);
    if (err.code === "23505") {
      return res.status(400).json({
        success: false,
        error: "Username already exists.",
      });
    }
    return res.status(500).json({
      success: false,
      error: "Failed to add admin.",
    });
  }
});

// Add Single Voter (Super Admin Only)
router.post("/add-voter", isSuperAdmin, async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { firstName, lastName, voterId, phone_number } = req.body;

    // Check if voter ID already exists
    const existingVoter = await client.query(
      "SELECT id FROM voters WHERE voterId = $1",
      [voterId]
    );

    if (existingVoter.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        error: "Voter ID already exists.",
      });
    }

    await ensureVotingStatsExists(client);

    await client.query(
      "INSERT INTO voters (firstname, lastname, voterid, phone_number) VALUES ($1, $2, $3, $4)",
      [firstName, lastName, voterId, phone_number || null]
    );

    await updateVotingStats(client, 1);

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Voter added successfully",
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error adding voter:", err);

    if (err.code === "23505") {
      return res.status(400).json({
        success: false,
        error: "Voter ID already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      error: "Failed to add voter.",
    });
  } finally {
    client.release();
  }
});

// Add Single Candidate
router.post(
  "/add-candidate",
  upload.single("profilePhoto"),
  async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized. Please login.",
      });
    }

    try {
      const { firstName, lastName, position } = req.body;
      const profilePhoto = req.file ? req.file.buffer.toString("base64") : null;

      await pool.query(
        "INSERT INTO candidates (firstName, lastName, position, profilePhoto) VALUES ($1, $2, $3, $4)",
        [firstName, lastName, position, profilePhoto]
      );

      return res.status(201).json({
        success: true,
        message: "Candidate added successfully",
      });
    } catch (err) {
      console.error("Error adding candidate:", err);
      return res.status(500).json({
        success: false,
        error: "Failed to add candidate.",
      });
    }
  }
);

// Upload Voters from Excel (Super Admin Only)
router.post(
  "/upload-voters",
  isSuperAdmin,
  upload.single("votersFile"),
  async (req, res) => {
    const client = await pool.connect();

    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No file uploaded.",
        });
      }

      const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const voters = xlsx.utils.sheet_to_json(worksheet);

      if (voters.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Excel file is empty or invalid.",
        });
      }

      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      try {
        await client.query("BEGIN");
        await ensureVotingStatsExists(client);

        for (const voter of voters) {
          try {
            if (!voter.firstName || !voter.lastName || !voter.voterId) {
              errorCount++;
              errors.push(
                `Row missing required fields: ${JSON.stringify(voter)}`
              );
              continue;
            }

            await client.query(
              "INSERT INTO voters (firstName, lastName, voterId, phone_number) VALUES ($1, $2, $3, $4)",
              [
                voter.firstName,
                voter.lastName,
                voter.voterId,
                voter.phone_number || null,
              ]
            );
            successCount++;
          } catch (err) {
            console.error(`Error inserting voter ${voter.voterId}:`, err);
            errorCount++;
            errors.push(`Failed to add voter ${voter.voterId}`);
          }
        }

        if (successCount > 0) {
          await updateVotingStats(client, successCount);
        }

        await client.query("COMMIT");

        return res.status(201).json({
          success: true,
          message: `Successfully uploaded ${successCount} voter(s). ${errorCount} error(s) occurred.`,
          details: {
            successCount,
            errorCount,
            errors: errorCount > 0 ? errors.slice(0, 5) : [],
          },
        });
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    } catch (err) {
      console.error("Error uploading voters:", err);
      return res.status(500).json({
        success: false,
        error: "Failed to upload voters.",
      });
    } finally {
      client.release();
    }
  }
);

// Approve Voter Route
router.post("/approve-voter/:voterId", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized",
    });
  }

  try {
    const { voterId } = req.params;

    const result = await pool.query(
      "UPDATE voters SET approvalStatus = true WHERE voterId = $1 RETURNING *",
      [voterId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Voter not found",
      });
    }

    res.json({
      success: true,
      message: "Voter approved successfully",
      voter: result.rows[0],
    });
  } catch (err) {
    console.error("Error approving voter:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to approve voter.",
    });
  }
});

// Replace the existing search route in your admin routes file
router.get("/search", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect("/admin/login");
  }

  const searchTerm = req.query.query || "";
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    const { rows: voters } = await pool.query(
      `SELECT * FROM voters 
       WHERE (firstName ILIKE $1 OR lastName ILIKE $1 OR voterId ILIKE $1)
       ORDER BY id DESC
       LIMIT $2 OFFSET $3`,
      [`%${searchTerm}%`, limit, offset]
    );

    const totalResult = await pool.query(
      `SELECT COUNT(*) FROM voters 
       WHERE (firstName ILIKE $1 OR lastName ILIKE $1 OR voterId ILIKE $1)`,
      [`%${searchTerm}%`]
    );
    const totalVoters = parseInt(totalResult.rows[0].count);
    const totalPages = Math.ceil(totalVoters / limit);

    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");

    res.render("admin-dashboard", {
      voters,
      currentPage: page,
      totalPages: totalPages,
      limit: limit,
      totalVoters: totalVoters,
      searchQuery: searchTerm,
      user: req.user,
      isSuperAdmin: req.user.role === "super_admin",
    });
  } catch (err) {
    console.error("Error searching voters:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to search voters.",
    });
  }
});

router.post("/demo-login", async (req, res, next) => {
  try {
    const username = process.env.DEFAULT_ADMIN_USERNAME;
    const password = process.env.DEFAULT_ADMIN_PASSWORD;

    // Set the body with correct field names
    req.body = { username, password };

    passport.authenticate("admin", (err, user, info) => {
      if (err) {
        return next(err);
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          error:
            info?.message ||
            "Demo login failed. Please check environment variables.",
        });
      }

      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }
        return res.redirect("/admin/dashboard");
      });
    })(req, res, next);
  } catch (err) {
    console.error("Error during demo login:", err);
    return res.status(500).json({
      success: false,
      error: "Demo login failed.",
    });
  }
});

// Admin Logout Route
router.get("/logout-admin", (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.redirect("/admin/login");
    }
    res.redirect("/admin/login");
  });
});

module.exports = router;
