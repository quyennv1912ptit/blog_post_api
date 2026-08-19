import hashPassword from "../utils/hashPassword.js";
import User from "../schemas/userSchema.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

export const register = async (req, res) => {
    try {
        const { userName, password, email, phoneNumber } = req.body;

        if (!userName || !password || !email) {
            return res.status(400).json({ message: "Vui lòng điền đầy đủ thông tin bắt buộc!" });
        }

        const hashedPassword = await hashPassword(password);

        const newUser = new User({
            userName: userName,
            password: hashedPassword,
            email: email,
            phoneNumber: phoneNumber
        });

        await newUser.save();

        res.status(201).json({ message: "Đăng ký tài khoản thành công!" });
    } catch (error) {
        console.error("Lỗi khi đăng ký: ", error);
        if (error.code === 11000) {
            if (error.keyPattern.userName) {
                return res.status(400).json({ message: "Tên đăng nhập này đã được sử dụng!" });
            }
            if (error.keyPattern.email) {
                return res.status(400).json({ message: "Email này đã được đăng ký!" });
            }
            if (error.keyPattern.phoneNumber) {
                return res.status(400).json({ message: "Số điện thoại này đã được sử dụng!" });
            }
        }
        res.status(500).json({ message: "Lỗi server!" });
    }
};

export const login = async (req, res) => {
    try {
        const { userName, password } = req.body;

        const user = await User.findOne({ userName: userName });
        if (!user) return res.status(404).json({ message: "Ten dang nhap khong ton tai" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Mật khẩu không đúng!" });

        const payload = {
            id: user._id,
            userName: user.userName,
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
};