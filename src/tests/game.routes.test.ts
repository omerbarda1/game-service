import request from 'supertest';
import app from '../app';
import { commandClient as redis } from '../redis';

describe('Game Service Routes', () => {
  const testPin = '999999';
  const sessionKey = `session:${testPin}`;

  beforeAll(async () => {
    await redis.flushAll(); 
  });

  afterAll(async () => {
    await redis.quit();
  });
  
  it('should create a new session', async () => {
    const res = await request(app)
      .post('/game/start')
      .send({ quizId: 'dummy-quiz-id', host: 'hostUser' });

    expect(res.status).toBe(201);
    expect(res.body.pin).toMatch(/^\d{6}$/);
  });

  it('should allow a player to join a session', async () => {
    await redis.hSet(sessionKey, {
      quizId: '123',
      players: JSON.stringify([]),
      state: 'waiting',
      currentQuestionIndex: '0'
    });

    const res = await request(app)
      .post('/game/join')
      .send({ pin: testPin, name: 'PlayerOne' });

    expect(res.status).toBe(200);
    expect(res.body.player.name).toBe('PlayerOne');
    expect(res.body.playerId).toBeDefined();
  });

  it('should publish a question event', async () => {
    const res = await request(app)
      .post(`/game/${testPin}/question`)
      .send({
        question: {
          text: 'What is 2 + 2?',
          options: ['1', '2', '3', '4'],
          correctOption: 3
        }
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('question_broadcasted');
  });

  it('should respond to poll with event', async () => {
    const first = await request(app)
    .get('/game/poll')
    .query({ sessionId: testPin, lastId: '0' })
    .expect(200);

  expect(first.body.type).toBe('player_joined'); 

  const second = await request(app)
    .get('/game/poll')
    .query({ sessionId: testPin, lastId: first.body.eventId })
    .expect(200);

  expect(second.body.type).toBe('question');
  expect(second.body.data.text).toBe('What is 2 + 2?');
  });

});
