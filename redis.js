require('dotenv').config();
const { createClient } = require('redis');
const RedisStore = require('connect-redis').default;

const redisClient = createClient({
  url: process.env.REDIS_PUBLIC_URL,
});

const sessionStore = new RedisStore({ client: redisClient });

redisClient.connect().catch(console.error);

module.exports = { redisClient, sessionStore };
