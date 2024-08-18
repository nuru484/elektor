const express = require('express');
const session = require('express-session');
const passport = require('passport');
const ejs = require('ejs');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const initializePassport = require('./config/passport-config');

const adminRouter = require('./routes/adminRoutes');
const userRouter = require('./routes/userRoutes');
const indexRouter = require('./routes/index');
const votesRouter = require('./routes/votesRoutes');
const resultsRouter = require('./routes/resultsRoute');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    secret: 'ORACLE1995@B9s',
    resave: false,
    saveUninitialized: false,
  })
);

// Initialize Passport and session
initializePassport(passport);
app.use(passport.initialize());
app.use(passport.session());

app.use('/', indexRouter);
app.use('/admin', adminRouter);
app.use('/user', userRouter);
app.use('/userVote', votesRouter(io));
app.use('/results', resultsRouter);

// Listen for client connections
io.on('connection', (socket) => {
  console.log('A user connected');
  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

const port = process.env.PORT || 3000;

server.listen(port, '0.0.0.0', () => {
  console.log(`App listening on port ${port}`);
});
