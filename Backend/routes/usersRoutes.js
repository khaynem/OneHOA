const express = require("express");
const {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
} = require("../controllers/usersController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);
router.use(authMiddleware.requireRole("admin"));

router.get("/", listUsers);
router.post("/", createUser);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

module.exports = router;
