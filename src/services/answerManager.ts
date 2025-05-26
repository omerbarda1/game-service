import { commandClient as redis } from '../redis';
import { publishEvent } from './eventPublisher';

// points for a correct answer (simple demo)
// in a real game, this could be dynamic based on question difficulty or the time taken to answer
const CORRECT_POINTS = 1000;

/**
 * Record a player's answer, update their score if correct,
 * and push a live leaderboard event.
 */
export async function submitAnswer(
  pin: string,
  playerId: string,
  answerIndex: number
) {
  const base = `session:${pin}`;

  // 1. figure out which question is active
  const qIdxStr = await redis.hGet(base, 'currentQuestionIndex');
  if (qIdxStr === null) throw new Error('Game not started or finished');
  const qIdx = Number(qIdxStr) -1;

  // 2. avoid double-answering
  const answerKey = `${base}:answers:${qIdx}`;
  const already = await redis.hExists(answerKey, playerId);
  if (already) return; // ignore duplicates

  // 3. store the answer
  await redis.hSet(answerKey, { [playerId]: answerIndex });

  // 4. fetch questions array once (cached in session hash)
  const questionsJson = await redis.hGet(base, 'questions');
  if (!questionsJson) throw new Error('Questions not in cache');
  const questions = JSON.parse(questionsJson);
  const correctIdx = questions[qIdx].correctOption;

  // 5. scoring
  if (answerIndex === correctIdx) {
    await redis.zIncrBy(`${base}:leaderboard`, CORRECT_POINTS, playerId);
  }
  const allData = await redis.hGetAll(`${base}`);
  const playersJson = allData.players;
  if (!playersJson) throw new Error('Players data not found');
  const nameMap = Object.fromEntries(JSON.parse(String(playersJson)).map((p: { id: any; name: any; }) => [p.id, p.name]));
  
  // 6. emit updated leaderboard
  const top = await redis.zRangeWithScores(
    `${base}:leaderboard`,
    0,
    9,
    { REV: true }
  ); // top 10
  await publishEvent(pin, 'score_update', {
    leaderboard: top.map((t) => ({ name: nameMap[t.value], score: t.score })),
  });
}
