var redis = require('redis');

// RedisClient：连接Redis服务器
var portR = '6379';
var ipR = 'redis_redis_1';
var optionR = { auth_pass: 'zjj15202185069' };
var redisClient = redis.createClient(portR, ipR, optionR);

// 选择db1数据库
redisClient.select(1, (err) => {
	if (err) return console.log(err);
	console.log('redis db1 switch');
});

// redis服务器连接成功事件
redisClient.on('ready', function(err) {
	if (err) {
		console.log(err);
	} else {
		console.log('connect redis server OK');
	}
})

module.exports = redisClient;