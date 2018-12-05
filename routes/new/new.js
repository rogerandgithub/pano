var express = require('express');
var router = express.Router();
var config= require('../config');
var db= require('../model');
var utils= require('../utils');
var session = require('express-session');
var request = require('request');


router.get('/login',function(req,res){

    if(req.session.user){
        res.redirect('/pano');
        return;
    }

    var r = {};

    res.render('new/login', r);

});

router.get('/logout', function(req, res){

    utils.login(req, res, function(userid){
        db.Users.findOne({
            where: {
                id: userid
            }
        }).then(function(user){

            user?
            request({
                url: 'http://apis.baidu.com/showapi_open_bus/ip/ip?ip=14.154.251.237',
                headers: {
                    apikey: '5143027707684af3ebd3707303c62616'
                }
            },function(error, response, data){

                data = JSON.parse(data);

                db.Action_log.create({
                    user_id: user.id,
                    user_name: user.name,
                    ip: '14.154.251.237',//utils.getClientIp(req),
                    group_id: null,
                    group_name: '非全景操作',
                    platform: utils.getUA(req),
                    region: data.showapi_res_body.region,
                    city: data.showapi_res_body.city,
                    operate: '退出了登录',
                    other: ''
                }).then(function(log){

                    req.session.user=undefined;
                    req.session.user_type=undefined;
                    res.clearCookie('sti_userid');
                    res.redirect('/new/login');
                });
            }):
            res.redirect('/new/login');
        });
    });
});

router.get('/',function(req,res){
    var r = {};
    r.is_login = !!req.session.user;
    res.render('new/index', r);
});

router.get('/download',function(req,res){
    var r = {};
    request({
        url: 'http://suteng.oss-cn-shenzhen.aliyuncs.com/config?v='+Date.now(),
    }, function(error, response, body){
        // res.send(body);
        if(error||!body){
            res.json({code:-404, error: err});
            return;
        }
        body = JSON.parse(body);
        r.platform = utils.getPlatform(req);
        r.body = body;
        res.render('new/download',r);
    });
});

router.post('/is_login', function(req, res){

    if(!req.session.user){

        var userid = req.cookies.sti_userid;
        if(!userid){
            res.json({code:-98,msg:"You had login"});
        }else{
            utils.redis.get(userid, function(err, val){

                if(err)console.log(err);
                if(!val){
                    res.json({code:-98,msg:"You had login"});
                }else{
                    res.json({code:0,msg:'You logining'});
                }
            });
        }

    }else{
        res.json({code:0,msg:'You logining'});
    }
});

router.post('/',function(req,res){

    var username=req.body.username;
    var password=utils.hex_sha1(req.body.password+'letian');

    db.Users.findOne({
        where:{
            name:username,
            password:password
        }
    }).then(function(result){

        if(result){

            req.session.user=result.id;
            req.session.user_type='web';

            var maxAge = 60 * 1000 * 60 * 7;
            // var maxAge = 7 * 24 * 60 * 60 * 1000;

            var userid = utils.hex_sha1(Date.now()+'muwenhu'+Math.random());

            res.cookie('sti_userid',userid,{maxAge:maxAge, httpOnly:true});

            utils.redis.set(userid, result.id);

            utils.redis.expire(userid, (maxAge/1000));

            var itcmstertel = result.itcmstertel;

            if(result.itcmstertel=="inherit"){

                db.Users.findOne({
                    id:result.father
                }).then(function(father){

                    if(father&&father.itcmstertel){
                        itcmstertel = father.itcmstertel;
                    }else{
                        itcmstertel = '';
                    }

                    request({
                        url: 'http://apis.baidu.com/showapi_open_bus/ip/ip?ip=14.154.251.237',
                        headers: {
                            apikey: '5143027707684af3ebd3707303c62616'
                        }
                    },function(error, response, data){

                        data = JSON.parse(data);

                        db.Action_log.create({
                            user_id: result.id,
                            user_name: result.name,
                            ip: '14.154.251.237',//utils.getClientIp(req),
                            group_id: null,
                            group_name: '非全景操作',
                            platform: utils.getUA(req),
                            region: data.showapi_res_body.region,
                            city: data.showapi_res_body.city,
                            operate: '登录了账号',
                            other: ''
                        }).then(function(log){
                            res.json({msg:'ok',code:0,nickname:result.name,deviceid:itcmstertel});
                        });
                    });
                    
                })

            }else{
                request({
                    url: 'http://apis.baidu.com/showapi_open_bus/ip/ip?ip=14.154.251.237',
                    headers: {
                        apikey: '5143027707684af3ebd3707303c62616'
                    }
                },function(error, response, data){

                    data = JSON.parse(data);

                    db.Action_log.create({
                        user_id: result.id,
                        user_name: result.name,
                        ip: '14.154.251.237',//utils.getClientIp(req),
                        group_id: null,
                        group_name: '非全景操作',
                        platform: utils.getUA(req),
                        region: data.showapi_res_body.region,
                        city: data.showapi_res_body.city,
                        operate: '登录了账号',
                        other: ''
                    }).then(function(log){
                        res.json({msg:'ok',code:0,nickname:result.name,deviceid:itcmstertel});
                    });
                });
            }
        }else{
            if(req.query.lang=='en'){
                res.json({msg:'account or password is wrong',code:-1});
            }else{
                res.json({msg:'密码错误或用户不存在',code:-1});
            }
        }
    });
});

router.get('/',function(req,res){
    var r = {};

    utils.login(req, res, function(userid){
        res.render('new/index', r);
    });
});

module.exports= router;
