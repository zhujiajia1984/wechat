// 
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;
var assert = require('assert');

// 微信小程序用户登录信息管理
module.exports = class User {
    constructor(url) {
        this.url = url;
    }

    // 更新用户信息（无则创建，有则更新）
    async updateUser(data) {
        const client = await MongoClient.connect(this.url);
        const db = client.db("test");
        let curDate = new Date();
        let result = await db.collection('wxAppUser').updateOne({ openid: data.openid }, {
            $set: {
                session_key: data.session_key,
                unionid: typeof(data.unionid) == "undefined" ? "" : data.unionid
            }
        }, { upsert: true });
        if (result.upsertedCount == 1) { // 新增
            result = {
                _id: result.upsertedId._id,
                type: "insert"
            }
        } else { // 更新
            assert.equal(1, result.matchedCount);
            assert.equal(1, result.modifiedCount);
            result = {
                type: "update"
            }
        }
        client.close();
        return result;
    }
}