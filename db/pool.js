const { Pool } = require("pg");

// SSL handling is configurable instead of unconditionally disabling
// certificate validation (which is vulnerable to MITM):
//   DATABASE_SSL=disable            -> no SSL (local Postgres)
//   DATABASE_SSL_REJECT_UNAUTHORIZED=false -> SSL on, skip cert validation
//                                             (some managed hosts with
//                                              self-signed chains, e.g. Render)
//   default                         -> SSL on with full certificate validation
function buildSslConfig() {
  if (process.env.DATABASE_SSL === "disable") {
    return false;
  }
  return {
    rejectUnauthorized:
      process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false",
  };
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: buildSslConfig(),
});

module.exports = pool;
module.exports.buildSslConfig = buildSslConfig;
