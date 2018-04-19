// 
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;
var assert = require('assert');
var moment = require('moment');

// 微信小程序用户登录信息管理
module.exports = class User {
    constructor(url) {
        this.url = url;
    }

    // 更新用户信息（无则创建，有则更新）
    async updateUser(data) {
        const client = await MongoClient.connect(this.url);
        const db = client.db("test");
        let curTimeStamp = moment().unix();
        let result = await db.collection('wxAppUser').findOneAndUpdate({ openid: data.openid }, {
            $set: {
                session_key: data.session_key,
                unionid: typeof(data.unionid) == "undefined" ? "" : data.unionid,
                lastModified: curTimeStamp
            }
        }, {
            upsert: true,
            projection: { _id: 1, lastModified: 1 },
            returnOriginal: false
        });
        assert.equal(1, result.ok);
        assert.equal(1, result.lastErrorObject.n);
        result = {
            id: result.value._id,
            lastModified: result.value.lastModified,
        }
        client.close();
        return result;
    }
    // 查询用户（通过_id和lastModified）
    async findUser(data) {
        const client = await MongoClient.connect(this.url);
        const db = client.db("test");
        let result = await db.collection('wxAppUser').findOne({
            _id: new ObjectID(data._id),
            lastModified: data.lastModified
        }, { projection: { openid: 1, unionid: 1 } });
        client.close();
        return result;
    }
}