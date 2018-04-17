/*
	微信小程序支付接口
	统一下单接口：post https://wechat.weiquaninfo.cn/wxPay/unifiedorder
	{
		body:xxx,
		total_fee:yyy,
		spbill_create_ip:zzz,
	}
*/

var express = require('express');
var router = express.Router();
var logger = require('../logs/log4js').logger;
var redisClient = require('../redis');
var https = require('https');
var childProc = require('child_process');

// const
const appid = 'wxc7b32c9521bcc0d5'; // 智企云服务+小程序
const mch_id = '1442452802'; // 智企云服务商户号
const api_key = 'PuWVF2GX4sHKSRNK7Wl1V4gNBvY3E5f1'; // 商户API密钥

//////////////////////////////////////////////////////////////////////////
// 小程序调用统一下单接口
router.get('/unifiedorder', function(req, res, next) {
	// step1: 获取32位随机字符串
	getNonceStr().then((nonce_str) => {
		// 
		return nonce_str;
	}).then((result) => {
		res.status(200).send(result);
	}).catch((error) => {
		logger.error(error);
		res.status(417).send("error");
	})
});

//////////////////////////////////////////////////////////////////////////
// 获取32位随机字符串
function getNonceStr() {
	return new Promise((resolve, reject) => {
		var cmd = 'head -n 80 /dev/urandom | tr -dc A-Za-z0-9 | head -c 32';
		childProc.exec(cmd, function(err, stdout, stderr) {
			if (err) return reject(err);
			resolve(stdout);
		});
	})
}

//
module.exports = router;