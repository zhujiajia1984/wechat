var express = require('express');
var router = express.Router();
var logger = require('../logs/log4js').logger;
var crypto = require('crypto');
var xml2js = require('xml2js');
var moment = require('moment');
var https = require('https');
var fs = require('fs');
var redisClient = require('../redis');
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
		let replyXml = "";
		switch (data.MsgType) {
			// 接收文本消息
			case "text":
				replyXml = replyMsgBuild(data);
				break;
				// 接收图片消息
			case "image":
				return saveImageBuild(data);
				break;
				// 接收语音消息
			case "voice":
				replyXml = replyVoiceBuild(data);
				break;
				// 接收位置消息
			case "location":
				replyXml = replyLocationBuild(data);
				break;
				// 接收事件推送
			case "event":
				if (data.Event == "subscribe") {
					// 用户关注订阅号事件
					replyXml = replySubscribeBuild(data);
				} else if (data.Event == "LOCATION") {
					// 用户上报地理位置事件
					replyXml = replyPositionBuild(data);
				} else if (data.Event == "CLICK") {
					// 自定义菜单拉取消息事件
					if (data.EventKey == "cmxdd") {
						replyXml = sendKfMsg(data);
					} else {
						return "";
					}
				} else if (data.Event == "VIEW") {
					// 自定义菜单跳转外链事件
					// replyXml = replyPositionBuild(data);
				}
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
		//获取access_token
		redisClient.get('token', (err, access_token) => {
			if (err) return reject(err);
			// 向微信请求图片数据
			access_token = access_token.replace(/\"/g, "");
			let url = `https://api.weixin.qq.com/cgi-bin/media/get?access_token=${access_token}&media_id=${data.MediaId}`;
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
		});
	})
}

////////////////////////////////////////////////////////////////
// 构建语音回复消息
function replyVoiceBuild(data) {
	let resMsg = '<xml>' +
		'<ToUserName><![CDATA[' + data.FromUserName + ']]></ToUserName>' +
		'<FromUserName><![CDATA[' + data.ToUserName + ']]></FromUserName>' +
		'<CreateTime>' + moment().valueOf() + '</CreateTime>' +
		'<MsgType><![CDATA[text]]></MsgType>' +
		'<Content><![CDATA[' + data.Recognition + ']]></Content>' +
		'</xml>';
	return resMsg;
}

////////////////////////////////////////////////////////////////
// 构建位置回复消息
function replyLocationBuild(data) {
	let content = `${data.Label}\n经度:${data.Location_Y}\n纬度:${data.Location_X}`
	let resMsg = '<xml>' +
		'<ToUserName><![CDATA[' + data.FromUserName + ']]></ToUserName>' +
		'<FromUserName><![CDATA[' + data.ToUserName + ']]></FromUserName>' +
		'<CreateTime>' + moment().valueOf() + '</CreateTime>' +
		'<MsgType><![CDATA[text]]></MsgType>' +
		'<Content><![CDATA[' + content + ']]></Content>' +
		'</xml>';
	return resMsg;
}

////////////////////////////////////////////////////////////////
// 构建用户关注公众号后推送消息
function replySubscribeBuild(data) {
	let content = "欢迎首次使用智企云服务！";
	let resMsg = '<xml>' +
		'<ToUserName><![CDATA[' + data.FromUserName + ']]></ToUserName>' +
		'<FromUserName><![CDATA[' + data.ToUserName + ']]></FromUserName>' +
		'<CreateTime>' + moment().valueOf() + '</CreateTime>' +
		'<MsgType><![CDATA[text]]></MsgType>' +
		'<Content><![CDATA[' + content + ']]></Content>' +
		'</xml>';
	return resMsg;
}

////////////////////////////////////////////////////////////////
// 构建用户上报地理位置后推送消息
function replyPositionBuild(data) {
	let content = `经度:${data.Longitude}\n纬度:${data.Latitude}\n精度：${data.Precision}`;
	let resMsg = '<xml>' +
		'<ToUserName><![CDATA[' + data.FromUserName + ']]></ToUserName>' +
		'<FromUserName><![CDATA[' + data.ToUserName + ']]></FromUserName>' +
		'<CreateTime>' + moment().valueOf() + '</CreateTime>' +
		'<MsgType><![CDATA[text]]></MsgType>' +
		'<Content><![CDATA[' + content + ']]></Content>' +
		'</xml>';
	return resMsg;
}

////////////////////////////////////////////////////////////////
// 发送客服消息（点击自定义菜单后）
function sendKfMsg(data) {
	return new Promise((resolve, reject) => {
		//获取access_token
		redisClient.get('token', (err, access_token) => {
			if (err) return reject(err);
			// post发送客服消息
			access_token = access_token.replace(/\"/g, "");
			let openId = data.FromUserName;
			// logger.info("token:", access_token);
			logger.info("openid:", openId);
			let textMsg = {
				touser: openId,
				msgtype: "text",
				text: {
					"content": `欢迎使用以下服务：
					1：小程序<a href="http://www.qq.com" data-miniprogram-appid="wx65423a2f6908bc55" data-miniprogram-path="pages/index/index">Hi游</a>`
				}
			}
			let imageMsg = {
				touser: openId,
				msgtype: "image",
				image: {
					media_id: "XSR7YDLHtgUkg-6NmG5mlmVnqW0j2ncL6iw4_Rtl1X0"
				}
			}
			let newsMsg = {
				touser: openId,
				msgtype: "mpnews",
				mpnews: {
					media_id: "XSR7YDLHtgUkg-6NmG5mlhmJ49JiITdHOFtsXahVlZQ"
				}
			}
			let minipgMsg = {
				touser: openId,
				msgtype: "miniprogrampage",
				miniprogrampage: {
					title: "Hi游+",
					appid: "wxce49574d3d0dad43",
					pagepath: "pages/index/index",
					thumb_media_id: "XSR7YDLHtgUkg-6NmG5mlmVnqW0j2ncL6iw4_Rtl1X0"
				}
			}
			// const postData = JSON.stringify(textMsg);
			// const postData = JSON.stringify(imageMsg);
			const postData = JSON.stringify(newsMsg);
			// const postData = JSON.stringify(minipgMsg);
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
						reject(result);
					}
				});
			});
			req.on('error', (e) => {
				reject(`problem with request: ${e.message}`);
			});
			req.write(postData);
			req.end();
		});
	})
}

module.exports = router;