import { commandClient as redis } from '../redis';

export const publishEvent = async (sessionPin: string, type: string, data: any) => {
  const streamKey = `session:${sessionPin}:events`;

  await redis.xAdd(streamKey, '*', {
    type,
    data: JSON.stringify(data)
  });
};
