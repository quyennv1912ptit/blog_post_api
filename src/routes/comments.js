import express from "express";
import verifyToken from "../middlewares/auth.js";
import { deleteCommentById } from "../controllers/commentController.js";

const router = express.Router();

router.delete("/:id", verifyToken, deleteCommentById);

export default router;