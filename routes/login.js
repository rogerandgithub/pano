var express = require('express');
var router = express.Router();
var config= require('./config');
var db= require('./model');
var utils= require('./utils');
var session = require('express-session');

router.get('/',function(req,res){

    res.redirect('/newitem/login');

    // req.session.user=undefined;
    // req.session.user_type=undefined;
    // res.clearCookie('sti_userid');

    // res.render('login',{
    //     page:'login'
    // });
});

function is_login(req, res){

    if(!req.session.user){
            
        var userid = req.cookies.sti_userid;


        if(!userid){
            
            res.json({msg:'登录过期',code:-99});

        }else{

            client.get(userid, function(err, val){

                if(!val){
                    res.json({msg:'登录过期',code:-98});
                }else{
                    db.Users.findOne({
                        where:{
                            id:val
                        }
                    }).then(function(result){
                        if(!result){  
                            res.json({msg:'用户信息有误',code:-97});
                            return;
                        }
                        req.session.user_type='app';
                        req.session.user=result.id;
                        res.json({code:0,msg:'You logining'});
                    });
                }

            });
        }

    }else{
        res.json({code:0,msg:'You logining'});
    }
}


router.post('/is_login', function(req, res){
    is_login(req, res);
});
router.get('/is_login', function(req, res){
    is_login(req, res);
});

router.post('/',function(req,res){

    var username=req.body.username;
    var password=req.body.password;
    console.log(req.query.lang);

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

            var flag = false;
            var flagarr = [579, 750];

            if(flagarr.indexOf(result.id)!=-1)flag = true;

            if(result.itcmstertel=="inherit"){

                db.Users.findOne({
                    id:result.father
                }).then(function(father){
                    if(father&&father.itcmstertel){
                        itcmstertel = father.itcmstertel;
                    }else{
                        itcmstertel = '';
                    }
                    res.json({msg:'ok',code:0,nickname:result.name,deviceid:itcmstertel,flag:flag});
                })

            }else{
                res.json({msg:'ok',code:0,nickname:result.name,deviceid:result.itcmstertel,flag:flag});
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

module.exports= router;
