import Post from "../schemas/postSchema.js";
import slugify from "slugify";

export const getPosts = async (req, res) => {
    try {
        const posts = await Post.find().populate("userId", "userName").sort({ createdAt: -1 }).limit(20);
        res.status(200).json({ data: posts });
    } catch (error) {
        console.error("Lỗi khi lấy các bài viết: ", error);
        res.status(400).json({ message: "Lỗi server" });
    }
};

export const searchPosts = async (req, res) => {
    try {
        const keyword = req.query.q;

        let searchQuery = {};

        if (keyword) {
            searchQuery = {
                $or: [
                    { title: { $regex: keyword, $option: 'i' } },
                    { content: { $regex: keyword, $option: 'i' } }
                ]
            }
        }
        const posts = await Post.find().populate("userId", "userName").sort({ createdAt: -1 });

        res.status(200).json({ data: posts });
    } catch (error) {
        console.error("Lỗi khi tìm bài viết: ", error);
        res.status(500).json({ message: "Lỗi server!" });
    }
};

export const getPostById = async (req, res) => {
    try {
        const id = req.params.id;

        const post = await Post.findById(id).populate("userId", "userName");

        if (!post) return res.status(404).json({ message: "Khong tim thay bai viet" });

        res.status(200).json({ data: post });
    } catch (error) {
        console.error("Lỗi khi lấy bài viết: ", error);
        res.status(500).json({ message: "Lỗi server!" });
    }
}

export const createPost = async (req, res) => {
    try {
        const { title, content, tags } = req.body;
        const userId = req.user.id;

        if (!title || !content) {
            return res.status(400).json({ message: "Vui lòng điền đầy đủ tiêu đề và nội dung" });
        }

        const slug = slugify(title, { lower: true, strict: true, locale: 'vi' });

        const newPost = new Post({
            title: title,
            content: content,
            slug: slug,
            userId: userId,
            tags: tags
        });

        await newPost.save();

        res.status(201).json({
            message: "Tạo bài viết thành công",
            data: newPost
        });

    } catch (error) {
        console.error("Lỗi khi tạo bài viết: ", error);
        if (error.code === 11000) {
            return res.status(400).json({ message: "Tiêu đề này đã tồn tại, vui lòng chọn tiêu đề khác!" });
        }
        res.status(500).json({ message: "Lỗi server!" });
    }
};


export const updatePost = async (req, res) => {
    try {
        const id = req.params.id;
        const userId = req.user.id;
        const userRole = req.user.role;

        const { title, content, tags } = req.body;

        const post = await Post.findById(id);

        if (!post) return res.status(404).json({ message: "Khong tim thay bai viet" });

        if (!post.userId.equals(userId) && userRole !== "admin")
            return res.status(403).json({ message: "Khong co quyen sua bai viet nay" });

        if (title) {
            post.title = title;
            post.slug = slugify(title, { lower: true, strict: true, locale: 'vi' });
        }

        if (content) post.content = content;

        if (tags) post.tags = tags;

        await post.save();

        res.status(200).json({
            message: "Sua bai viet thanh cong",
            data: post
        });
    }
    catch (error) {
        console.error("Lỗi khi sửa bài viết: ", error);
        if (error.code === 11000) {
            return res.status(400).json({ message: "Tiêu đề này đã bị trùng với một bài viết khác!" });
        }
        res.status(500).json({ message: "Lỗi server!" });
    }
}

export const deletePostById = async (req, res) => {
    try {
        const id = req.params.id;
        const userId = req.user.id;
        const userRole = req.user.role;

        const post = await Post.findById(id);

        if (!post) return res.status(404).json({message: "Khong tim thay bai viet"});

        if (!post.userId.equals(userId) && userRole !== "admin")
            return res.status(403).json({message: "Khong co quyen xoa bai viet nay"});

        await Post.findByIdAndDelete(id);

        await Comment.deleteMany({ postId: id });

        res.status(200).json({ message: "Xóa bài viết thành công!" });
    }
    catch (error) {
        console.error("Lỗi khi xóa bài viết: ", error);
        res.status(500).json({ message: "Lỗi server!" });
    }
};