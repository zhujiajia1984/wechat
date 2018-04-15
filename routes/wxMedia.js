/*
	微信公众号素材管理
*/

var express = require('express');
var router = express.Router();
var logger = require('../logs/log4js').logger;
var redisClient = require('../redis');
var https = require('https');

//////////////////////////////////////////////////////////////////////////
// 获取永久素材列表
router.get('/getMediaList', function(req, res, next) {
	res.send("media");
});

//
module.exports = router;