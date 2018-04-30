/*
    微信第三方平台开发
    API接口:          https://wechat.weiquaninfo.cn/platform/XXX
    授权事件接收URL：  https://wechat.weiquaninfo.cn/platform/auth
    获取预授权码：      https://wechat.weiquaninfo.cn/platform/getPreAuthCode
*/

var express = require('express');
var router = express.Router();
var path = require('path');
var logger = require('../logs/log4js').logger;
var parseString = require('xml2js').parseString;
var exec = require('child_process').exec;
var redisClient = require('../redis');
var https = require('https');

// const
const url = 'mongodb://mongodb_mongodb_1:27017';
const Account = require('./wxMongoAPI/wxPlatform/account/account');
const platform_app_id = "wx805ef435fca595d2";
const platform_app_screct = "2b499358fd347d6dc7e0cb38c384dc61";
const encodingAESKey = "qPcxoOmy62xVVzwSvp2OSVqg6UAzcHO1ORqg8PHVi8q";
const token = "wxPlatformZjj20180424";
const component_access_token_refresh_time = 5400; // component_access_token刷新时间为1小时30分钟

// router
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//授权事件接收URL
router.post('/auth', function(req, res, next) {
    // 解析param
    let { signature, timestamp, nonce, encrypt_type, msg_signature } = req.query;
    if (typeof(signature) === "undefined" || signature === "" || typeof(timestamp) === "undefined" || timestamp === "" ||
        typeof(nonce) === "undefined" || nonce === "" || typeof(encrypt_type) === "undefined" || encrypt_type === "" ||
        typeof(msg_signature) === "undefined" || msg_signature === "") {
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
    }).then((xml) => {
        // step4：解析消息并保存ticket
        return parseXmlAndSaveTicket(xml);
    }).then((data) => {
        switch (data.infoType) {
            case "component_verify_ticket":
                // 每隔10分钟推送ticket，检查component_access_token有效期，如果快过期了，则使用component_verify_ticket更新
                return setComponentAccessToken(data);
            case "authorized":
                // 微信授权成功通知
                return authSuccess(data);
            default:
                return data;
        }
    }).then((result) => {
        logger.info("result:", result);
        res.send("success");
    }).catch((error) => {
        logger.error(error);
        res.status(417).send("error");
    })
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//获取预授权码
router.post('/getPreAuthCode', (req, res, next) => {
    // step1：尝试从redis中获取
    getPreAuthCodeFromRedis().then((result) => {
        return getPreAuthCode(result);
    }).then((result) => {
        res.status(200).send(result);
    }).catch((error) => {
        logger.error(error);
        res.status(417).send(error);
    })
})


// function
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// 微信授权成功
function authSuccess(data) {
    return new Promise((resolve, reject) => {
        let account = new Account(url);
        account.updateByAuthorized(data).then((result) => {
            resolve(result);
        }).catch((error) => {
            reject(error);
        })
    })
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// 重新获取预授权码
function getPreAuthCode(data) {
    return new Promise((resolve, reject) => {
        if (data.msg === "ok") return resolve(data);
        const postData = JSON.stringify({ component_appid: platform_app_id });
        const options = {
            hostname: "api.weixin.qq.com",
            path: `/cgi-bin/component/api_create_preauthcode?component_access_token=${data.component_access_token}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData, 'utf-8')
            }
        };
        const req = https.request(options, (res) => {
            res.setEncoding('utf8');
            let rawData = '';
            res.on('data', (chunk) => {
                rawData += chunk;
            });
            res.on('end', () => {
                // 反馈结果
                let result = JSON.parse(rawData);
                // 保存
                let key = platform_app_id + "_pre_auth_code";
                redisClient.set(key, result.pre_auth_code, 'EX', result.expires_in, (err, reply) => {
                    if (err) return reject(err);
                    return resolve({
                        msg: "ok",
                        pre_auth_code: result.pre_auth_code
                    });
                })
            });
        });
        req.on('error', (e) => {
            reject(`problem with request: ${e.message}`);
        });
        req.write(postData);
        req.end();
    })
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// 从redis中尝试获取预授权码，如果没有则重新获取
function getPreAuthCodeFromRedis() {
    return new Promise((resolve, reject) => {
        let key = platform_app_id + "_pre_auth_code";
        redisClient.get(key, (err, result) => {
            if (err) return reject(err);
            if (result) {
                return resolve({
                    msg: "ok",
                    pre_auth_code: result
                });
            } else {
                let keyToken = platform_app_id + "_component_access_token";
                redisClient.get(keyToken, (err, token) => {
                    if (err) return reject(err);
                    return resolve({
                        msg: "missing",
                        component_access_token: token
                    });
                })
            }
        })
    })
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// 检查component_access_token有效期，如果快过期了，则使用component_verify_ticket更新
function setComponentAccessToken(data) {
    return new Promise((resolve, reject) => {
        let key = data.appid + "_component_access_token";
        redisClient.ttl(key, (err, time) => {
            if (err) return reject(err);
            if (time < component_access_token_refresh_time) {
                // 需要刷新component_access_token
                const postData = JSON.stringify({
                    component_appid: platform_app_id,
                    component_appsecret: platform_app_screct,
                    component_verify_ticket: data.component_verify_ticket,
                });
                const options = {
                    hostname: "api.weixin.qq.com",
                    path: "/cgi-bin/component/api_component_token",
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Content-Length': Buffer.byteLength(postData, 'utf-8')
                    }
                };
                const req = https.request(options, (res) => {
                    res.setEncoding('utf8');
                    let rawData = '';
                    res.on('data', (chunk) => {
                        rawData += chunk;
                    });
                    res.on('end', () => {
                        // 反馈结果
                        let result = JSON.parse(rawData);
                        // 保存
                        redisClient.set(key, result.component_access_token, 'EX', result.expires_in, (err, reply) => {
                            if (err) return reject(err);
                            return resolve("refresh component_access_token ok");
                        })
                    });
                });
                req.on('error', (e) => {
                    reject(`problem with request: ${e.message}`);
                });
                req.write(postData);
                req.end();
            } else {
                // 不需要刷新component_access_token
                resolve("no need refresh component_access_token");
            }
        })
    })
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// 解析解密消息并保存ticket
function parseXmlAndSaveTicket(xml) {
    return new Promise((resolve, reject) => {
        parseString(xml, {
            trim: true,
            explicitArray: false
        }, (err, result) => {
            if (err) {
                return reject(err);
            } else {
                let infoType = result.xml.InfoType;
                if (infoType === "component_verify_ticket") {
                    let component_verify_ticket = result.xml.ComponentVerifyTicket;
                    let key = result.xml.AppId + "_component_verify_ticket";
                    redisClient.set(key, component_verify_ticket, (err, reply) => {
                        if (err) return reject(err);
                        return resolve({
                            appid: result.xml.AppId,
                            infoType: infoType,
                            component_verify_ticket: component_verify_ticket
                        });
                    });
                } else {
                    // 授权成功、取消授权或授权更新
                    let data = result.xml;
                    data.infoType = infoType;
                    return resolve(data);
                }
            }
        });
    })
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// 解密消息
function DecryptMsg(data, xmlData, timestamp, nonce, msg_sign) {
    return new Promise((resolve, reject) => {
        let appid = data.AppId;
        let dir = path.resolve(__dirname, "../wxLibs/WxMsgCrypt");
        let command = `python ${dir}/decryptMsg.py ${token} ${encodingAESKey} ${appid} ${msg_sign} ${timestamp} ${nonce}`;
        exec(command, (err, stdout, stderr) => {
            if (err) return reject(err);
            if (stdout) {
                return resolve(stdout);
            }
            return reject("DecryptMsgError", stdout);
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

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// 保存xml到redis, key为appid
function saveXml(data, xmlData) {
    return new Promise((resolve, reject) => {
        xmlData = xmlData.replace(/\s/g, ""); // 删除空格
        xmlData = xmlData.replace(/[\r\n]/g, ""); // 删除回车
        xmlData = xmlData.replace(/AppId/g, "ToUserName"); // Appid替换为ToUserName
        let key = data.AppId + "_xmlBody";
        redisClient.set(key, xmlData, (err, result) => {
            if (err) return reject(err);
            return resolve(data);
        })
    })
}

//
module.exports = router;