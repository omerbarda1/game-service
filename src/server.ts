import mongoose from 'mongoose';
import app from './app';

// const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI!)
  .then(() => {
    app.listen(3000, () => console.log(`Game Service running...}`));
  })
  .catch(err => console.error('MongoDB error:', err));
