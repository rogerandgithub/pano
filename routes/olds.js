var express = require('express');
var router = express.Router();
var config= require('./config');
var db= require('./model');
var when = require('when');
var utils= require('./utils');

//旧接口
//统计房源数量
router.post('/count_all',function(req,res){
    res.redirect('/tools'+req.originalUrl);
});

router.get('/exports',function(req,res){
    res.redirect('/tools'+req.originalUrl);
});

router.get('/check_firmware',function(req,res){
    res.redirect('/tools'+req.originalUrl);
});

//旧下载地址 暂时保留
router.get('/download',function(req,res){
    res.redirect('/downloads');
});

router.get('/download-houseworld',function(req,res){
    res.redirect('/downloads/houseworld');
});

router.get('/download-temp',function(req,res){
    res.redirect('/downloads/temp');
});
//旧下载地址 暂时保留

////旧接口 准备遗弃 转移到/settings/change_password
router.post('/changepassword',function(req,res){
    var current_password=req.body.current_password;
    var new_password=req.body.new_password;
    db.Users.findOne({
        where:{
            id:req.session.user,
            password:current_password
        }
    }).then(function(user){
        if(!user){
            res.json({code:-1,msg:'密码错误'});
            return;
        }
        db.Users.update({
            password:new_password
        },{
            where:{
                id:req.session.user
            }
        }).then(function(up){
            res.json({code:0,msg:'ok'});
        });
    });
});
////旧接口 准备遗弃 转移到/settings/change_password

module.exports= router;
