const express = require("express");
const session = require("express-session");
const passport = require("passport");
const ejs = require("ejs");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const initializePassport = require("./config/passport-config");

const app = express();
app.set("trust proxy", 1);
const server = http.createServer(app);
const io = new Server(server);

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "bXV5IWeCm_jbXITJCm_jbXV2W6XDb2@B9s",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

// Passport initialization
initializePassport(passport);
app.use(passport.initialize());
app.use(passport.session());

// View engine setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

// Cache control middleware
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  next();
});

// Routes
app.use("/", require("./routes/index"));
app.use("/admin", require("./routes/admin-routes"));
app.use("/voter", require("./routes/voter-routes"));
app.use("/votes", require("./routes/votes-routes")(io));
app.use("/results", require("./routes/results-routes"));

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something went wrong!");
});

// Start server
const port = process.env.PORT || 3000;

server.listen(port, () => {
  console.log(`✓ Server running on port ${port}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
});
