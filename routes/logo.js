var express = require('express');
var router = express.Router();
var config= require('./config');
var db= require('./model');
var when = require('when');
var utils= require('./utils');

router.get('/',function(req,res){
    db.Users.findOne({
        where:{
            id:req.session.user
        }
    }).then(function(u){
        console.log(JSON.stringify(u));
        if(u.permission_logo!=1&&u.level<10){
            res.json({code:-1,msg:'Permission denied'});
            return;
        }
        if(req.query.type=='json'){
            res.json({logo:u.logo,platform:utils.getPlatform(req),title:'修改logo',page:'logo'})
        }else{
            res.render('logo',{logo:u.logo,platform:utils.getPlatform(req),title:'修改logo',page:'logo'});
        }
    });
});

router.post('/set',function(req,res){
    var logo=req.body.logo?req.body.logo:'';
    db.Users.findOne({
        where:{
            id:req.session.user
        }
    }).then(function(u){
        if(u.permission_logo!=1&&u.level<10){
            res.json({code:-1,msg:'Permission denied'});
            return;
        }
        utils.getChildrenUsers(req.session.user).then(function(users){
            db.Users.update({
                logo:logo
            },{
                where:{
                    id:{
                        in:users
                    }
                }
            }).then(function(r){
                res.json({msg:"ok",code:0});
            });
        });
    });
});

module.exports= router;
