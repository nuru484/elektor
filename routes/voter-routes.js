// routes/voter-routes.js
const express = require("express");
const router = express.Router();
const pool = require("../db/pool");
const passport = require("passport");
const axios = require("axios");

// Route for rendering voter login page
router.get("/login", (req, res) => {
  const errors = req.session.errors || [];
  req.session.errors = [];

  res.render("voter-login", { user: req.user, errors });
});

// Route for voter login post
router.post("/login", (req, res, next) => {
  passport.authenticate("custom", (err, user, info) => {
    if (err) {
      return next(err);
    }

    if (!user) {
      const errors = [];
      if (info.message.includes("Incorrect")) {
        errors.push({
          field: "voterId",
          message: "Incorrect voter ID",
          sound: true,
        });
      }

      if (info.message.includes("not approved")) {
        errors.push({
          field: "approvalStatus",
          message: "You are not approved to vote, please contact admin",
          sound: true,
        });
      }

      if (info.message.includes("already voted")) {
        errors.push({
          field: "voteStatus",
          message:
            "You have already voted, you cannot access voting portal again",
          sound: true,
        });
      }

      return res.render("voter-login", { errors });
    }

    req.logIn(user, (err) => {
      if (err) {
        return next(err);
      }
      return res.redirect("/votes/cast-votes");
    });
  })(req, res, next);
});

module.exports = router;
