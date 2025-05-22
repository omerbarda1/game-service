
import { createClient, RedisClientType } from 'redis';
import dotenv from 'dotenv';
dotenv.config();

const options = {
  socket: {
    host: process.env.REDIS_HOST ?? '127.0.0.1',
    port: Number(process.env.REDIS_PORT ?? 6379),
  },
};

export const commandClient: RedisClientType = createClient(options);

commandClient.on('error', (err) => console.error('Redis error', err));

(async () => {
  await commandClient.connect();
})();

console.log('✅ Redis connected (commandClient)');

export async function getBlockingClient(): Promise<RedisClientType> {
  const dup = commandClient.duplicate();
  await dup.connect();
  return dup;
}
