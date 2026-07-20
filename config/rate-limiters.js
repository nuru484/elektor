const rateLimit = require("express-rate-limit");

// Throttle credential-guessing on the login endpoints. Voter IDs in
// particular are short and sometimes sequential, so without this an attacker
// could brute-force the voter roll. Applied to the POST login handlers only.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many login attempts. Please try again in a few minutes.",
  },
});

// A gentler ceiling for the rest of the write surface (adding voters/admins,
// approvals, uploads) to blunt automated abuse without getting in a real
// admin's way.
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many requests. Please slow down." },
});

module.exports = { loginLimiter, writeLimiter };
