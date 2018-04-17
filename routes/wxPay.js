/*
	微信小程序支付接口
	统一下单接口：post https://wechat.weiquaninfo.cn/wxPay/unifiedorder
	{
		body:xxx,
		total_fee:yyy,
		spbill_create_ip:zzz,
	}
	md5加密接口：get https://wechat.weiquaninfo.cn/wxPay/md5?prepay_id=""
	支付结果通知：post https://wechat.weiquaninfo.cn/wxPay/payResult
*/

var express = require('express');
var router = express.Router();
var logger = require('../logs/log4js').logger;
var redisClient = require('../redis');
var https = require('https');
var childProc = require('child_process');
var crypto = require('crypto');
var moment = require('moment');
var parseString = require('xml2js').parseString;

// const
const appid = 'wxc7b32c9521bcc0d5'; // 智企云服务+小程序
const mch_id = '1442452802'; // 智企云服务商户号
const api_key = 'PuWVF2GX4sHKSRNK7Wl1V4gNBvY3E5f1'; // 商户API密钥
const device_info = "WEB"; // 设备号
const payNotifyUrl = "https://wechat.weiquaninfo.cn/wxPay/payResult"; // 支付结果通知
const time = 7200; // prepareId有效期2小时

//////////////////////////////////////////////////////////////////////////
// 小程序调用统一下单接口
router.post('/unifiedorder', function(req, res, next) {
	if (typeof(req.body.body) == "undefined") {
		logger.error("need body");
		res.status(417).send("need body");
		return;
	}
	var body = req.body.body;
	var orderInfo = {}; // 订单信息
	// step1: 获取32位随机字符串
	getNonceStr().then((nonce_str) => {
		// step2：生成签名
		return createSign(nonce_str, body);
	}).then((data) => {
		// step3：调用统一下单接口
		orderInfo = data.rawData;
		return callWxUnifiedorder(data);
	}).then((rawData) => {
		// step4：解析返回的xml值
		return parseWxString(rawData);
	}).then((result) => {
		// step5：保存到redis（prepay_id时效为2小时）
		return saveRedis(result, orderInfo);
	}).then((result) => {
		if (result.return_code == 'SUCCESS' && result.result_code == 'SUCCESS') {
			// 请求成功
			res.status(200).send(result.prepay_id);
		} else {
			logger.error(result);
			res.status(417).send(result);
		}
	}).catch((error) => {
		logger.error(error);
		res.status(417).send("error");
	})
});

//////////////////////////////////////////////////////////////////////////
// md5加密接口
router.get('/md5', function(req, res, next) {
	if (typeof(req.query.prepay_id) == "undefined") {
		logger.error("need prepay_id");
		res.status(417).send("need prepay_id");
	} else {
		var prepay_id = req.query.prepay_id;
		// step1: 获取32位随机字符串
		getNonceStr().then((nonce_str) => {
			// step2：生成微信小程序端的签名
			return createMiniProgramSign(nonce_str, prepay_id);
		}).then((result) => {
			res.status(200).send(result);
		}).catch((error) => {
			logger.error(error);
			res.status(417).send("error");
		})
	}
});

//////////////////////////////////////////////////////////////////////////
// 支付结果通知接口
router.post('/payResult', function(req, res, next) {
	// step1: 解析xmlData
	parseWxString(req.body).then((data) => {
		// step2：校验sign
		return checkPayResultSign(data);
	}).then((result) => {
		let successMsg = "<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>";
		res.send(successMsg);
	}).catch((error) => {
		logger.error(error);
		let failMsg = "<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>";
		res.status(417).send(failMsg);
	})
});


//functions
//////////////////////////////////////////////////////////////////////////
// 临时保存统一下单信息到redis，key为商户订单号
function saveRedis(result, orderInfo) {
	return new Promise((resolve, reject) => {
		redisClient.select(1, (err) => {
			if (err) return reject(err);
		});
		redisClient.set(orderInfo.out_trade_no,
			JSON.stringify(orderInfo),
			'Ex', time,
			(err, res) => {
				if (err) return reject("save redis error");
				return resolve(result);
			})
	})
}

//////////////////////////////////////////////////////////////////////////
// 支付结果通知接口
function checkPayResultSign(data) {
	return new Promise((resolve, reject) => {
		if (data.return_code != "SUCCESS" || data.result_code != "SUCCESS") {
			// 通讯失败或者交易失败
			return reject(data);
		} else {
			// 交易成功
			let tmpKeys = ["appid", "mch_id", "nonce_str", "result_code", "openid",
				"trade_type", "bank_type", "total_fee", "cash_fee", "transaction_id",
				"out_trade_no", "time_end", "return_code"
			];
			if (typeof(data.device_info) != "undefined") {
				tmpKeys.push("device_info");
			}
			if (typeof(data.sign_type) != "undefined") {
				tmpKeys.push("sign_type");
			}
			if (typeof(data.err_code) != "undefined") {
				tmpKeys.push("err_code");
			}
			if (typeof(data.err_code_des) != "undefined") {
				tmpKeys.push("err_code_des");
			}
			if (typeof(data.is_subscribe) != "undefined") {
				tmpKeys.push("is_subscribe");
			}
			if (typeof(data.settlement_total_fee) != "undefined") {
				tmpKeys.push("settlement_total_fee");
			}
			if (typeof(data.fee_type) != "undefined") {
				tmpKeys.push("fee_type");
			}
			if (typeof(data.cash_fee_type) != "undefined") {
				tmpKeys.push("cash_fee_type");
			}
			if (typeof(data.coupon_fee) != "undefined") {
				tmpKeys.push("coupon_fee");
			}
			if (typeof(data.coupon_count) != "undefined") {
				tmpKeys.push("coupon_count");
			}
			if (typeof(data.coupon_type_$n) != "undefined") {
				tmpKeys.push("coupon_type_$n");
			}
			if (typeof(data.coupon_id_$n) != "undefined") {
				tmpKeys.push("coupon_id_$n");
			}
			if (typeof(data.coupon_fee_$n) != "undefined") {
				tmpKeys.push("coupon_fee_$n");
			}
			if (typeof(data.attach) != "undefined") {
				tmpKeys.push("attach");
			}
			let tmp = tmpKeys.sort().map((item) => {
				return `${item}=${data[item]}`
			}).join("&");
			let signTmp = `${tmp}&key=${api_key}`;
			// 生成签名
			let sign = crypto.createHash("md5").update(signTmp).digest("hex").toUpperCase();
			if (sign == data.sign) {
				resolve(data);
			} else {
				reject("signal error");
			}
		}
	})

}


////////////////////////////////////////////////////////////////
// 解析微信发来的消息xml
function parseWxString(xml) {
	return new Promise((resolve, reject) => {
		parseString(xml, {
			trim: true,
			explicitArray: false
		}, (err, result) => {
			if (err) {
				return reject(err);
			} else {
				return resolve(result.xml);
			}
		});
	})
}

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

//////////////////////////////////////////////////////////////////////////
// 生成签名
function createSign(nonce_str, body) {
	return new Promise((resolve, reject) => {
		// 参数名称定义
		let [key_appid,
			key_mch_id, key_device_info, key_body, key_nonce_str,
			key_out_trade_no, key_total_fee, key_spbill_create_ip, key_notify_url,
			key_trade_type, key_openid
		] = ["appid", "mch_id", "device_info", "body", "nonce_str", "out_trade_no",
			"total_fee", "spbill_create_ip", "notify_url", "trade_type", "openid"
		];
		// 参数值定义
		let rawData = {};
		rawData[key_appid] = appid;
		rawData[key_mch_id] = mch_id;
		rawData[key_device_info] = device_info;
		rawData[key_body] = body;
		rawData[key_nonce_str] = nonce_str;
		rawData[key_out_trade_no] = `${moment().valueOf()}`;
		rawData[key_total_fee] = 1;
		rawData[key_spbill_create_ip] = "123.12.12.123";
		rawData[key_notify_url] = payNotifyUrl;
		rawData[key_trade_type] = "JSAPI";
		rawData[key_openid] = "osbYM0QcwWOo4K61UKwztoZjPzAs";
		// 参数名ASCII字典序排序,按照key=value格式
		let tmp = [key_appid,
			key_mch_id, key_device_info, key_body, key_nonce_str,
			key_out_trade_no, key_total_fee, key_spbill_create_ip, key_notify_url,
			key_trade_type, key_openid
		].sort().map((item) => {
			return `${item}=${rawData[item]}`
		}).join("&");
		let signTmp = `${tmp}&key=${api_key}`;
		// 生成签名
		let sign = crypto.createHash("md5").update(signTmp).digest("hex").toUpperCase();
		let result = {
			sign: sign,
			rawData: rawData
		}
		return resolve(result);
	})
}

//////////////////////////////////////////////////////////////////////////
// 调用统一下单接口
function callWxUnifiedorder(data) {
	return new Promise((resolve, reject) => {
		let postData = '<xml>' +
			'<appid>' + data.rawData.appid + '</appid>' +
			'<mch_id>' + data.rawData.mch_id + '</mch_id>' +
			'<device_info>' + data.rawData.device_info + '</device_info>' +
			'<nonce_str>' + data.rawData.nonce_str + '</nonce_str>' +
			'<sign>' + data.sign + '</sign>' +
			'<body>' + data.rawData.body + '</body>' +
			'<out_trade_no>' + data.rawData.out_trade_no + '</out_trade_no>' +
			'<total_fee>' + data.rawData.total_fee + '</total_fee>' +
			'<spbill_create_ip>' + data.rawData.spbill_create_ip + '</spbill_create_ip>' +
			'<notify_url>' + data.rawData.notify_url + '</notify_url>' +
			'<trade_type>' + data.rawData.trade_type + '</trade_type>' +
			'<openid>' + data.rawData.openid + '</openid>' +
			'</xml>';
		const options = {
			hostname: "api.mch.weixin.qq.com",
			path: "/pay/unifiedorder",
			method: 'POST',
			headers: {
				'Content-Type': 'application/xml',
				'Content-Length': Buffer.byteLength(postData, 'utf-8')
			}
		};
		const req = https.request(options, (res) => {
			res.setEncoding('utf8');
			let rawData = '';
			res.on('data', (chunk) => { rawData += chunk; });
			res.on('end', () => {
				// 反馈结果
				// logger.info(rawData);
				return resolve(rawData);
			});
		});
		req.on('error', (e) => {
			reject(`problem with request: ${e.message}`);
		});
		req.write(postData);
		req.end();
	})
}

//////////////////////////////////////////////////////////////////////////
// 生成微信小程序前端支付签名
function createMiniProgramSign(nonce_str, prepay_id) {
	return new Promise((resolve, reject) => {
		// 参数名称定义
		let [key_appid, key_timeStamp, key_nonceStr, key_package, key_signType] = ["appId",
			"timeStamp", "nonceStr", "package", "signType"
		];
		// 参数值定义
		let rawData = {};
		rawData[key_appid] = appid;
		rawData[key_timeStamp] = `${moment().valueOf()}`;
		rawData[key_nonceStr] = nonce_str;
		rawData[key_package] = `prepay_id=${prepay_id}`;
		rawData[key_signType] = "MD5";
		// 参数名ASCII字典序排序,按照key=value格式
		let tmp = [key_appid, key_timeStamp, key_nonceStr, key_package, key_signType]
			.sort().map((item) => {
				return `${item}=${rawData[item]}`
			}).join("&");
		let signTmp = `${tmp}&key=${api_key}`;
		// 生成签名
		let sign = crypto.createHash("md5").update(signTmp).digest("hex").toUpperCase();
		let result = {
			timeStamp: rawData.timeStamp,
			nonceStr: rawData.nonceStr,
			package: rawData.package,
			signType: rawData.signType,
			paySign: sign
		}
		return resolve(result);
	})
}


//
module.exports = router;