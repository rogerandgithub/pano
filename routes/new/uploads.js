var express = require('express');
var router = express.Router();
var config= require('../config');
var db= require('../model');
var when = require('when');
var utils= require('../utils');

router.get('/',function(req,res){


    if(!req.session.user){
        res.redirect('new/login');
        return;
    }

    var groupid = req.query.id?req.query.id:false;
    var sceneid = req.query.sceneid?req.query.sceneid:false;

    if(groupid){
        db.Groups.findOne({
            where:{
                id: groupid
            }
        }).then(function(group){
            if(!group){
                groupid = false;
            }
            if(sceneid){
                db.Scenes.findOne({
                    where:{
                        id:sceneid
                    }
                }).then(function(scene){
                    if(!scene){
                        sceneid = false;
                    }
                    if(group){
                        var scenes_id = JSON.parse(group.scenes_id);
                        if(scenes_id.indexOf(scene.id)==-1){
                            sceneid = false;
                        }
                    }
                    var result = {
                        platform: utils.getPlatform(req),
                        group: groupid?group:null,
                        scene: sceneid?scene:null
                    }
                    res.render('new/upload', result);
                });
            }else{
                var result = {
                    platform: utils.getPlatform(req),
                    group: groupid?group:null,
                    scene: sceneid?scene:null
                }
                res.render('new/upload', result);
            }
        });
    }else{
        var result = {
            platform: utils.getPlatform(req),
            group: null,
            scene: null
        }
        res.render('new/upload', result);
    }
});

module.exports = router;
