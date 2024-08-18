const LocalStrategy = require('passport-local').Strategy;
const pool = require('../db/pool');

const initialize = (passport) => {
  // Student authentication
  passport.use(
    'student',
    new LocalStrategy(async (username, password, done) => {
      try {
        // Query for the student with the given index number and name
        const { rows } = await pool.query(
          'SELECT * FROM students WHERE "student_name" = $1 AND "index_number" = $2;',
          [username, password]
        );
        const user = rows[0];
        if (!user) {
          return done(null, false, { message: 'Invalid index number or name' });
        }

        if (user.index_number !== password) {
          return done(null, false, { message: 'Incorrect password' });
        }

        if (user.voted === true) {
          return done(null, false, { message: 'Student has voted already' });
        }

        if (user.status === true) {
          return done(null, {
            id: user.id,
            type: 'student',
            voted: user.voted,
          });
        } else {
          return done(null, false, {
            message: 'Student account not approved by admin',
          });
        }
      } catch (err) {
        return done(err, false, {
          message: 'An error occurred during authentication',
        });
      }
    })
  );

  // Admin authentication
  passport.use(
    'admin',
    new LocalStrategy(async (username, password, done) => {
      try {
        // Query for the admin with the given name
        const { rows } = await pool.query(
          'SELECT * FROM admin WHERE name = $1;',
          [username]
        );
        const admin = rows[0];
        if (!admin) {
          return done(null, false, {
            message: 'No admin found with that name',
          });
        }

        // Check password (assuming it's in plain text for this example)
        if (admin.password === password) {
          return done(null, { id: admin.id, type: 'admin' });
        } else {
          return done(null, false, { message: 'Incorrect password' });
        }
      } catch (err) {
        return done(err, false, {
          message: 'An error occurred during authentication',
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

      // Check user type stored in sessionData
      if (sessionData.type === 'student') {
        const { rows } = await pool.query(
          'SELECT * FROM students WHERE id = $1;',
          [sessionData.id]
        );
        user = rows[0];
      } else if (sessionData.type === 'admin') {
        const { rows } = await pool.query(
          'SELECT * FROM admin WHERE id = $1;',
          [sessionData.id]
        );
        user = rows[0];
      }

      if (!user) {
        return done(null, false, { message: 'User not found' });
      } else {
        return done(null, user);
      }
    } catch (err) {
      return done(err, false, {
        message: 'An error occurred during user deserialization',
      });
    }
  });
};

module.exports = initialize;
