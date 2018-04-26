/*
	微信第三方平台开发
	API接口: 			https://wechat.weiquaninfo.cn/platform/XXX
	授权事件接收URL： 	https://wechat.weiquaninfo.cn/platform/auth
*/

var express = require('express');
var router = express.Router();
var logger = require('../logs/log4js').logger;
var parseString = require('xml2js').parseString;

// const

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
    let xmlData = req.body;
    if(typeof(xmlData) === "undefined" || xmlData === ""){
        // 缺少body
        logger.error("body need!");
        res.status(417).send("body need!");
        return;
    }
    // step1：解析xml
    logger.info("xmlData：", xmlData);
    parseWxString(xmlData).then((rawData) => {
        // step2：校验sign
        logger.info("rawData:", rawData);
        res.send("success");
    }).catch((error)=>{
        logger.error(error);
        res.status(417).send("error");
    })
});

// function
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