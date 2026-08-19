import User from "../schemas/userSchema.js";

export const getUserById  =  async (req, res) => {
    try {
        const userId = req.params.id;

        if (userId !== req.user.id)
            return res.status(403).json({ message: "Không có quyền lấy thông tin của tài khoản khác" });

        const user = await User.findById(userId);

        if (!user) return res.status(404).json({message: "Tai khoan khong ton tai"});

        res.status(200).json({ data: user });
    } catch (error) {
        console.error("Lỗi khi lấy thông tin người dùng: ", error);
        res.status(500).json({ message: "Lỗi server!" });
    }
};

export const updateUserById = async (req, res) => {
    try {
        const userId = req.params.id;

        const {email, phoneNumber} = req.body;

        if(email === "" || phoneNumber === "") return res.status(400).json({message: "Thong tin khong duoc de trong"});

        if(userId !== req.user.id) return res.status(403).json({message: "Khong co quyen thay doi thong tin tai khaon nay"});
        
        const user = await User.findById(userId);

        if (!user) return res.status(404).json({message: "Tai khoan nay khong ton tai"});

        if (email) user.email = email;

        if (phoneNumber) user.phoneNumber = phoneNumber;

        await user.save();

        res.status(200).json({message: "Thay doi thong tin thanh cong", data: user});
    } catch (error) {
        console.error("Lỗi khi cập nhật thông tin người dùng: ", error);

        if (error.code === 11000) {
            if (error.keyPattern.email) return res.status(400).json({ message: "Email này đã được sử dụng!" });
            if (error.keyPattern.phoneNumber) return res.status(400).json({ message: "Số điện thoại này đã được sử dụng!" });
        }

        res.status(500).json({ message: "Lỗi server!" });
    }
};