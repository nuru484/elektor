const express = require("express");
const router = express.Router();
const passport = require("passport");
const pool = require("../db/pool");

// Route for rendering the index page
router.get("/", (req, res) => {
  res.render("index");
});



// Route for logging out
router.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.redirect("/");
    }
    res.redirect("/voterLogin");
  });
});

module.exports = router;
