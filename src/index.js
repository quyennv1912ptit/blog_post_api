import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { generateSlug } from "./utils/helpers.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

const hashPassword = async (plainPassword) => {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(plainPassword, salt);
    return hashedPassword;
}

app.post('/register', async (req, res) => {
    try {
        const { userName, password, email, phoneNumber } = req.body;
        if (!userName || !password || !email) {
            return res.status(400).json({ message: "Vui lòng điền đầy đủ thông tin bắt buộc!" });
        }
        const hashedPassword = await hashPassword(password);
        const sql = `INSERT INTO user_accounts (user_name, password, email, phone_number) VALUES (?, ?, ?, ?)`;
        const values = [userName, hashedPassword, email, phoneNumber];
        await pool.execute(sql, values);
        res.status(201).json({ message: "Đăng ký tài khoản thành công!" });
    } catch (error) {
        console.error("Lỗi khi đăng ký: ", error);
        if (error.code === 'ER_DUP_ENTRY') {
            const sqlMessage = error.sqlMessage || "";
            if (sqlMessage.includes('user_name')) {
                return res.status(400).json({ message: "Tên đăng nhập này đã được sử dụng!" });
            }
            if (sqlMessage.includes('email')) {
                return res.status(400).json({ message: "Email này đã được đăng ký!" });
            }
            if (sqlMessage.includes('phone_number')) {
                return res.status(400).json({ message: "Số điện thoại này đã được sử dụng!" });
            }
        }
        res.status(500).json({ message: "Lỗi server!" });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { userName, password } = req.body;
        const sql = `SELECT * FROM user_accounts WHERE user_name = ?`;
        const values = [userName];
        const [rows] = await pool.execute(sql, values);
        if (rows.length === 0) return res.status(400).json({ message: "Tên đăng nhập không tồn tại!" });
        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Mật khẩu không đúng!" });

        const payload = {
            id: user.id,
            userName: user.user_name,
            role: user.role,
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1d" });

        res.status(200).json({
            message: "Đăng nhập thành công",
            token: token,
            user: payload
        });
    } catch (error) {
        console.error("Lỗi khi đăng nhập: ", error);
        res.status(500).json({ message: "Lỗi server" });
    }
});

export const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: "Không tìm thấy token. Vui lòng đăng nhập" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ message: "Token không hợp lệ hoặc đã hết hạn" });
    }
};

app.get("/posts", async (req, res) => {
    try {
        const sql = "SELECT * FROM posts";
        const [rows] = await pool.query(sql);
        res.status(200).json({ data: rows });
    } catch (error) {
        console.error("Lỗi khi lấy các bài viết: ", error);
        res.status(400).json({ message: "Lỗi server" });
    }
});

app.get("/posts/:slug", async (req, res) => {
    try {
        const postSlug = req.params.slug;
        const [rows] = await pool.execute(
            `SELECT * FROM posts WHERE slug = ? LIMIT 1`,
            [postSlug]
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy bài viết!" });
        }

        res.status(200).json({ data: rows[0] });
    } catch (error) {
        console.error("Lỗi khi lấy bài viết: ", error);
        res.status(500).json({ message: "Lỗi server!" });
    }
});

app.post("/posts", verifyToken, async (req, res) => {
    try {
        const { title, body } = req.body;
        const userId = req.user.id;

        if (!title || !body) {
            return res.status(400).json({ message: "Vui lòng điền đầy đủ tiêu đề và nội dung" });
        }

        const slug = generateSlug(title);

        const sql = "INSERT INTO posts (title, slug, body, user_id) VALUES (?, ?, ?, ?)";
        const values = [title, slug, body, userId];

        const [result] = await pool.execute(sql, values);

        res.status(200).json({
            message: "Tạo bài viết thành công",
            postID: result.insertId,
            slug: slug,
        });

    } catch (error) {
        console.error("Lỗi khi tạo bài viết: ", error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: "Tiêu đề này đã tồn tại, vui lòng chọn tiêu đề khác!" });
        }
        res.status(500).json({ message: "Lỗi server!" });
    }
}
);

app.put("/posts/:slug", verifyToken, async (req, res) => {
    try {
        const slug = req.params.slug;
        const { title, body } = req.body;
        const userId = req.user.id;
        const userRole = req.user.role;
        if (!title || !body) {
            return res.status(400).json({ message: "Vui lòng điền đầy đủ tiêu đề và nội dung" });
        }
        const [rows] = await pool.execute("SELECT * FROM posts WHERE slug=?", [slug]);
        if (rows.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy bài viết!" });
        }
        const post = rows[0];
        if (post.user_id !== userId && userRole !== "admin") {
            return res.status(403).json({ message: "Bạn không có quyền sửa bài viết này" });
        }
        const newTitle = title || post.title;
        const newBody = body || post.body;
        const newSlug = title ? generateSlug(title) : post.slug;

        const sql = `UPDATE posts SET title = ?, slug = ?, body = ? WHERE id = ?`;
        await pool.execute(sql, [newTitle, newSlug, newBody, post.id]);

        res.status(200).json({
            message: "Cập nhật bài viết thành công!",
            postId: post.id,
            slug: newSlug
        });
    }
    catch (error) {
        console.error("Lỗi khi sửa bài viết: ", error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: "Tiêu đề này đã bị trùng với một bài viết khác!" });
        }
        res.status(500).json({ message: "Lỗi server!" });
    }
});

app.delete("/posts/:slug", verifyToken, async (req, res) => {
    try {
        const slug = req.params.slug;
        const userId = req.user.id;
        const userRole = req.user.role;
        const [rows] = await pool.execute("SELECT * FROM posts WHERE slug=?", [slug]);
        if (rows.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy bài viết!" });
        }
        const post = rows[0];
        if (post.user_id !== userId && userRole != "admin") {
            return res.status(403).json({ message: "Bạn không có quyền xóa bài viết này" });
        }
        const sql = `DELETE FROM posts WHERE id = ?`;
        await pool.execute(sql, [post.id]);

        res.status(200).json({ message: "Xóa bài viết thành công!" });
    }
    catch (error) {
        console.error("Lỗi khi xóa bài viết: ", error);
        res.status(500).json({ message: "Lỗi server!" });
    }
});

app.get("/posts/:slug/comments", async (req, res) => {
    try {
        const slug = req.params.slug;
        
        const [postRows] = await pool.execute("SELECT * FROM posts WHERE slug=?", [slug]);
        if (postRows.length === 0) return res.status(404).json({ message: "Không tìm thấy bài viết" });
        const post = postRows[0];
        
        const sql = `
            SELECT comments.*, user_accounts.user_name 
            FROM comments 
            INNER JOIN user_accounts ON comments.user_id = user_accounts.id 
            WHERE comments.post_id = ?
            ORDER BY comments.id DESC
        `;
        const [commentRows] = await pool.execute(sql, [post.id]);
        
        res.status(200).json({ data: commentRows });
    } catch (error) {
        console.error("Lỗi khi Lấy bình luận bài viết: ", error);
        res.status(500).json({ message: "Lỗi server!" });
    }
});

app.post("/posts/:slug/comments", verifyToken, async (req, res) => {
    try {
        const slug = req.params.slug;
        const [postRows] = await pool.execute("SELECT * FROM posts WHERE slug=?", [slug]);
        if(postRows.length === 0) return res.status(404).json({message: "Không tìm thấy bài viết"});
        const post = postRows[0];
        const [result] = await pool.execute("INSERT INTO comments (body, user_id, post_id) VALUES (?, ?, ?)", [req.body.body, req.user.id, post.id]);
        res.status(200).json({message: "Gửi bình luận thành công"})
    } catch (error) {
        console.error("Lỗi khi gửi bình luận: ", error);
        res.status(500).json({ message: "Lỗi server!" });
    }
});

app.get("/users/:id", verifyToken, async (req, res) => {
    try {
        const userId = req.params.id;

        const sql = `SELECT id, user_name, email, phone_number, role FROM user_accounts WHERE id = ?`;
        const [rows] = await pool.execute(sql, [userId]);

        if (rows.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy người dùng!" });
        }

        const user = rows[0];
        res.status(200).json({ data: user });
    } catch (error) {
        console.error("Lỗi khi lấy thông tin người dùng: ", error);
        res.status(500).json({ message: "Lỗi server!" });
    }
});

app.listen(PORT, () => console.log(`🚀 Server đang chạy tại: http://localhost:${PORT}`));