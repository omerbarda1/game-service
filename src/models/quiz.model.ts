import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  options: [String],
  correctOption: Number
});

const quizSchema = new mongoose.Schema({
  title: { type: String, required: true },
  createdBy: String,
  questions: [questionSchema]
}, { timestamps: true });

export const Quiz = mongoose.model('Quiz', quizSchema);
