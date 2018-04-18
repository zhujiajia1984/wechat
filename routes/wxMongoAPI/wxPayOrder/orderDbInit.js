/* eslint-disable */
// 执行mongo /data/db/js/orderDbInit.js
let conn = new Mongo("mongodb_mongodb_1:27017");
let db = conn.getDB("test");

// 客户表（表结构定义+索引）
printjson(db.order.drop());
db.createCollection("order", {
    validator: {
        $jsonSchema: {
            required: ["out_trade_no", "openid", "body", "total_fee"],
            properties: {
                out_trade_no: {
                    bsonType: "string",
                },
                openid: {
                    bsonType: "string",
                },
                body: {
                    bsonType: "string"
                },
                total_fee: {
                    bsonType: "int"
                }
            }
        }
    }
});

db.runCommand({
    createIndexes: "order",
    indexes: [{
            key: { out_trade_no: 1 },
            name: 'out_trade_no_index',
            unique: true,
            background: true
        },
        {
            key: { openid: 1 },
            name: 'openid_index',
            background: true
        }, {
            key: { body: 1 },
            name: 'body_index',
            background: true
        }, {
            key: { total_fee: 1 },
            name: 'total_fee_index',
            background: true
        }
    ]
});