/*
	微信第三方平台开发
	API接口: 			https://wechat.weiquaninfo.cn/wxPlatform/XXX
	授权事件接收URL： 	https://wechat.weiquaninfo.cn/wxPlatform/auth
*/

var express = require('express');
var router = express.Router();
var logger = require('../logs/log4js').logger;

// const

// router
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//授权事件接收URL
router.get('/auth', function(req, res, next) {
	res.send("success");
});

// function
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//

//
module.exports = router;