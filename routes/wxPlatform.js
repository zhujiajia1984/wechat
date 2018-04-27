/*
	微信第三方平台开发
	API接口: 			https://wechat.weiquaninfo.cn/platform/XXX
	授权事件接收URL： 	https://wechat.weiquaninfo.cn/platform/auth
*/

var express = require('express');
var router = express.Router();
var path = require('path');
var logger = require('../logs/log4js').logger;
var parseString = require('xml2js').parseString;
var exec = require('child_process').exec;
var redisClient = require('../redis');

// const
const encodingAESKey = "qPcxoOmy62xVVzwSvp2OSVqg6UAzcHO1ORqg8PHVi8q";
const token = "wxPlatformZjj20180424";

// router
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//授权事件接收URL
router.post('/auth', function (req, res, next) {
    // 解析param
    let {signature, timestamp, nonce, encrypt_type, msg_signature} = req.query;
    if (typeof(signature) === "undefined" || signature === "" || typeof(timestamp) === "undefined" || timestamp === ""
        || typeof(nonce) === "undefined" || nonce === "" || typeof(encrypt_type) === "undefined" || encrypt_type === ""
        || typeof(msg_signature) === "undefined" || msg_signature === "") {
        // 缺少参数
        logger.error("query need!");
        res.status(417).send("query need!");
        return;
    }
    var xmlData = req.body;
    if (typeof(xmlData) === "undefined" || xmlData === "") {
        // 缺少body
        logger.error("body need!");
        res.status(417).send("body need!");
        return;
    }
    // step1：解析xml
    parseWxString(xmlData).then((data) => {
        // step2：保存xml
        return saveXml(data, xmlData);
    }).then((data) => {
        // step3：解密消息
        return DecryptMsg(data, xmlData, timestamp, nonce, msg_signature);
    }).then((result) => {
        logger.info("result:", result);
        res.send("success");
    }).catch((error) => {
        logger.error(error);
        res.status(417).send("error");
    })
});

// function
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// 保存xml到redis, key为appid
function saveXml(data, xmlData) {
    return new Promise((resolve, reject) => {
        xmlData = xmlData.replace(/\s/g, "");   // 删除空格
        xmlData = xmlData.replace(/[\r\n]/g, "");   // 删除回车
        redisClient.set(data.AppId, xmlData, (err, result) => {
            if (err) return reject(err);
            return resolve(data);
        })
    })
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// 解析微信发来的消息xml
function DecryptMsg(data, xmlData, timestamp, nonce, msg_sign) {
    return new Promise((resolve, reject) => {
        let appid = data.AppId;
        let dir = path.resolve(__dirname, "../wxLibs/WxMsgCrypt");
        let command = `python ${dir}/decryptMsg.py ${token} ${encodingAESKey} ${appid} ${msg_sign} ${timestamp} ${nonce}`;
        exec(command, (err, stdout, stderr) => {
            if (err) return reject(err);
            return resolve(stdout);
        })
    })
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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

//
module.exports = router;