var express = require('express');
var router = express.Router();
var db= require('../model');
var xss= require('xss');
var utils= require('../utils');
var config= require('../config');
var nodegrass = require('nodegrass');



router.get('/edit/:id', function(req, res){

    var sceneid = req.params.id;

    utils.login(req, res, function(user_id){

        utils.getChildrenUsers(user_id).then(function(users){

            db.Scenes.findOne({
                where: {
                    id: sceneid,
                    user_id:{
                        $in:users
                    }
                }
            }).then(function(scene){

                console.log(scene);

                if(!scene){
                    res.json({code:-1,msg:'no such scene'});
                    return false;
                }

                var groupid = JSON.parse(scene.groups_id);

                db.Groups.findOne({
                    where:{
                        user_id:{
                            in:users
                        },
                        id:groupid[0]
                    }
                }).then(function(group){
                    
                    if(!group){
                        res.json({code:-1,msg:'no such group'});
                        return false;
                    }

                    var result = {
                        group: {
                            key: group.key,
                            id: group.id
                        },
                        scene: {
                            key: scene.key,
                            id: scene.id
                        }
                    };

                    if(group.width!=0){

                        result.infowidth = group.width;
                        res.render('new/editscene', result);

                    }else{
                        nodegrass.get('http://7xiljm.com1.z0.glb.clouddn.com/images/scenes/'+scene.key+'/allinone.jpg?imageInfo',function(data, status, headers){

                            result.infowidth = JSON.parse(data).width;

                            db.Groups.update({
                                width: data.width
                            }, {
                                where:{
                                    id: group.id
                                }
                            });
                            res.render('new/editscene', result);
                        });
                    }
                });
            });
        });
    });
});


router.get('/edit/xml/:id', function(req, res){

    var sceneid = req.params.id;
    
    utils.login(req, res, function(user_id){

        utils.getChildrenUsers(user_id).then(function(users){

            var result;
            var ids=[];
            var owner;

            db.Scenes.findAll({
                where: {
                    id: sceneid,
                    user_id:{
                        $in:users
                    },
                    show:{
                        $gte:10
                    },
                }
            }).then(function(scene){


                result.scene = scene[0];//输出当前scene

                var groupid = JSON.parse(scene[0].groups_id)[0];

                db.Groups.findOne({
                    where:{
                        user_id:{
                            in:users
                        },
                        id:sceneid,
                        show:{
                            $gte:10
                        },
                        scenes_id:{
                            $ne:'[]'
                        }
                    }
                }).then(function(group){
                    
                    if(!group){
                        res.json({code:-1,msg:'no such group'});
                        return false;
                    }
                });
            });
        });
    });
});


module.exports = router;
