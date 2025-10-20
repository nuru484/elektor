const LocalStrategy = require("passport-local").Strategy;
const CustomStrategy = require("passport-custom").Strategy;
const bcrypt = require("bcrypt");
const pool = require("../db/pool");

const initialize = (passport) => {
  passport.use(
    "custom",
    new CustomStrategy(async (req, done) => {
      const { voterId } = req.body;

      try {
        const { rows } = await pool.query(
          'SELECT * FROM voters WHERE "voterid" = $1;',
          [voterId]
        );
        const user = rows[0];

        if (!user) {
          return done(null, false, {
            message: "Incorrect voter ID",
          });
        }

        if (user.approvalstatus !== true) {
          return done(null, false, {
            message: "You are not approved to vote, contact admin",
          });
        }

        if (user.votestatus === true) {
          return done(null, false, { message: "Voter has already voted" });
        }

        return done(null, {
          id: user.id,
          type: "voter",
          voteStatus: user.votestatus,
        });
      } catch (err) {
        return done(err, false, {
          message: "An error occurred during authentication",
        });
      }
    })
  );

  // Admin authentication
  passport.use(
    "admin",
    new LocalStrategy(async (username, password, done) => {
      try {
        const { rows } = await pool.query(
          "SELECT * FROM admin WHERE username = $1;",
          [username]
        );
        const admin = rows[0];

        if (!admin) {
          return done(null, false, {
            message: "Invalid credentials",
          });
        }

        const isPasswordValid = await bcrypt.compare(password, admin.password);

        if (isPasswordValid) {
          return done(null, {
            id: admin.id,
            type: "admin",
            role: admin.role,
            firstName: admin.firstname,
            lastName: admin.lastname,
            userName: admin.username,
          });
        } else {
          return done(null, false, { message: "Invalid credentials" });
        }
      } catch (err) {
        return done(err, false, {
          message: "An error occurred during authentication",
        });
      }
    })
  );

  // Serialize user
  passport.serializeUser((user, done) => {
    done(null, { id: user.id, type: user.type });
  });

  // Deserialize user
  passport.deserializeUser(async (sessionData, done) => {
    try {
      let user;

      if (sessionData.type === "voter") {
        const { rows } = await pool.query(
          "SELECT * FROM voters WHERE id = $1;",
          [sessionData.id]
        );
        user = rows[0];
        if (user) {
          user.type = "voter";
        }
      } else if (sessionData.type === "admin") {
        const { rows } = await pool.query(
          "SELECT * FROM admin WHERE id = $1;",
          [sessionData.id]
        );
        user = rows[0];
        if (user) {
          user.type = "admin";
          user.firstName = user.firstname;
          user.lastName = user.lastname;
          user.userName = user.username;
        }
      }

      if (!user) {
        return done(null, false, { message: "User not found" });
      } else {
        return done(null, user);
      }
    } catch (err) {
      return done(err, false, {
        message: "An error occurred during user deserialization",
      });
    }
  });
};

module.exports = initialize;
