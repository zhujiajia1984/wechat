// 
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;
var assert = require('assert');

// 订单管理
module.exports = class Order {
    constructor(url) {
        this.url = url;
    }

    // 新增订单
    async addOrder(data) {
        const client = await MongoClient.connect(this.url);
        const db = client.db("test");
        let curDate = new Date();
        let result = await db.collection('order').insertOne({
            out_trade_no: data.out_trade_no,
            openid: data.openid,
            body: data.body,
            total_fee: data.total_fee,
            payResult: data.payResult
        });
        assert.equal(1, result.insertedCount);
        client.close();
        return result.ops[0];
    }
}