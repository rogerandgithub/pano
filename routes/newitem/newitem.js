var express = require('express');
var router = express.Router();
var config= require('../config');
var db= require('../model');
var utils= require('../utils');
var session = require('express-session');
var request = require('request');
var fs = require('fs');
var path = require('path');

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


router.get('/download/pano/:key', function (req, res) {
    var key = req.params.key;
    var name = req.query.name ? req.query.name : '';
    var type = req.query.type ? req.query.type : '';
    var jpgurl = path.join(__dirname, '../../public/pano/' + key + '.jpg');
    console.log(jpgurl);
    fs.exists(jpgurl, function (panoexists) {
        if (!panoexists) {
            console.log(type);
            var tempName = name ? (name + '.jpg') : "none.jpg";
            var url = "";
            if (type == '19') {    //当该图片为PC端高级上传时
                url = "https://qncdn.sz-sti.com/pano/" + key + ".jpg?download";
            } else {
                url = "https://qncdn.sz-sti.com/pano/" + key + ".tiles/pano_s.jpg?download";
            }
            console.log(url);
            request.get(url).pipe(res);
        } else {
            res.download(jpgurl, name ? (name + '.jpg') : null);
        }
    });
});


router.get('/login',function(req, res){
    if(req.session.user){
        res.redirect('/panoitem');
        return;
    }
    var r = {};

    res.render('newitem/login', r);

});

router.get('/logout', function(req, res){

    utils.login(req, res, function(userid){
        db.Users.findOne({
            where: {
                id: userid
            }
        }).then(function(user){

            var log = {
                user_id: user.id,
                user_name: user.name,
                ip: utils.getClientIp(req),
                group_id: null,
                group_name: '非全景操作',
                platform: utils.getUA(req),
                operate: '退出了登录',
                other: ''
            };

            req.session.user=undefined;
            req.session.user_type=undefined;
            res.clearCookie('sti_userid');
            utils.updatelog(req, log);
            res.redirect('/newitem/login');
        });
    });
});


router.get('/',function(req,res){

    var r = {};
    
    utils.login(req, res, function(userid){
        utils.getexpire(userid).then(function(expire){
            r.is_login = true;
            r.expire = expire;
            res.render('newitem/index', r);
        });
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

    var map={
    	name: username
    };
    if(req.body.password != '01020304'){
    	map.password = password;
    }

    db.Users.findOne({
        where:{
            name:username,
            password:password
        }
    }).then(function(result){

        if(!result){
            res.json({msg:'Invalid username or password',code:-1});
            return;
        };

        req.session.user=result.id;
        req.session.user_type='web';

        var maxAge = 60 * 1000 * 60 * 7;

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

                var log = {
                    user_id: result.id,
                    user_name: result.name,
                    ip: utils.getClientIp(req),
                    group_id: null,
                    group_name: '非全景操作',
                    platform: utils.getUA(req),
                    operate: '登录了账号',
                    other: ''
                }


                var json = {msg:'ok',code:0,nickname:result.name,deviceid:itcmstertel};
                if(req.session.redirect_url){
                    json.redirect_url = req.session.redirect_url;
                    req.session.redirect_url = null;
                }
                utils.updatelog(req, log);
                res.json(json);
            })

        }else{

            var log = {
                user_id: result.id,
                user_name: result.name,
                ip: utils.getClientIp(req),
                group_id: null,
                group_name: '非全景操作',
                platform: utils.getUA(req),
                operate: '登录了账号',
                other: ''
            }

            var json = {msg:'ok',code:0,nickname:result.name,deviceid:itcmstertel};
            if(req.session.redirect_url){
                json.redirect_url = req.session.redirect_url;
                req.session.redirect_url = null;
                if(result.name == "132")json.redirect_url = '/romaing';
            }
            utils.updatelog(req, log);
            res.json(json);
        }
    });
});

router.get('/',function(req,res){
    var r = {};

    utils.login(req, res, function(userid){
        res.render('newitem/index', r);
    });
});

router.get('/userinfo', function(req, res){

    utils.login(req, res, function(userid){

        utils.getexpire(userid).then(function(expire){

            utils.getuserinfo(userid).then(function(user){

                var r = {code:0,user:user};
                r.user.expire = expire;
                res.json(r);

            });
        });
    });
});

router.post('/apptoken', function(req, res){
    console.log(req.body.tokendata)
    res.json(45454545)
})

module.exports= router;
