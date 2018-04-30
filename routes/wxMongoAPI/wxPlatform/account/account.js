// 
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;
var assert = require('assert');
var moment = require('moment');

// 微信第三方平台用户授权
module.exports = class User {
    constructor(url) {
        this.url = url;
    }

    // 授权成功后通知：更新授权账号（无则创建，有则更新）
    async updateByAuthorized(data) {
        const client = await MongoClient.connect(this.url);
        const db = client.db("wxPlatform");
        let result = await db.collection('account').updateOne({
            authorizer_appid: data.AuthorizerAppid,
            component_appid: data.AppId
        }, {
            $set: {
                createTime: data.CreateTime
            }
        }, {
            upsert: true
        });
        client.close();
        return result;
    }

}