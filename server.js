const express = require('express');
const session = require('express-session');
const { redisClient, sessionStore } = require('./redis');
const passport = require('passport');
const ejs = require('ejs');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const initializePassport = require('./config/passport-config');

const { initializeDatabase } = require('./db/populatedb');
const { updateDatabaseFromExcel } = require('./db/populatedb');

const adminRouter = require('./routes/adminRoutes');
const userRouter = require('./routes/userRoutes');
const indexRouter = require('./routes/index');
const votesRouter = require('./routes/votesRoutes');
const resultsRouter = require('./routes/resultsRoute');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Use Redis as a session store
app.use(
  session({
    store: sessionStore,
    secret: 'ORACLE1995@B9s',
    resave: false,
    saveUninitialized: false,
  })
);

// Initialize Passport and session
initializePassport(passport, redisClient, sessionStore);
app.use(passport.initialize());
app.use(passport.session());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/admin', adminRouter);
app.use('/user', userRouter);
app.use('/userVote', votesRouter(io));
app.use('/results', resultsRouter);

app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

// Configure Socket.IO to use Redis adapter
const subClient = redisClient.duplicate();

subClient.connect().then(() => {
  io.adapter(createAdapter(redisClient, subClient));
});

// Listen for client connections
io.on('connection', (socket) => {
  console.log('A user connected');
  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

(async () => {
  try {
    console.log('Initializing the database...');

    await initializeDatabase();
    await updateDatabaseFromExcel();

    console.log('Database initialized successfully.');

    const port = process.env.PORT || 3000;

    server.listen(port, () => {
      console.log(`App listening on localhost port ${port}`);
    });
  } catch (error) {
    console.error('Failed to initialize the database:', error);
    process.exit(1);
  }
})();
