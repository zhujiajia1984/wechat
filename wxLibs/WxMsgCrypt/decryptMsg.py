#!/usr/bin/env python
# -*- coding: utf-8 -*-
#########################################################################
# Author: jonyqin
# Created Time: Thu 11 Sep 2014 03:55:41 PM CST
# File Name: demo.py
# Description: WXBizMsgCrypt 使用demo文件
#########################################################################
from WXBizMsgCrypt import WXBizMsgCrypt
import sys
import redis
if __name__ == "__main__":
   """ 
   1.第三方回复加密消息给公众平台；
   2.第三方收到公众平台发送的消息，验证消息的安全性，并对消息进行解密。
   """   
   token = sys.argv[1]
   encodingAESKey = sys.argv[2]
   appid = sys.argv[3]
   msg_sign  = sys.argv[4]
   timestamp = sys.argv[5]
   nonce = sys.argv[6]
   r = redis.StrictRedis(host='redis_redis_1', port=6379, db=1, password='zjj15202185069')
   key = str(appid) + '_xmlBody';
   from_xml = r.get(key);
   decrypt_test = WXBizMsgCrypt(token,encodingAESKey,appid)
   ret ,decryp_xml = decrypt_test.DecryptMsg(from_xml, msg_sign, timestamp, nonce)
   print decryp_xml

