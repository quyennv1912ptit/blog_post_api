import express from "express";
import verifyToken from "../middlewares/auth.js";
import { getUserById, updateUserById } from "../controllers/userController.js";

const router = express.Router();

router.get("/:id", verifyToken, getUserById);
router.put("/:id", verifyToken, updateUserById);

export default router;