var express = require('express');
var path = require('path');
// var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var log4js = require('log4js');
var logger = require('./logs/log4js').logger;

//
var index = require('./routes/index');
var wxTokenVerify = require('./routes/wxTokenVerify');
var wxMenu = require('./routes/wxMenu');
var wxMedia = require('./routes/wxMedia');
var wxKfMsg = require('./routes/wxKfMsg');
var wxUser = require('./routes/wxUser');
var wxPay = require('./routes/wxPay');
//
var app = express();

// Express behind proxies
app.set('trust proxy', 'loopback, 172.18.0.1');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
// app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
// app.use(logger('dev'));
app.use(log4js.connectLogger(logger, { level: 'auto' }));
//
app.use(bodyParser.text({ type: 'text/xml' })); // 将请求体中的xml解析为字符串
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
//
app.use(cookieParser());

//
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
app.use('/wxTokenVerify', wxTokenVerify);
app.use('/wxMenu', wxMenu);
app.use('/wxMedia', wxMedia);
app.use('/wxKfMsg', wxKfMsg);
app.use('/wxUser', wxUser);
app.use('/wxPay', wxPay);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
	var err = new Error('Not Found');
	err.status = 404;
	next(err);
});

// error handler
app.use(function(err, req, res, next) {
	// set locals, only providing error in development
	res.locals.message = err.message;
	res.locals.error = req.app.get('env') === 'development' ? err : {};

	// render the error page
	res.status(err.status || 500);
	res.render('error');
});

module.exports = app;