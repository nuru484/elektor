const { body, validationResult } = require("express-validator");

// Collects express-validator results and returns a 400 with a flat error list
// for the JSON (fetch-based) endpoints. Keeps controllers free of validation
// boilerplate.
function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }
  return res.status(400).json({
    success: false,
    error: errors.array()[0].msg,
    errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
  });
}

const addAdminValidators = [
  body("firstName").trim().notEmpty().withMessage("First name is required.").isLength({ max: 255 }),
  body("lastName").trim().notEmpty().withMessage("Last name is required.").isLength({ max: 255 }),
  body("userName")
    .trim()
    .notEmpty()
    .withMessage("Username is required.")
    .isLength({ min: 3, max: 255 })
    .withMessage("Username must be at least 3 characters."),
  body("password")
    .isString()
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters."),
  body("role").isIn(["admin", "super_admin"]).withMessage("Invalid role specified."),
  body("phone").optional({ checkFalsy: true }).trim().isLength({ max: 15 }),
  handleValidation,
];

const addVoterValidators = [
  body("firstName").trim().notEmpty().withMessage("First name is required.").isLength({ max: 255 }),
  body("lastName").trim().notEmpty().withMessage("Last name is required.").isLength({ max: 255 }),
  body("voterId")
    .trim()
    .notEmpty()
    .withMessage("Voter ID is required.")
    .isLength({ max: 50 })
    .withMessage("Voter ID is too long."),
  body("phone_number").optional({ checkFalsy: true }).trim().isLength({ max: 15 }),
  handleValidation,
];

const addCandidateValidators = [
  body("firstName").trim().notEmpty().withMessage("First name is required.").isLength({ max: 255 }),
  body("lastName").trim().notEmpty().withMessage("Last name is required.").isLength({ max: 255 }),
  body("position")
    .trim()
    .notEmpty()
    .withMessage("Position is required.")
    .isLength({ max: 255 })
    .withMessage("Position is too long."),
  handleValidation,
];

module.exports = {
  handleValidation,
  addAdminValidators,
  addVoterValidators,
  addCandidateValidators,
};
