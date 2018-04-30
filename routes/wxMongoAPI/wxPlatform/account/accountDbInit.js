/* eslint-disable */
// 执行mongo /data/db/js/wxPlatform/accountDbInit.js
let conn = new Mongo("mongodb_mongodb_1:27017");
let db = conn.getDB("wxPlatform");

// 账号表（表结构定义+索引）
printjson(db.account.drop());
db.createCollection("account", {
    validator: {
        $jsonSchema: {
            required: ["authorizer_appid"],
            properties: {
                authorizer_appid: {
                    bsonType: "string",
                },
            }
        }
    }
});

db.runCommand({
    createIndexes: "account",
    indexes: [{
        key: { authorizer_appid: 1 },
        name: 'authorizer_appid_index',
        background: true
    }, ]
});