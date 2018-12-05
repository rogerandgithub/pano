var express = require('express');
var router = express.Router();
var db= require('../model');
var xss= require('xss');
var utils= require('../utils');
var config= require('../config');
var nodegrass = require('nodegrass');



/* GET home page. */
router.get('/', function(req, res) {
    var r = {};

    utils.login(req, res, function(userid){
        res.render('new/pano', r);
    });
});

router.get('/search', function(req, res){
    res.render('new/search', {});
});

router.get('/json',function(req,res){

    utils.login(req, res, function(userid){

        var r={};
        var gkey2sid={};
        var userinfoarr={};
        var fliteruser=req.query.user?req.query.user.split('|'):null;

        utils.getChildrenUsers(userid,fliteruser).then(function(users){

            var conditions={
                user_id:{
                    in:users
                },
                show:{
                    gte:10
                },
                scenes_id:{
                    ne:"[]"
                }
            };

            db.Groups.findAndCountAll({

                attributes: ['id', 'key', 'city', 'region', 'community', 'business_circle', 'building', 'room', 'user_id', 'scenes_id', 'createdAt', 'updatedAt' ],
                where: conditions,
                order: 'createdAt DESC'

            }).then(function(result){

                r.count = result.count;
                result = result.rows;
                r.romaing = result?result:[];
                r.title = '漫游列表';
                r.page = 'romaing';
                r.platform = utils.getPlatform(req);
                var ids = [];
                var userarr = [];
                for(var i in result){
                    var temp = JSON.parse(result[i].scenes_id);
                    ids = ids.concat(temp);
                    gkey2sid[result[i].key] = temp[0];
                }

                var isFirst = req.cookies.isFirst;
                if(isFirst){
                    r.is_first = false;
                }else{
                    r.is_first = true;
                }

                for(var i in result){
                    userarr.push(result[i].user_id);
                }

                db.Scenes.findAll({
                    where:{
                        id:{
                            in:ids
                        }
                    }
                }).then(function(data){

                    var id2key = {};
                    var id2groupid = {};
                    var id2scenestyle = {};

                    for(var i in data){
                        id2key[data[i].id] = data[i].key;
                        id2groupid[data[i].id] = JSON.parse(data[i].groups_id)[0];
                        id2scenestyle[data[i].id] = data[i].scenestyle;
                    }

                    for(var i in r.romaing){
                        r.romaing[i].dataValues.scene_key = id2key[gkey2sid[r.romaing[i].key]];
                        r.romaing[i].dataValues.groupid = id2groupid[gkey2sid[r.romaing[i].key]];
                        r.romaing[i].dataValues.scenestyle = id2scenestyle[gkey2sid[r.romaing[i].key]];
                        r.romaing[i].scenes_id = undefined;
                        r.romaing[i].key = undefined;
                    }

                    userarr.sort();
                    var re = [userarr[0]];
                    for(var i = 1; i < userarr.length; i++)
                    {
                        if( userarr[i] !== re[re.length-1])
                        {
                            re.push(userarr[i]);
                        }
                    }
                    re.push(userid);

                    db.Users.findAll({
                        attributes: ['id', 'name'],
                        where:{
                            id:{
                                in:re
                            }
                        }
                    }).then(function(userinfo) {

                        for(var i in userinfo){
                            if(!userinfoarr[userinfo[i].id])
                            userinfoarr[userinfo[i].id] = {}; 
                            userinfoarr[userinfo[i].id].nickname = userinfo[i].name;
                            userinfoarr[userinfo[i].id].permission_delete = userinfo[i].permission_delete;
                            userinfoarr[userinfo[i].id].children = userinfo[i].children;
                        }

                        for(var i in r.romaing){
                            var user1 = userinfoarr[r.romaing[i].user_id];
                            r.romaing[i].dataValues.name = user1?user1.nickname:'';
                        }

                        utils.getexpire(userid).then(function(expire){

                            utils.getuserinfo(userid).then(function(user){

                                r.user = user;
                                r.user.expire = expire;

                                res.json(r);

                            });
                        });
                    })
                });
            });
        });
    });
});

router.get('/edit/:id', function(req, res){

    var groupid = req.params.id;

    if(!groupid){
        res.json({code: 404, msg:'Not Found'});
        return;
    }
    
    utils.login(req, res, function(user_id){

        utils.getChildrenUsers(user_id).then(function(users){

            var r;
            var ids=[];
            var owner;

            db.Groups.findOne({
                where:{
                    user_id:{
                        in:users
                    },
                    id:groupid,
                    show:{
                        $gte:10
                    },
                    scenes_id:{
                        ne:'[]'
                    }
                }
            }).then(function(group){
                if(!group){
                    res.json({code:-1,msg:'no such group'});
                    return false;
                }
                owner=group.user_id;

                r={
                    title:group.community+' '+group.building+' '+group.room,
                    platform:utils.getPlatform(req),
                    group:group
                };

                ids=JSON.parse(group['scenes_id']);

                var cover_id = JSON.parse(group.scenes_id);
                r.cover_id = cover_id[0];

                return db.Scenes.findAll({
                    where:{
                        id:{
                            in:ids
                        },
                        show:{
                            gte:0
                        }
                    }
                });
            }).then(function(scenes){

                if(scenes===false){
                    res.json({code:-2,msg:'no scene in the group'});
                    return false;
                }

                for(var sj in scenes){
                    if (scenes[sj].id==r.cover_id) {
                        var arr = scenes.splice(sj,1);
                        scenes.unshift(arr[0]);
                    };
                }

                r.scenes = scenes;

                db.Users.findOne({
                    where:{
                        id:owner
                    }
                }).then(function(u){

                    r.auth={
                        topad: u.permission_trademark,
                        logo: u.permission_logo,
                        prefix: u.permission_prefix
                    }

                    r.content = {
                        prefix: u.prefix
                    }

                    utils.getexpire(u.id).then(function(expire){

                        r.expire = expire;
                        var map_id = JSON.parse(r.group.maps_id)[0];

                        db.Maps.findOne({
                            where: {
                                id: map_id,
                                show:{
                                    $gte:1
                                }
                            }
                        }).then(function(map){
                            r.map = map?map:{};
                            res.render('new/edit',r);
                        });
                    });
                });
            });
        });
    });
});

router.get('/scenes/:id', function(req, res){

    var groupid = req.params.id;
    db.Groups.findOne({
        where:{
            id:groupid
        }
    }).then(function(group){

        var scenes_id = JSON.parse(group.scenes_id);
        var cover_id = scenes_id[0];

        db.Scenes.findAll({
            where:{
                id:{
                    in:scenes_id
                },
                show:{
                    gte:0
                }
            }
        }).then(function(scenes){

            for(var i in scenes){
                if (scenes[i].id==cover_id) {
                    scenes.unshift(scenes.splice(i,1)[0]);
                };
            }
            res.json(scenes);

        });
    });
});

router.get('/editmap/:id', function(req, res){

    var groupid = req.params.id;

    utils.login(req, res, function(userid){

        utils.getChildrenUsers(userid).then(function(users){

            res.render('new/editmap', {});

            // db.Groups.findOne({
            //     where:{
            //         id:groupid,
            //         user_id: {
            //             $in: users
            //         }
            //     }
            // }).then(function(group){

            //     if(!group){
            //         res.json({code:0, msg:'No such group'});
            //         return;
            //     }
            //     if(group.maps_id == '[]'){
            //         res.json({code:0, msg:'No such map'});
            //         return;
            //     }
            //     var map_id = JSON.parse(group.maps_id)[0];
            //     db.Maps.find({
            //         where: {
            //             id: map_id,
            //             show: {
            //                 $gte: 0
            //             }
            //         }
            //     }).then(function(map){
            //         if(!map){
            //             res.json({code:0, msg:'No such map'});
            //             return;
            //         }
            //     })
            // });
        });
    });
});

module.exports = router;
