import express from 'express';
import dotenv from 'dotenv';
import gameRoutes from './routes/game.route';
import cors from 'cors';
dotenv.config();
const app = express();
app.use(express.json());
app.use(cors())
app.use('/game', gameRoutes);

export default app;
