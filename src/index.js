import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '19122006',
    database: 'user_db',
});

const hashPassword = async (plainPassword) => {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(plainPassword, salt);
    return hashedPassword;
}

app.post('/register', async (req, res) => {
    try {
        const {userName, password, email, phoneNumber} = req.body;
        const hashedPassword = await hashPassword(password);
        const sql = `INSERT INTO user_accounts (user_name, password, email, phone_number) VALUES (?, ?, ?, ?)`;
        const values = [userName, hashedPassword, email, phoneNumber];
        await pool.query(sql, values);
        res.status(201).json({ message: "Đăng ký tài khoản thành công!" });
    } catch(error) {
        console.error("Lỗi khi đăng ký: ", error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: "Tên đăng nhập hoặc Email đã tồn tại!" });
        }
        res.status(500).json({ message: "Lỗi server!" });
    }
});

app.post('/login', async (req, res) => {
    try {
        const {userName, password} = req.body;
        const sql = `SELECT * FROM user_accounts WHERE user_name = ?`;
        const values = [userName];
        const [rows] = await pool.query(sql, values);
        if(rows.length === 0) return res.status(400).json({message: "Tên đăng nhập không tồn tại!"});
        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if(!isMatch) return res.status(400).json({message: "Mật khẩu không đúng!"});
        res.status(200).json({message: "Đăng nhập thành công"});
    } catch (error) {
        console.error("Lỗi khi đăng nhập: ", error);
        res.status(500).json({message: "Lỗi server"});
    }
});

app.listen(PORT, () => console.log(`🚀 Server đang chạy tại: http://localhost:${PORT}`));