/**
 * Created by zjj on 2017/3/30.
 */
// 引入日志模块
var log4js = require("log4js");
log4js.configure({
	appenders: {
		out: {
			type: 'stdout',
			layout: { type: 'colored' }
		},
		log_date: {
			type: 'dateFile',
			filename: '/home/node/wechat/logs/log_date/dateLog',
			alwaysIncludePattern: true,
			pattern: "-yyyy-MM-dd.log",
			keepFileExt: true,
		},
	},
	categories: {
		default: { appenders: ['out', 'log_date'], level: 'ALL' }, //默认
	}
})

// 生成使用对象
var dateLog = log4js.getLogger('default');

// 输出对象
exports.logger = dateLog;