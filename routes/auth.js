var http = require('http');
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var _ = require("underscore");
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var log4js = require('log4js');
var session = require('express-session');
var RedisStore = require('connect-redis')(session);
var db = require('./model');
var utils = require('./utils');
var config = require('./config');
var nodegrass = require('nodegrass');
var wechattoken = require('./wechattoken');

exports.loginFilter = function(req, res, next){
    var user = req.session.user;
    // if (user){
    if (false){
            //正常流程
            //检查是否关注公众号
            if(req.session.user_type=='wechat'){
                db.Users.findOne({
                    where:{
                        id:req.session.user
                    }
                }).then(function(user){
                    if(!user){
                        req.session.user=undefined;
                        req.session.user_type=undefined;
                        res.redirect(req.originalUrl);
                        return;
                    }
                    var wechat_info=JSON.parse(user.wechat_info);
                    if(wechat_info.hasfocused=="1"){
                        next();
                        return;
                    }else{
                        //未关注
                        //重新检查是否关注公众号
                        nodegrass.get("https://api.weixin.qq.com/cgi-bin/user/info?access_token="+wechattoken.access_token+"&openid="+wechat_info.openid+"&lang=zh_CN",function(mp,status,headers){
                            console.log(mp);
                            try{
                                mp=JSON.parse(mp);
                            } catch (e){
                                console.log("WECHAT ERROR");
                                res.json({code:-999,msg:'wechat error'});
                                return;
                            }
                            if(mp.subscribe+""=="1"){
                                //yes 更新数据库
                                wechat_info.hasfocused="1";
                                db.Users.update({
                                    wechat_info:JSON.stringify(wechat_info)
                                },{
                                    where:{
                                        id:req.session.user
                                    }
                                }).then(function(r){
                                    next();
                                });

                            }else{
                                //no 继续
                                next();
                            }
                        });
                    }
                });
            }else{
                next();
            }
    } else {//登录校验失败

        ////是否微信浏览器打开
        // if(config.serverName!='LOCAL'&&req.headers['user-agent']&&req.headers['user-agent'].indexOf('MicroMessenger')>=0&&req.query!=undefined&&req.query.wechat_login!='false'){
        if(false){
            var url=config.domain+req.originalUrl;

            //返回code
            if(req.query.state=='WECHAT_OAUTH_RESPONSE'&&req.query.code!=undefined){
                var code=req.query.code;
                //获取code token
                nodegrass.get("https://api.weixin.qq.com/sns/oauth2/access_token?appid="+config.AppID+"&secret="+config.AppSecret+"&code="+code+"&grant_type=authorization_code",function(data,status,headers){
                    console.log(data);
                    try{
                        data=JSON.parse(data);
                    } catch(e){
                        console.log("WECHAT ERROR");
                        res.json({code:-999,msg:'wechat error'});
                        return;
                    }

                    var access_token=data.access_token;
                    var openid=data.openid;
                    var unionid=data.unionid;
                    var refresh_token=data.refresh_token;
                    var expires_in=data.expires_in;

                    if(!openid){
                        url=url.replace('&redirect_uri=','&m_=');
                        url=url.replace('&code=','&m_=');
                        url=url.replace('&state=','&m_=');
                        res.writeHead(301, {'Location':'https://open.weixin.qq.com/connect/oauth2/authorize?appid='+config.AppID+'&redirect_uri='+utils.urlencode(url)+'&response_type=code&scope=snsapi_userinfo&state=WECHAT_OAUTH_RESPONSE#wechat_redirect'});
                        res.end();
                        return;
                    }

                    //获取详细信息
                    nodegrass.get("https://api.weixin.qq.com/sns/userinfo?access_token="+access_token+"&openid="+openid+"&lang=zh_CN",function(data,status,headers){
                        console.log(data);
                        try{
                            data=JSON.parse(data);
                        } catch(e){
                            console.log("WECHAT ERROR");
                            res.json({code:-999,msg:'wechat error'});
                            return;
                        }
                        if(data.errcode){
                            console.log("https://api.weixin.qq.com/sns/userinfo?access_token="+access_token+"&openid="+openid+"&lang=zh_CN");
                            console.log("ERROR______________");
                            url=url.replace('&redirect_uri=','&m_=');
                            res.writeHead(301, {'Location':'https://open.weixin.qq.com/connect/oauth2/authorize?appid='+config.AppID+'&redirect_uri='+utils.urlencode(url)+'&response_type=code&scope=snsapi_userinfo&state=WECHAT_OAUTH_RESPONSE#wechat_redirect'});
                            res.end();
                            return;
                        }

                        //检查是否关注公众号
                        nodegrass.get("https://api.weixin.qq.com/cgi-bin/user/info?access_token="+wechattoken.access_token+"&openid="+data.openid+"&lang=zh_CN",function(mp,status,headers){
                            console.log(mp);
                            try{
                                mp=JSON.parse(mp);
                            } catch(e){
                                console.log("WECHAT ERROR");
                                res.json({code:-999,msg:'wechat error'});
                                return;
                            }
                            if(mp.errcode){
                                console.log("https://api.weixin.qq.com/sns/userinfo?access_token="+access_token+"&openid="+openid+"&lang=zh_CN");
                                console.log("ERROR______________");
                                url=url.replace('&redirect_uri=','&m_=');
                                res.writeHead(301, {'Location':'https://open.weixin.qq.com/connect/oauth2/authorize?appid='+config.AppID+'&redirect_uri='+utils.urlencode(url)+'&response_type=code&scope=snsapi_userinfo&state=WECHAT_OAUTH_RESPONSE#wechat_redirect'});
                                res.end();
                                return;
                            }

                            db.Users.findOne({
                                where:{
                                    name:data.openid
                                }
                            }).then(function(result){
                                //没在数据库中（首次使用微信登陆）
                                if(!result){
                                    var nickname=data.nickname;
                                    data.nickname='';
                                    data.hasfocused=mp.subscribe+"";
                                    db.Users.create({
                                        name:data.openid,
                                        password:'wechat',
                                        nickname:nickname,
                                        wechat_info:JSON.stringify(data)
                                    }).then(function(result){
                                        console.log("new wechat user!!!!!!!");
                                        req.session.user=result.id;
                                        req.session.user_type="wechat";
                                        next();
                                    });
                                }else{
                                    //已在数据库中
                                    db.Users.findOne({
                                        where:{
                                            id:result.id
                                        }
                                    }).then(function(result){
                                        var wechat_info=JSON.parse(result.wechat_info);
                                        wechat_info.hasfocused=mp.subscribe+"";
                                        db.Users.update({
                                            wechat_info:JSON.stringify(wechat_info)
                                        },{
                                            where:{
                                                id:result.id
                                            }
                                        }).then(function(result2){

                                            console.log("old wechat user!!!!!");
                                            req.session.user=result.id;
                                            req.session.user_type="wechat";
                                            next();
                                        });
                                    });
                                    //已在数据库中
                                }
                            });
                        //检查是否关注公众号 end
                        });
                    });
                });
            }else{
                url=url.replace('&redirect_uri=','&m_=');
                res.writeHead(301, {'Location':'https://open.weixin.qq.com/connect/oauth2/authorize?appid='+config.AppID+'&redirect_uri='+utils.urlencode(url)+'&response_type=code&scope=snsapi_userinfo&state=WECHAT_OAUTH_RESPONSE#wechat_redirect'});
                res.end();
                return;
            }
        //不是微信登陆
        }else{

            //未登录可直接访问的页面
            if (    req.path=='/login'||
                    req.path=='/'||
                    req.path=='/scene'||
                    req.path=='/scene_info'||
                    req.path=='/scene/panoxml'||
                    req.path=='/scene/panorama_webgl'||
                    req.path=='/tools/check_firmware'||
                    req.path=='/wechat'||

                    /////////////////
                    //旧地址 暂时保留
                    req.path=='/check_firmware'||
                    req.path=='/download'||
                    req.path=='/download-temp'||
                    req.path=='/download-houseworld'||
                    //旧地址 暂时保留
                    /////////////////

                    req.path=='/downloads'||
                    req.path=='/downloads/v2'||
                    req.path=='/downloads/temp'||
                    req.path=='/downloads/houseworld'||
                    req.path=='/downloads/houseworldtemp'||

                    req.path=='/upload/trademark/callback'||
                    req.path=='/upload/uploadcallback'||
                    req.path=='/upload/mapuploadcallback'||
                    req.path=='/upload/logouploadcallback'
               ){
                   next();
                   return;
               }

            //所有的ajax都要求有登录态
            if (req.headers["x-requested-with"] == "XMLHttpRequest") {
                res.json({
                    code: 10,
                    message: "Please login"
                });
                return;
            }

            res.redirect('/login');
        }
    }
};

