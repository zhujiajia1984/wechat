/*
	微信公众号自定义菜单配置
	创建菜单：post https://wechat.weiquaninfo.cn/wxMenu
	删除菜单：delete https://wechat.weiquaninfo.cn/wxMenu
*/

var express = require('express');
var router = express.Router();
var logger = require('../logs/log4js').logger;
var redisClient = require('../redis');
var https = require('https');
var menuJson = {
	button: [{
		name: "网页外链",
		type: "view",
		url: "https://test.weiquaninfo.cn/wxWebMobileTest"
	}, {
		name: "图文资讯",
		sub_button: [{
			name: "触摸星地带",
			type: "click",
			key: "cmxdd"
		}]
	}, {
		name: "小程序",
		sub_button: [{
			name: "Hi游+",
			type: "miniprogram",
			appid: "wxce49574d3d0dad43",
			pagepath: "pages/index/index",
			url: "https://test.weiquaninfo.cn/wxWebMobileTest"
		}, {
			name: "Hi游",
			type: "miniprogram",
			appid: "wx65423a2f6908bc55",
			pagepath: "pages/index/index",
			url: "https://test.weiquaninfo.cn/wxWebMobileTest"
		}]
	}]
}

//////////////////////////////////////////////////////////////////////////
// 创建自定义菜单
router.post('/', function(req, res, next) {
	getAccessToken().then((access_token) => {
		return addMenu(access_token);
	}).then((result) => {
		if (result.errcode == 0) {
			// 创建菜单成功
			res.status(200).send("add menu success");
		} else {
			// 创建菜单失败
			logger.error(result);
			res.status(417).send("");
		}
	}).catch((error) => {
		logger.error(error);
		res.status(417).send("");
	})
});

//////////////////////////////////////////////////////////////////////////
// 删除自定义菜单
router.delete('/', function(req, res, next) {
	getAccessToken().then((access_token) => {
		return delMenu(access_token);
	}).then((result) => {
		if (result.errcode == 0) {
			// 删除菜单成功
			res.status(200).send("delete menu success");
		} else {
			// 删除菜单失败
			logger.error(result);
			res.status(417).send("");
		}
	}).catch((error) => {
		logger.error(error);
		res.status(417).send("");
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
// 创建自定义菜单
function addMenu(access_token) {
	return new Promise((resolve, reject) => {
		const postData = JSON.stringify(menuJson);
		const options = {
			hostname: "api.weixin.qq.com",
			path: `/cgi-bin/menu/create?access_token=${access_token}`,
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
				// logger.info("rawData:", rawData);
				resolve(JSON.parse(rawData));
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
// 删除自定义菜单
function delMenu(access_token) {
	return new Promise((resolve, reject) => {
		let url = `https://api.weixin.qq.com/cgi-bin/menu/delete?access_token=${access_token}`;
		https.get(url, (res) => {
			res.setEncoding('binary');
			let rawData = '';
			res.on('data', (chunk) => { rawData += chunk; });
			res.on('end', () => {
				// 删除结果
				resolve(JSON.parse(rawData));
			});
		}).on('error', (e) => {
			return reject(e);
		});
	})
}

//
module.exports = router;