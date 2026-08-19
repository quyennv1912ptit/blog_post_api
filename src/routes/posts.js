import express from "express";
import verifyToken from "../middlewares/auth.js";
import { createPost, getPostById, getPosts, searchPosts, updatePost, deletePostById } from "../controllers/postController.js";
import { createComment, getPostCommentsById } from "../controllers/commentController.js";

const router = express.Router();

router.get("/", getPosts);
router.get("/search", searchPosts);
router.get("/:id", getPostById);
router.post("/", verifyToken, createPost);
router.put("/:id", verifyToken, updatePost);
router.delete("/:id", verifyToken, deletePostById);
router.get("/:id/comments", getPostCommentsById);
router.post("/:id/comments", verifyToken, createComment);

export default router;