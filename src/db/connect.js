import mongoose from "mongoose";

const connectDB = async () => {
    try {
        const uri = process.env.MONGO_DB_URI;
        await mongoose.connect(uri);
        console.log("Ket noi database thanh cong");
    } catch (error) {
        console.log("Loi ket noi database: ", error);
        process.exit();
    }
};

export default connectDB;