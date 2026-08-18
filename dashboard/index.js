var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var cors = require('cors');
require('dotenv').config();

const config = require('../common/config');
const { httpLoggerMiddleware } = require('../common/logger');
const healthRouter = require('../common/health');

const indexRouter = require(path.join(__dirname, 'routes', 'index.js'));
const musicRouter = require(path.join(__dirname, 'routes', 'music.js'));
const authRouter = require(path.join(__dirname, 'routes', 'auth.js'));
const userRouter = require(path.join(__dirname, 'routes', 'user.js'));

var app = express();
app.use(cors({ origin: config.http.frontendUrl, credentials: true }));
app.use(httpLoggerMiddleware('dashboard'));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Dashboard only serves requests - it never generates recommendations,
// feeds, or playlists inline. That work happens in the Feed Worker,
// triggered by the Scheduler or interaction events.
app.use('/health', healthRouter);
app.use('/', indexRouter);
app.use('/music', musicRouter);
app.use('/auth', authRouter);
app.use('/user', userRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.status || 500);
  res.render('error');
});

app.listen(config.http.dashboardPort, () => {
  console.log(`Dashboard server is running on port ${config.http.dashboardPort}`);
});

module.exports = app;
