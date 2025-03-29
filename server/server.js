import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import cookieParser from 'cookie-parser';
import connectDB from './config/mongodb.js';
import authRouter from './routes/authRoutes.js';
const app = express();
connectDB();

app.use(cors({credentials: true}));
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth',authRouter);


const port = process.env.PORT || 4000;


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});