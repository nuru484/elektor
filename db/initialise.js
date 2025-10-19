// db/initialise.js
const { setupDatabase } = require("./db-setup");

console.log("=".repeat(50));
console.log("DATABASE SETUP SCRIPT");
console.log("=".repeat(50));

setupDatabase()
  .then(() => {
    console.log("\n✓ Initialisation completed successfully!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n✗ Setup failed:", err.message);
    process.exit(1);
  });
