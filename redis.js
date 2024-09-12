// require('dotenv').config();
// const { createClient } = require('redis');
// const RedisStore = require('connect-redis').default;

// const redisClient = createClient({
//   url: `redis://${
//     process.env.REDIS_PASSWORD ? process.env.REDIS_PASSWORD + '@' : ''
//   }${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
// });

// const sessionStore = new RedisStore({ client: redisClient });

// redisClient.connect().catch(console.error);

// module.exports = { redisClient, sessionStore };
