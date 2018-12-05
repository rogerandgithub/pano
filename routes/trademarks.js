var express = require('express');
var router = express.Router();
var config= require('./config');
var db= require('./model');
var when = require('when');
var utils= require('./utils');


router.get('/bot', function(req, res){

    utils.autologin(req, res, function(sessionuser){

        var groupkey=req.query.groupkey;

        var result={
            groupkey:groupkey
        };

        utils.getChildrenUsers(sessionuser).then(function(users){
            db.Groups.findOne({
                where:{
                    key:groupkey,
                    user_id:{
                        in:users
                    },
                    scenes_id:{
                        ne:"[]"
                    }
                }
            }).then(function(group){
                if(!group){
                    res.json({code:-2,msg:'错误'});
                    return;
                }
                result.bottrademark=group.bottrademark;
                res.json(result);
            });
        });
    });
});


router.get('/',function(req,res){

    utils.autologin(req, res, function(sessionuser){


        var groupkey=req.query.groupkey;
        if(!groupkey){//全局商标
            db.Users.findOne({
                where:{
                    id:sessionuser
                }
            }).then(function(u){
                if(!u.permission_trademark){
                    res.json({msg:'?',code:-1});
                    return;
                }
                var data = {
                    title:'设置全局商标',
                    type:'global',
                    page:'trademark',
                    platform:utils.getPlatform(req),
                    trademark:u.trademark
                };
                var en = req.query.lang=='en'?'en/':'';
                console.log(en);
                if (req.query.type=='json') {
                    res.json(data);
                }else{
                    res.render(en+'trademark',data);
                }
            });
            return;
        }
        var result={
            title:'设置商标',
            type:'',
            page:'trademark',
            groupkey:groupkey,
            platform:utils.getPlatform(req)
        };

        utils.getChildrenUsers(sessionuser).then(function(users){
            db.Groups.findOne({
                where:{
                    key:groupkey,
                    user_id:{
                        in:users
                    },
                    scenes_id:{
                        ne:"[]"
                    }
                }
            }).then(function(group){
                if(!group){
                    res.json({code:-2,msg:'错误'});
                    return;
                }
                db.Scenes.findOne({
                    where:{
                        id:JSON.parse(group.scenes_id)[0]
                    }
                }).then(function(scene){
                    result.trademark=scene.trademark;

                    var en = req.query.lang=='en'?'en/':'';
                    if(req.query.lang=='en')result.title='top trademark';
                    if(req.query.type=='json'){
                        res.json(result);
                    }else{
                        res.render(en+'trademark',result);
                    }
                });
            });
        });
    });
});
router.get('/old',function(req,res){

    utils.autologin(req, res, function(sessionuser){

        var groupkey=req.query.groupkey;
        if(!groupkey){//全局商标
            db.Users.findOne({
                where:{
                    id:sessionuser
                }
            }).then(function(u){
                if(!u.permission_trademark){
                    res.json({msg:'?',code:-1});
                    return;
                }
                res.render('trademark',{
                    title:'设置全局商标',
                    type:'global',
                    page:'trademark',
                    platform:utils.getPlatform(req),
                    trademark:u.trademark
                });
            });
            return;
        }
        var result={
            title:'设置商标',
            type:'',
            page:'trademark',
            groupkey:groupkey,
            platform:utils.getPlatform(req)
        };

        utils.getChildrenUsers(sessionuser).then(function(users){
            db.Groups.findOne({
                where:{
                    key:groupkey,
                    user_id:{
                        in:users
                    },
                    scenes_id:{
                        ne:"[]"
                    }
                }
            }).then(function(group){
                if(!group){
                    res.json({code:-2,msg:'错误'});
                    return;
                }
                db.Scenes.findOne({
                    where:{
                        id:JSON.parse(group.scenes_id)[0]
                    }
                }).then(function(scene){
                    result.trademark=scene.trademark;
                    res.render('trademark',result);
                });
            });
        });
    });
});

router.post('/delete',function(req,res){

    utils.autologin(req, res, function(sessionuser){

        if(req.body.type=='global'){
            db.Users.update({
                trademark:''
            },{
                where:{
                    id:sessionuser
                }
            }).then(function(u){
                res.json({msg:'ok',code:0});
            });
            return;
        }

        utils.getChildrenUsers(sessionuser).then(function(users){
            db.Groups.findOne({
                where:{
                    key:req.body.groupkey,
                    user_id:{
                        in:users
                    },
                    scenes_id:{
                        ne:"[]"
                    }
                }
            }).then(function(group){
                if(!group){
                    res.json({code:-1,msg:'none'});
                    return;
                }
                var scenes_id=JSON.parse(group.scenes_id);
                db.Scenes.update({
                    trademark:''
                },{
                    where:{
                        id:{
                            in:scenes_id
                        }
                    }
                }).then(function(up){
                    res.json({code:0,msg:'ok'});
                });
            });
        });
    });
});

module.exports= router;
