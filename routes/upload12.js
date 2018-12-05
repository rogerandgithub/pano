var express = require('express');
var router = express.Router();
var config= require('./config');
var db= require('./model');
var when = require('when');
var utils= require('./utils');

router.get('/',function(req,res){


    utils.login(req, res, function(userid){

        utils.getexpire(userid).then(function(expire){

            db.Groups.findAll({
                where: {
                    user_id: userid,
                    show: {
                        $gte: 10
                    },
                    scenes_id:{
                        ne:"[]"
                    }
                }
            }).then(function(groups){

                var groupkey = req.query.groupkey?req.query.groupkey:false;
                var scenekey = req.query.scenekey?req.query.scenekey:false;

                if(groupkey){
                    db.Groups.findOne({
                        where:{
                            key: groupkey
                        }
                    }).then(function(group){
                        if(!group){
                            groupkey = false;
                        }
                        if(scenekey){
                            db.Scenes.findOne({
                                where:{
                                    key:scenekey
                                }
                            }).then(function(scene){
                                if(!scene){
                                    scenekey = false;
                                }
                                if(group){
                                    var scenes_id = JSON.parse(group.scenes_id);
                                    if(scenes_id.indexOf(scene.id)==-1){
                                        scenekey = false;
                                    }
                                }
                                var result = {
                                    platform: utils.getPlatform(req),
                                    group: groupkey?group:null,
                                    scene: scenekey?scene:null,
                                    locked: Date.parse(expire)<Date.now()&&groups.length>=200
                                }
                                res.render('upload12', result);
                            });
                        }else{
                            var result = {
                                platform: utils.getPlatform(req),
                                group: groupkey?group:null,
                                scene: scenekey?scene:null,
                                locked: Date.parse(expire)<Date.now()&&groups.length>=200
                            }
                            res.render('upload12', result);
                        }
                    });
                }else{
                    var result = {
                        platform: utils.getPlatform(req),
                        group: null,
                        scene: null,
                        locked: Date.parse(expire)<Date.now()&&groups.length>=200
                    }
                    res.render('upload12', result);
                }
            });
        });
    });
});


router.get('/upload16',function(req,res){

    utils.login(req, res, function(userid){

        utils.getexpire(userid).then(function(expire){

            var expired = Date.parse(expire)<Date.now() && Date.parse(expire)!=0;
            var groupkey = req.query.groupkey?req.query.groupkey:false;
            var scenekey = req.query.scenekey?req.query.scenekey:false;

            if(groupkey){
                db.Groups.findOne({
                    where:{
                        key: groupkey
                    }
                }).then(function(group){
                    if(!group){
                        groupkey = false;
                    }
                    if(scenekey){
                        db.Scenes.findOne({
                            where:{
                                key:scenekey
                            }
                        }).then(function(scene){
                            if(!scene){
                                scenekey = false;
                            }
                            if(group){
                                var scenes_id = JSON.parse(group.scenes_id);
                                if(scenes_id.indexOf(scene.id)==-1){
                                    scenekey = false;
                                }
                            }
                            var result = {
                                platform: utils.getPlatform(req),
                                group: groupkey?group:null,
                                scene: scenekey?scene:null,
                                locked: Date.parse(expire)<Date.now()&&groups.length>=200
                            }
                            res.render('upload16', result);
                        });
                    }else{
                        var result = {
                            platform: utils.getPlatform(req),
                            group: groupkey?group:null,
                            scene: scenekey?scene:null,
                            locked: Date.parse(expire)<Date.now()&&groups.length>=200
                        }
                        res.render('upload16', result);
                    }
                });
            }else{
                var result = {
                    platform: utils.getPlatform(req),
                    group: null,
                    scene: null,
                    locked: Date.parse(expire)<Date.now()&&groups.length>=200
                }
                res.render('upload16', result);
            }
        });
    });
});

module.exports= router;