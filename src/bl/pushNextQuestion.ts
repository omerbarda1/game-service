import {commandClient as redis} from "../redis";
import { publishEvent } from "../services/eventPublisher";

export const pushNextQuestion = async (pin: string) => {
    const key = `session:${pin}`;
    const idx = Number(await redis.hGet(key, 'currentQuestionIndex')) || 0;
    const questionsJson = await redis.hGet(key, 'questions');
  
    if (!questionsJson) throw new Error('Questions not loaded');
    const questions = JSON.parse(questionsJson);
  
    if (idx >= questions.length) {
      await publishEvent(pin, 'game_over', { message: 'Quiz finished' });
      await redis.hSet(key, { state: 'finished' });
      return;
    }
  
    const q = questions[idx];
    await publishEvent(pin, 'question', q);
    await redis.hSet(key, { currentQuestionIndex: (idx + 1).toString() });
  };
  