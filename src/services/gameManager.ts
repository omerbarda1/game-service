import { commandClient as redis } from '../redis';
import { randomBytes } from 'crypto';
import { publishEvent } from './eventPublisher';
import { Quiz } from '../models/quiz.model';

const generatePin = (): string => {
  return (Math.floor(100000 + Math.random() * 900000)).toString(); // 6-digit PIN
};

export const createSession = async (quizId: string, host: string) => {
  const quiz = await Quiz.findById(quizId).lean();
  if (!quiz) throw new Error('Quiz not found');

  const pin = generatePin();
  const sessionKey = `session:${pin}`;

  const sessionData = {
    quizId,
    host,
    players: JSON.stringify([]),
    currentQuestionIndex: 0,
    state: 'waiting',
    questions: JSON.stringify(quiz.questions),
  };

  await redis.hSet(sessionKey, sessionData);
  await redis.expire(sessionKey, 3600);

  return { pin, quizId };
};

export const joinSession = async (pin: string, playerName: string) => {
  const sessionKey = `session:${pin}`;
  const exists = await redis.exists(sessionKey);
  if (!exists) throw new Error('Session not found');

  const playerId = randomBytes(4).toString('hex');
  const player = { id: playerId, name: playerName };

  const playersJson = await redis.hGet(sessionKey, 'players');
  const players = JSON.parse(playersJson || '[]');
  players.push(player);
  
  await publishEvent(pin, 'player_joined', {
    id: playerId,
    name: playerName
  });
  
  await redis.hSet(sessionKey, { players: JSON.stringify(players) });
  return { playerId, player };
};

export const getSession = async (pin: string) => {
  const sessionKey = `session:${pin}`;
  const session = await redis.hGetAll(sessionKey);
  if (!session || !session.quizId) throw new Error('Session not found');

  return {
    ...session,
    players: JSON.parse(String(session.players || []))
  };
};
