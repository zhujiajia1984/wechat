var express = require('express');
var router = express.Router();
var logger = require('../logs/log4js').logger;

/* token verify */
router.get('/', function(req, res, next) {
	logger.info(req.query);
	res.end();
});

//
module.exports = router;