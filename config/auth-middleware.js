// Auth guards. Passport puts either an "admin" (role admin/super_admin) or a
// "voter" on the session; admin routes must use requireAdmin/requireSuperAdmin
// so a voter session can't reach them.

function requireAuth(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  if (req.accepts("html")) {
    return res.redirect("/admin/login");
  }
  return res.status(401).json({ success: false, error: "Unauthorized. Please login." });
}

function requireAdmin(req, res, next) {
  if (
    req.isAuthenticated() &&
    req.user.type === "admin" &&
    (req.user.role === "admin" || req.user.role === "super_admin")
  ) {
    return next();
  }
  if (req.accepts("html")) {
    return res.redirect("/admin/login");
  }
  return res.status(403).json({ success: false, error: "Access denied. Admins only." });
}

function requireSuperAdmin(req, res, next) {
  if (
    req.isAuthenticated() &&
    req.user.type === "admin" &&
    req.user.role === "super_admin"
  ) {
    return next();
  }
  if (req.accepts("html")) {
    return res.redirect("/admin/login");
  }
  return res.status(403).json({ success: false, error: "Access denied. Super admin only." });
}

function requireVoter(req, res, next) {
  if (req.isAuthenticated() && req.user.type === "voter") {
    return next();
  }
  return res.redirect("/voter/login");
}

// The demo-admin account is read-only: it can view everything but its
// destructive submissions are blocked, matched by username so the restriction
// holds however the session was created.
function demoUsername() {
  return process.env.DEMO_ADMIN_USERNAME || "demo-admin";
}

function isDemoAdmin(user) {
  if (!user || user.type !== "admin") return false;
  const name = demoUsername();
  return user.userName === name || user.username === name;
}

function blockDemoWrites(req, res, next) {
  if (isDemoAdmin(req.user)) {
    return res.status(403).json({
      success: false,
      error:
        "This action is disabled in the live demo. Clone the repo to run it with full access.",
    });
  }
  return next();
}

module.exports = {
  requireAuth,
  requireAdmin,
  requireSuperAdmin,
  requireVoter,
  demoUsername,
  isDemoAdmin,
  blockDemoWrites,
};
