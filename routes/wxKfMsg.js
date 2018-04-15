/*
	微信公众号推送客服消息
	推送客服消息：post http://wechat.weiquaninfo.cn/wxKfMsg/sendMsg
	每次最多20条消息，可以结合模板消息进行再次提醒
*/

var express = require('express');
var router = express.Router();
var logger = require('../logs/log4js').logger;
var redisClient = require('../redis');
var https = require('https');

//////////////////////////////////////////////////////////////////////////
// 推送客服消息
router.post('/sendMsg', function(req, res, next) {
	getAccessToken().then((access_token) => {
		return sendMessage(access_token);
	}).then((result) => {
		res.status(200).send(result);
	}).catch((error) => {
		logger.error(error);
		// 是否超过数量限制
		if (error.errcode == 45047) {
			// 客服消息超过数量限制20条，发送模板消息
			sendTemplateMsg(error, res);
		} else {
			//
			res.status(417).send(error);
		}
	})
});

//////////////////////////////////////////////////////////////////////////
// 获取access_token
function getAccessToken() {
	return new Promise((resolve, reject) => {
		redisClient.get('token', (error, access_token) => {
			if (error) return reject(error);
			access_token = access_token.replace(/\"/g, "");
			return resolve(access_token);
		})
	})
}

//////////////////////////////////////////////////////////////////////////
// 推送客服消息
function sendMessage(access_token) {
	return new Promise((resolve, reject) => {
		let openId = "oMBhJ0tdCdBtY07FXuzsywkEyU6A";
		let textMsg = {
			touser: openId,
			msgtype: "text",
			text: {
				"content": `欢迎使用以下服务：
					1：小程序<a href="http://www.qq.com" data-miniprogram-appid="wx65423a2f6908bc55" data-miniprogram-path="pages/index/index">Hi游</a>`
			}
		}
		const postData = JSON.stringify(textMsg);
		const options = {
			hostname: "api.weixin.qq.com",
			path: `/cgi-bin/message/custom/send?access_token=${access_token}`,
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Content-Length': Buffer.byteLength(postData, 'utf-8')
			}
		};
		const req = https.request(options, (res) => {
			res.setEncoding('utf8');
			let rawData = '';
			res.on('data', (chunk) => { rawData += chunk; });
			res.on('end', () => {
				// 反馈结果
				let result = JSON.parse(rawData);
				if (result.errcode == 0) {
					// 发送成功
					resolve("success");
				} else {
					result.access_token = access_token;
					result.openId = openId;
					reject(result);
				}
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
// 发送模板消息
function sendTemplateMsg(result, resMain) {
	let openId = result.openId;
	let access_token = result.access_token;
	let textMsg = {
		"touser": openId,
		"template_id": "cLNDTeHq9wYEZsdsCPSSV1pIMSuDqrAw2LMugw59-28",
		"data": {
			"first": {
				"value": "48小时未操作，无法接收消息",
				"color": "#173177"
			},
			"keyword1": {
				"value": "zjj",
				"color": "#173177"
			},
			"keyword2": {
				"value": "17:27",
				"color": "#173177"
			},
			"remark": {
				"value": "请在公众号菜单中选择->图文资讯->触摸星地带",
				"color": "#173177"
			}
		}
	}
	const postData = JSON.stringify(textMsg);
	const options = {
		hostname: "api.weixin.qq.com",
		path: `/cgi-bin/message/template/send?access_token=${access_token}`,
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Content-Length': Buffer.byteLength(postData, 'utf-8')
		}
	};
	const req = https.request(options, (res) => {
		res.setEncoding('utf8');
		let rawData = '';
		res.on('data', (chunk) => { rawData += chunk; });
		res.on('end', () => {
			// 反馈结果
			let result = JSON.parse(rawData);
			if (result.errcode == 0) {
				// 发送成功
				resMain.send(rawData);
			} else {
				logger.error(result);
				resMain.status(417).send(result);
			}
		});
	});
	req.on('error', (e) => {
		resMain.status(417).send(`problem with request: ${e.message}`);
	});
	req.write(postData);
	req.end();
}

//
module.exports = router;