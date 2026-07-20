const express = require("express");
const router = express.Router();

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
    res.redirect("/voter/login");
  });
});

module.exports = router;
