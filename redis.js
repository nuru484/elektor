const { createClient } = require('redis');
const RedisStore = require('connect-redis').default;

const redisClient = createClient({
  url: 'redis://localhost:6379', // Use your Redis server's URL and port
});

const sessionStore = new RedisStore({ client: redisClient });

redisClient.connect().catch(console.error);

module.exports = { redisClient, sessionStore };
