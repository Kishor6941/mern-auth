import mongoose from "mongoose";

const connectDB = async () => {
  try {
    mongoose.connection.on("connected", () => {
      console.log("MongoDB connected");
    });

    await mongoose.connect(`${process.env.MONGODB_URL}/mern-auth`);
  } catch (error) {
    mongoose.connection.on("error", () => {
      console.log("MongoDB connection failed");
    });
  }
};

export default connectDB;
