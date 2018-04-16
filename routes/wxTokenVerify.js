/*
	微信公众号服务器配置
	https://wechat.weiquaninfo.cn/wxTokenVerify
	token: zhujiajia1984
*/

var express = require('express');
var router = express.Router();
var logger = require('../logs/log4js').logger;
var crypto = require('crypto');

// const
const token = "zhujiajia1984"; /*和微信公众平台填写的token一致*/

/* token verify */
// router.get('/', function(req, res, next) {
// 	let { signature, timestamp, nonce, echostr } = req.query;
// 	let tmp = [token, timestamp, nonce].sort().join("");
// 	// sha1加密
// 	let sign = crypto.createHash("sha1").update(tmp).digest("hex");

// 	// 判断是否来自于微信
// 	if (signature == sign) {
// 		res.send(echostr);
// 	} else {
// 		res.send("wx account verify failed!");
// 	}
// });

//
module.exports = router;