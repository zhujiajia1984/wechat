var express = require('express');
var router = express.Router();
var logger = require('../logs/log4js').logger;
var crypto = require('crypto');
var xml2js = require('xml2js');
var moment = require('moment');
var https = require('https');
var fs = require('fs');
var parseString = xml2js.parseString;

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
// 接收微信消息，并可适当回复
router.post('/', function(req, res, next) {
	let xml = req.body;
	// 解析xml消息
	parseWxString(xml).then((data) => {
		// 回复消息
		let replyXml = "";
		switch (data.MsgType) {
			case "text":
				// logger.info("textMsg：", data);
				replyXml = replyMsgBuild(data);
				break;
			case "image":
				// logger.info("imageMsg：", data);
				return saveImageBuild(data);
				break;
			default:
				break;
		}
		return replyXml;
	}).then((replyXml) => {
		res.set('Content-Type', 'application/xml');
		res.status(200).send(replyXml);
	}).catch((err) => {
		logger.error(err);
		res.status(417).send("");
	})
});

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
////////////////////////////////////////////////////////////////
// 构建回复消息
function replyMsgBuild(data) {
	let resMsg = '<xml>' +
		'<ToUserName><![CDATA[' + data.FromUserName + ']]></ToUserName>' +
		'<FromUserName><![CDATA[' + data.ToUserName + ']]></FromUserName>' +
		'<CreateTime>' + moment().valueOf() + '</CreateTime>' +
		'<MsgType><![CDATA[text]]></MsgType>' +
		'<Content><![CDATA[' + data.Content + ']]></Content>' +
		'</xml>';
	return resMsg;
}

////////////////////////////////////////////////////////////////
// 下载图片并保存
function saveImageBuild(data) {
	return new Promise((resolve, reject) => {
		let url = `https://api.weixin.qq.com/cgi-bin/media/get?access_token=8_apxg_Ari6KIYTzyEf1M3ZXa9NYnnPAhlNx3krVQWR3huR46VHrsGHxrlUEm8M5ZoSki-_exz6CZEY_t_eeDsm69AQuAKm82_HB7K5Qd8asaq5g3zvYpc8lMcFtri8BoaIt-iob0g7hctE3xnRYLbADAGNA&media_id=${data.MediaId}`;
		https.get(url, (res) => {
			const { statusCode } = res;
			const contentType = res.headers['content-type'];
			// 异常处理
			let error;
			if (statusCode !== 200) {
				error = new Error('Request Failed.\n' +
					`Status Code: ${statusCode}`);
			}
			if (error) {
				// console.error(error.message);
				// consume response data to free up memory
				res.resume();
				return reject(error);
			}
			// 正常处理
			res.setEncoding('binary');
			let rawData = '';
			res.on('data', (chunk) => { rawData += chunk; });
			res.on('end', () => {
				// 保存图片
				let buffer = Buffer.from(rawData, 'binary');
				let filePath = `public/images/${data.MediaId}.jpeg`;
				fs.writeFile(filePath, buffer, 'binary', (err) => {
					if (err) return reject(err);
					logger.info(`The file ${filePath} has been saved!`);
					return resolve("");
				});
			});
		}).on('error', (e) => {
			// console.error(`Got error: ${e.message}`);
			return reject(e);
		});
	})
}

module.exports = router;