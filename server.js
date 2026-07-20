const express = require("express");
const session = require("express-session");
const passport = require("passport");
const helmet = require("helmet");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const initializePassport = require("./config/passport-config");

// Fail fast on missing secrets rather than silently falling back to a value
// committed in the repo (which would make every session forgeable).
if (!process.env.SESSION_SECRET) {
  console.error(
    "✗ SESSION_SECRET is not set. Refusing to start with an insecure default."
  );
  process.exit(1);
}

const app = express();
app.set("trust proxy", 1);
const server = http.createServer(app);
const io = new Server(server);

// Security headers. CSP allows inline scripts + the Tailwind CDN (which the UI
// depends on) but still locks down sources, object/base-uri, and frame-ancestors.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          "https://cdn.tailwindcss.com",
        ],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "ws:", "wss:"],
        mediaSrc: ["'self'"],
        fontSrc: ["'self'", "https:", "data:"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET,
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

// 404 handler: JSON for fetch callers, styled page for browsers.
app.use((req, res) => {
  if (req.accepts("html")) {
    return res.status(404).render("error", {
      status: 404,
      message: "The page you are looking for does not exist.",
    });
  }
  return res.status(404).json({ success: false, error: "Not found." });
});

// Central error handler: no stack traces to the client; JSON for API/fetch,
// a rendered page for browsers.
app.use((err, req, res, next) => {
  console.error(err.stack || err);

  if (res.headersSent) {
    return next(err);
  }

  const status = err.status || err.statusCode || 500;
  const message =
    status < 500
      ? err.message || "Bad request."
      : "Something went wrong on our end. Please try again.";

  if (req.accepts("html") && !req.xhr) {
    return res.status(status).render("error", { status, message });
  }
  return res.status(status).json({ success: false, error: message });
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
