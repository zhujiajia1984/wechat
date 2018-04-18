/* eslint-disable */
// 执行mongo /data/db/js/wxAppUserInit.js
let conn = new Mongo("mongodb_mongodb_1:27017");
let db = conn.getDB("test");

// 客户表（表结构定义+索引）
printjson(db.wxAppUser.drop());
db.createCollection("wxAppUser", {
    validator: {
        $jsonSchema: {
            required: ["openid", "session_key", "unionid"],
            properties: {
                openid: {
                    bsonType: "string",
                },
                session_key: {
                    bsonType: "string",
                },
                unionid: {
                    bsonType: "string",
                },
            }
        }
    }
});

db.runCommand({
    createIndexes: "wxAppUser",
    indexes: [{
            key: { openid: 1 },
            name: 'openid_index',
            unique: true,
            background: true
        },
        {
            key: { session_key: 1 },
            name: 'session_key_index',
            background: true
        }, {
            key: { unionid: 1 },
            name: 'unionid_index',
            background: true
        }
    ]
});