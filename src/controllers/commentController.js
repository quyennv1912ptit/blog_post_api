import Comment from "../schemas/commentSchema.js";

export const deleteCommentById = async (req, res) => {
    try {
        const id = req.params.id;
        const userId = req.user.id;
        const userRole = req.user.role;

        const comment = await Comment.findById(id);

        if (!comment) return res.status(404).json({ message: "Khong tim thay comment" });

        if (!comment.userId.equals(userId) && userRole !== "admin") return res.status(403).json({ message: "Khong co quyen xoa binh luan nay" });

        await Comment.findByIdAndDelete(id)

        res.status(200).json({ message: "Xoa binh luan thanh cong" });
    } catch (error) {
        console.error("Lỗi khi xóa bình luận: ", error);
        res.status(500).json({ message: "Lỗi server" });
    }
};

export const getPostCommentsById = async (req, res) => {
    try {
        const postId = req.params.id;

        const post = await Post.findById(postId);
        if (!post)  return res.status(404).json({ message: "Không tìm thấy bài viết!" });
        
        const comments = await Comment.find({postId: postId}).populate("userId", "userName").sort({createdAt: -1});

        res.status(200).json({ data: comments });
    } catch (error) {
        console.error("Lỗi khi Lấy bình luận bài viết: ", error);
        res.status(500).json({ message: "Lỗi server!" });
    }
};

export const createComment = async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.user.id;

        const { content } = req.body;

        const post = await Post.findById(postId);

        if (!post) return res.status(404).json({message: "Bai viet khong ton tai"});

        const newComment = new Comment({
            postId: postId,
            userId: userId,
            content: content
        });

        await newComment.save();

        res.status(200).json({ message: "Gửi bình luận thành công", data: newComment});
    } catch (error) {
        console.error("Lỗi khi gửi bình luận: ", error);
        res.status(500).json({ message: "Lỗi server!" });
    }
};