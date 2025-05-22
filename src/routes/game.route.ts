import { Router, Request, Response } from 'express';
import { createSession, joinSession, getSession } from '../services/gameManager';
import { publishEvent } from '../services/eventPublisher';
import { getBlockingClient } from '../redis';
import { pushNextQuestion } from '../bl/pushNextQuestion';

const router = Router();
router.post('/:pin/question', async (req: Request, res: Response) => {
  try {
    const { pin } = req.params;
    const { question } = req.body;

    if (!question || !question.text || !question.options) {
      res.status(400).json({ error: 'Invalid question payload' });
      return
    }

    await publishEvent(pin, 'question', question);
    res.json({ status: 'question_broadcasted' });

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/start', async (req: Request, res: Response) => {
  const { quizId, host } = req.body;

  try {
    const session = await createSession(quizId, host);
    res.status(201).json(session);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/join', async (req: Request, res: Response) => {
  const { pin, name } = req.body;

  try {
    const result = await joinSession(pin, name);
    res.json(result);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

router.get('/poll', async (req, res) => {
  const { sessionId, lastId = '$' } = req.query;
  if (!sessionId) { res.status(400).json({ error: 'Missing sessionId' }); return; }
  const redis = await getBlockingClient();

  const streamKey = `session:${sessionId}:events`;

  try {
    const reply: any = await redis.xRead(
      [{ key: streamKey, id: String(lastId) }],
      { BLOCK: 25_000, COUNT: 1 }
    );

    if (!reply || reply.length === 0) { res.status(204).end(); return; }

    const { id: eventId, message } = reply[0].messages[0];
    const event = {
      eventId,
      type: message.type,
      data: JSON.parse(message.data)
    };

    res.json(event);
  } catch (err) {
    console.error('poll error', err);
    res.status(500).json({ error: (err as Error).message });
    return;
  }
});

router.get('/:pin', async (req: Request, res: Response) => {
  try {
    const session = await getSession(req.params.pin);
    res.json(session);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

router.post('/:pin/next', async (req, res) => {
  try {
    await pushNextQuestion(req.params.pin);
    res.json({ status: 'question_sent' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:pin/end', async (req: Request, res: Response) => {
  const { pin } = req.params;

  try {
    await publishEvent(pin, 'game_over', { message: 'Game has ended!' });
    res.json({ status: 'game_ended' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


export default router;
