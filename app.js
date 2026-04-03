var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
let mongoose = require('mongoose');
const passport = require('passport');
require('./utils/authHandler');
const session = require('express-session');
const config = require('./utils/config');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Session và Passport
app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.nodeEnv === 'production'
  }
}));
app.use(passport.initialize());
app.use(passport.session());

// Kết nối MongoDB
mongoose.connect(config.mongodbUri);
mongoose.connection.on('connected', () => {
  console.log('Mongoose is connected');
})

app.use('/', require('./routes/index'));
app.use('/users', require('./routes/users'));
app.use('/auth', require('./routes/auth'));

// feature/messages
app.use('/messages', require('./routes/messages'));
app.use('/support-chat', require('./routes/messages'));

// main
app.use('/products', require('./routes/products'));
app.use('/categories', require('./routes/categories'));
app.use('/inventories', require('./routes/inventories'));

// stash (code của bạn trước đó)
app.use('/inventories', require('./routes/inventories'));
app.use('/payments', require('./routes/payments'));

app.use('/roles', require('./routes/roles'));
app.use('/carts', require('./routes/carts'));
app.use('/reservations', require('./routes/reservations'));
app.use('/orders', require('./routes/orders'));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.json({
    success: false,
    message: err.message,
    error: req.app.get('env') === 'development' ? err.stack : {}
  });
});

module.exports = app;
