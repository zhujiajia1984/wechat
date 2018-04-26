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
if __name__ == "__main__":   
   """ 
   1.第三方回复加密消息给公众平台；
   2.第三方收到公众平台发送的消息，验证消息的安全性，并对消息进行解密。
   """
   # token = sys.argv[1]
   # encodingAESKey = sys.argv[2]
   # appid = sys.argv[3]
   # from_xml = sys.argv[4]
   # msg_sign  = sys.argv[5]
   # timestamp = sys.argv[6]
   # nonce = sys.argv[7]

   token = "wxPlatformZjj20180424"
   encodingAESKey = "qPcxoOmy62xVVzwSvp2OSVqg6UAzcHO1ORqg8PHVi8q"
   appid = "wx805ef435fca595d2"
   from_xml = """<xml><AppId><![CDATA[wx805ef435fca595d2]]></AppId><Encrypt><![CDATA[oRoRDn1RFBlfwyYs33O4zkuMRjdhTZfrGj9H9tOYO3pIavNSeiJNQ1rE3vNKSVi0UsMaDynAenbfqLQoLIvYnbnTnmRcgnB3T2rs9PcFFyRP6RBgxce70xwDaeGNEdu+R+rQ7udMYiq727zYMOpjdW8ad1i76/NPv1Bh2en2+ifcBUe/zyh0SdHdC9NWX7cvjHsTYTuFQdQipkO+D6POEiB0OWMy+13Fue8KZtkabVRq2yEhcQnWf60cLtdEP+RgKP2mxi+ewPiblAC69+db04jRFpRYwLDgOJo/+sefoZVvdx7LQuAxsCrvi0cMuqsLxyt1I8/WLSxQH/zH0zfm1cdiETwczu52QLYu3ddXBasW8EeC09eIf5golfdvEvLRxOD5w/1s4oamzRzb3v9KQhpKPttGvizM1A44BWP5OODaJcoiqmNHI3iZFpI2gs2x2hOHpwimT4XKT4ANMpbgXg==]]></Encrypt></xml>"""
   msg_sign  = "2b36b2a70b4c59773d95b5a273a1a934a7eece8c"
   timestamp = "1524734617"
   nonce = "49717202"

   #测试解密接口
   decrypt_test = WXBizMsgCrypt(token,encodingAESKey,appid)
   ret ,decryp_xml = decrypt_test.DecryptMsg(from_xml, msg_sign, timestamp, nonce)
   print ret ,decryp_xml
