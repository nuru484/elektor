const express = require("express");
const router = express.Router();
const passport = require("passport");
const pool = require("../db/pool");
const multer = require("multer");
const bcrypt = require("bcrypt");
const { parseVotersBuffer } = require("../config/excel-parser");
const { ensureDemoAdmin } = require("../db/db-setup");
const {
  requireAdmin,
  requireSuperAdmin,
  blockDemoWrites,
} = require("../config/auth-middleware");
const { loginLimiter, writeLimiter } = require("../config/rate-limiters");

const demoEnabled = process.env.DEMO_MODE === "true";
const {
  addAdminValidators,
  addVoterValidators,
  addCandidateValidators,
} = require("../config/validators");

// Only accept image uploads for candidate photos.
const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) return cb(null, true);
    cb(new Error("Only image files are allowed for candidate photos."));
  },
});

// Only accept spreadsheets for the voter bulk upload.
const uploadSpreadsheet = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error("Only .xlsx or .xls files are allowed."));
  },
});

// Runs a multer upload and returns its errors (oversized/wrong type) as a
// clean JSON 400, since the upload forms consume JSON.
function runUpload(uploader) {
  return (req, res, next) => {
    uploader(req, res, (err) => {
      if (!err) return next();

      let message = "File upload failed.";
      if (err instanceof multer.MulterError) {
        message =
          err.code === "LIMIT_FILE_SIZE"
            ? "File is too large."
            : "File upload error.";
      } else if (err.message) {
        message = err.message;
      }
      return res.status(400).json({ success: false, error: message });
    });
  };
}

// Rolls back without letting a failing ROLLBACK mask the original error or
// crash the process.
async function safeRollback(client) {
  try {
    await client.query("ROLLBACK");
  } catch (rollbackErr) {
    console.error("Rollback failed:", rollbackErr);
  }
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
  res.render("admin-login", { errors: [], demoEnabled });
});

router.post("/login", loginLimiter, (req, res, next) => {
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
        demoEnabled,
      });
    }

    req.logIn(user, (err) => {
      if (err) {
        return next(err);
      }
      return res.redirect("/admin/dashboard");
    });
  })(req, res, next);
});

// One-click demo login (portfolio only, gated by DEMO_MODE). Logs into a
// dedicated, read-only demo-admin account - never the real super admin - and
// needs no password. Destructive actions are blocked by blockDemoWrites.
router.post("/demo-login", loginLimiter, async (req, res, next) => {
  if (!demoEnabled) {
    return res.status(404).send("Not found");
  }

  try {
    const demo = await ensureDemoAdmin();
    if (!demo) {
      return res.status(503).json({
        success: false,
        error: "Demo account is not available right now.",
      });
    }

    const user = {
      id: demo.id,
      type: "admin",
      role: demo.role,
      firstName: demo.firstname,
      lastName: demo.lastname,
      userName: demo.username,
    };

    req.logIn(user, (err) => {
      if (err) {
        return next(err);
      }
      return res.redirect("/admin/dashboard");
    });
  } catch (err) {
    return next(err);
  }
});

// Admin Dashboard Route
router.get("/dashboard", requireAdmin, async (req, res) => {
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

    res.render("admin-dashboard", {
      voters: result.rows,
      currentPage: page,
      totalPages: totalPages,
      limit: limit,
      totalVoters: totalVoters,
      searchQuery: "",
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
});

// Form Routes
router.get("/add-voter-form", requireSuperAdmin, (req, res) => {
  res.render("add-voter-form");
});

router.get("/add-candidate-form", requireAdmin, (req, res) => {
  res.render("add-candidate-form");
});

router.get("/upload-voters-form", requireSuperAdmin, (req, res) => {
  res.render("upload-voters-form");
});

router.get("/add-admin-form", requireSuperAdmin, (req, res) => {
  res.render("add-admin-form");
});

// Add Admin (Super Admin Only)
router.post(
  "/add-admin",
  requireSuperAdmin,
  blockDemoWrites,
  writeLimiter,
  addAdminValidators,
  async (req, res) => {
    try {
      const { firstName, lastName, userName, password, phone, role } = req.body;

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
  }
);

// Add Single Voter (Super Admin Only)
router.post(
  "/add-voter",
  requireSuperAdmin,
  blockDemoWrites,
  writeLimiter,
  addVoterValidators,
  async (req, res) => {
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
        await safeRollback(client);
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
      await safeRollback(client);
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
  }
);

// Add Single Candidate (Admins)
router.post(
  "/add-candidate",
  requireAdmin,
  blockDemoWrites,
  writeLimiter,
  runUpload(uploadImage.single("profilePhoto")),
  addCandidateValidators,
  async (req, res) => {
    try {
      const { firstName, lastName, position } = req.body;

      // Store as a data URI so <img src> renders it (raw base64 alone doesn't).
      let profilePhoto = null;
      if (req.file) {
        const mime = req.file.mimetype || "image/jpeg";
        profilePhoto = `data:${mime};base64,${req.file.buffer.toString(
          "base64"
        )}`;
      }

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
  requireSuperAdmin,
  blockDemoWrites,
  writeLimiter,
  runUpload(uploadSpreadsheet.single("votersFile")),
  async (req, res) => {
    const client = await pool.connect();

    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No file uploaded.",
        });
      }

      // A corrupt/unreadable file is a client error (400), not a server fault.
      let voters;
      try {
        voters = await parseVotersBuffer(req.file.buffer);
      } catch (parseErr) {
        console.error("Error parsing voters file:", parseErr);
        return res.status(400).json({
          success: false,
          error: "Could not read the Excel file. Please check the format.",
        });
      }

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
                String(voter.firstName).trim(),
                String(voter.lastName).trim(),
                String(voter.voterId).trim(),
                voter.phone_number ? String(voter.phone_number).trim() : null,
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
        await safeRollback(client);
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
router.post(
  "/approve-voter/:voterId",
  requireAdmin,
  blockDemoWrites,
  writeLimiter,
  async (req, res) => {
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
  }
);

router.get("/search", requireAdmin, async (req, res) => {
  const searchTerm = req.query.query || "";
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    const searchWords = searchTerm
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0);

    let query;
    let countQuery;
    let queryParams;
    let countParams;

    if (searchWords.length === 0) {
      query = `SELECT * FROM voters ORDER BY id DESC LIMIT $1 OFFSET $2`;
      queryParams = [limit, offset];

      countQuery = `SELECT COUNT(*) FROM voters`;
      countParams = [];
    } else if (searchWords.length === 1) {
      query = `SELECT * FROM voters
               WHERE (firstName ILIKE $1 OR lastName ILIKE $1 OR voterId ILIKE $1)
               ORDER BY id DESC
               LIMIT $2 OFFSET $3`;
      queryParams = [`%${searchWords[0]}%`, limit, offset];

      countQuery = `SELECT COUNT(*) FROM voters
                    WHERE (firstName ILIKE $1 OR lastName ILIKE $1 OR voterId ILIKE $1)`;
      countParams = [`%${searchWords[0]}%`];
    } else {
      const fullNamePattern = `%${searchTerm}%`;
      const wordPatterns = searchWords.map((word) => `%${word}%`);

      const wordConditions = wordPatterns
        .map(
          (_, index) =>
            `(firstName ILIKE $${index + 1} OR lastName ILIKE $${index + 1})`
        )
        .join(" AND ");

      query = `SELECT * FROM voters
               WHERE (
                 CONCAT(firstName, ' ', lastName) ILIKE $${
                   wordPatterns.length + 1
                 }
                 OR ${wordConditions}
                 OR voterId ILIKE $${wordPatterns.length + 1}
               )
               ORDER BY id DESC
               LIMIT $${wordPatterns.length + 2} OFFSET $${
        wordPatterns.length + 3
      }`;
      queryParams = [...wordPatterns, fullNamePattern, limit, offset];

      countQuery = `SELECT COUNT(*) FROM voters
                    WHERE (
                      CONCAT(firstName, ' ', lastName) ILIKE $${
                        wordPatterns.length + 1
                      }
                      OR ${wordConditions}
                      OR voterId ILIKE $${wordPatterns.length + 1}
                    )`;
      countParams = [...wordPatterns, fullNamePattern];
    }

    const { rows: voters } = await pool.query(query, queryParams);
    const totalResult = await pool.query(countQuery, countParams);
    const totalVoters = parseInt(totalResult.rows[0].count);
    const totalPages = Math.ceil(totalVoters / limit);

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
