var express = require('express');
var router = express.Router();
var logger = require('../logs/log4js').logger;
var crypto = require('crypto');

// const
const token = "zhujiajia1984"; /*和微信公众平台填写的token一致*/

////////////////////////////////////////////////////////////////
// wx token verify
router.get('/', function(req, res, next) {
	let { signature, timestamp, nonce, echostr } = req.query;
	let tmp = [token, timestamp, nonce].sort().join("");
	// sha1加密
	let sign = crypto.createHash("sha1").update(tmp).digest("hex");

	// 判断是否来自于微信
	if (signature == sign) {
		res.send(echostr);
	} else {
		res.send("wx account verify failed!");
	}
});

////////////////////////////////////////////////////////////////
// 获取微信消息
router.post('/', function(req, res, next) {
	logger.info(req.body);
	res.send("");
});

module.exports = router;