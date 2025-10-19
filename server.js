const express = require("express");
require("dotenv").config();
const session = require("express-session");
const passport = require("passport");
const ejs = require("ejs");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const initializePassport = require("./config/passport-config");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(
  session({
    secret: "ORACLE1995@B9s",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  })
);

initializePassport(passport);
app.use(passport.initialize());
app.use(passport.session());

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

// Routers
app.use("/", require("./routes/index"));
app.use("/admin", require("./routes/adminRoutes"));
app.use("/user", require("./routes/userRoutes"));
app.use("/userVote", require("./routes/votesRoutes")(io));
app.use("/results", require("./routes/resultsRoute"));

app.use((req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  next();
});

io.on("connection", (socket) => {
  console.log("A user connected");
  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});

(async () => {
  const {
    initializeDatabase,
    updateDatabaseFromExcel,
  } = require("./db/populatedb");
  try {
    console.log("Initializing the database...");
    await initializeDatabase();
    await updateDatabaseFromExcel();
    console.log("Database initialized successfully.");

    const port = process.env.PORT || 3000;
    server.listen(port, () => console.log(`App listening on port ${port}`));
  } catch (error) {
    console.error("Failed to initialize the database:", error);
    process.exit(1);
  }
})();
