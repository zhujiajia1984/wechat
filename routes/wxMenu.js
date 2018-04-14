/*
	微信公众号自定义菜单配置
	创建菜单：post http://wechat.weiquaninfo.cn/wxMenu
	删除菜单：delete http://wechat.weiquaninfo.cn/wxMenu
*/

var express = require('express');
var router = express.Router();
var logger = require('../logs/log4js').logger;

//////////////////////////////////////////////////////////////////////////
// 创建自定义菜单
router.post('/', function(req, res, next) {
	res.send("menuCreate");
});

//////////////////////////////////////////////////////////////////////////
// 删除自定义菜单
router.delete('/', function(req, res, next) {
	res.send("menuDel");
});

//
module.exports = router;