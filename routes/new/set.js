var express = require('express');
var router = express.Router();
var db= require('../model');
var xss= require('xss');
var utils= require('../utils');
var nodegrass = require('nodegrass');
var config= require('../config');
var request = require('request');
var when = require('when');


router.get('/', function(req, res){

    utils.login(req, res, function(userid){

        var r = {};

        db.Users.findOne({
                attributes: ['prefix','permission_introduction','itcwebsite','company','permission_bgsnd','bgmusic','itccontacts','advertisement','logo','trademark','itccontactstel','itcregion'],
                where: {
                    id: userid
                }
            }).then(function(user){


            var ad = user.advertisement?user.advertisement.split('</div>'):[''];
            var ad1,ad2,ad3;
            if( ad.length>0){
                ad1= ad[0].split('<div>').length>1 ? (ad[0].split('<div>'))[1] : ad[0];
            }
            if( ad.length>1){
                ad2= ad[1].split('<div>').length>1 ? (ad[1].split('<div>'))[1] : ad[1];
            }
            if( ad.length>2){
                ad3= ad[2].split('<div>').length>1 ? (ad[2].split('<div>'))[1] : ad[2];
            }

            r.user = user;
            r.user.info = {
                ad1: ad1,
                ad2: ad2,
                ad3: ad3
            }
            res.render('new/set', r);
        });

    });
    
});


router.post('/changepsw',function(req,res){

    utils.login(req, res, function(sessionuser){

        db.Users.findOne({
            where:{
                password: utils.hex_sha1(req.body.oldpsw+'letian'),
                id:sessionuser
            }
        }).then(function(u){
            if(!u){
                res.json({msg:'Incorrect password',code:-1});
                return;
            }
            db.Users.update({
                password: utils.hex_sha1(req.body.newpsw+'letian')
            },{
                where:{
                    id:sessionuser
                }
            }).then(function(r){

                request({
                    url: 'http://apis.baidu.com/showapi_open_bus/ip/ip?ip=14.154.251.237',
                    headers: {
                        apikey: '5143027707684af3ebd3707303c62616'
                    }
                },function(error, response, data){

                    data = JSON.parse(data);

                    var obj = {
                        user_id: u.id,
                        user_name: u.name,
                        ip: '14.154.251.237',//utils.getClientIp(req),
                        group_id: null,
                        group_name: '非全景操作',
                        platform: utils.getUA(req),
                        region: data.showapi_res_body.region,
                        city: data.showapi_res_body.city,
                        operate: '修改了密码',
                        other: ''
                    };

                    db.Action_log.create(obj).then(function(log){
                        var time = new Date();
                        obj.time = time.getFullYear();
                        obj.time += '-'+(time.getMonth()<10?'0':'')+time.getMonth();
                        obj.time += '-'+(time.getDate()<10?'0':'')+time.getDate();
                        obj.time += ' '+(time.getHours()<10?'0':'')+time.getHours();
                        obj.time += ':'+(time.getMinutes()<10?'0':'')+time.getMinutes();
                        res.json({code:0, msg:'successed', object: obj});
                    });
                });
            });
        });
    });
});


router.post('/delscene',function(req,res){

    var key = req.body.scene_key;
    var id = req.body.id;

    var deletepsw = utils.hex_sha1('muwenhu'+req.body.deletepsw);
    var map = key?{key:key}:{id:id};

    var show;
    var scene_id;
    var scene_type;

    db.Users.findOne({
        where:{
            id:req.session.user
        }
    }).then(function(permission){

        if(permission.permission_delete==0&&permission.level<10){
            res.json({code:-1,msg:'权限不足'});
            return;
        }

        if(permission.deletepsw!=deletepsw){
            res.json({code:-1,msg:'删除密码错误'});
            return;
        }
        
        //删除场景 show-=100
        utils.getChildrenUsers(req.session.user).then(function(users){
            map.user_id = {
                $in: users
            };
            db.Scenes.findOne({
                where:map
            }).then(function(scene){
                if(!scene){
                    res.json({msg:'No such scene',code:-98});
                    return;
                }

                show=scene.show;
                scene_id=scene.id;
                scene_type=scene.type;
                var groupids=JSON.parse(scene.groups_id);

                db.Groups.findAll({
                    where:{
                        id:{
                            in:groupids
                        }
                    }
                }).then(function(groups){
                    var querys=[];
                    for(var i in groups){
                        var links_id=JSON.parse(groups[i].links_id);
                        var delete_links_id=links_id[scene_id+'']?links_id[scene_id+'']:[];

                        var comments_id=JSON.parse(groups[i].comments_id);
                        var delete_comments_id=comments_id[scene_id+'']?comments_id[scene_id+'']:[];

                        var scenes_id=JSON.parse(groups[i].scenes_id);
                        for(var j in scenes_id){
                            if(scenes_id[j]==scene_id){
                                scenes_id.splice(j,1);
                                break;
                            }
                        }

                        //加入列表
                        delete(links_id[scene_id+'']);
                        delete(comments_id[scene_id+'']);

                        if(scene_type==0){
                            querys.push(db.Groups.update({
                                scenes_id:JSON.stringify(scenes_id),
                                links_id:JSON.stringify(links_id),
                                comments_id:JSON.stringify(comments_id)
                            },{
                                where:{
                                    user_id:groups[i].user_id,
                                    key:groups[i].key
                                }
                            }));
                        } else if(scene_type==1){
                            querys.push(db.Groups.update({
                                scenes_id:JSON.stringify(scenes_id),
                                links_id:JSON.stringify(links_id),
                                comments_id:JSON.stringify(comments_id)
                            },{
                                where:{
                                    user_id:groups[i].user_id,
                                    key:groups[i].key
                                }
                            }));
                        }
                        querys.push(db.Links.destroy({
                            where:{
                                id:{
                                    in:delete_links_id
                                }
                            }
                        }));
                        querys.push(db.Comments.destroy({
                            where:{
                                id:{
                                    in:delete_comments_id
                                }
                            }
                        }));
                    }

                    when.all(querys).then(function(result){

                        db.Scenes.update({
                            show:show%10-100
                        },{
                            where:map
                        }).then(function(result){

                            request({
                                url: 'http://apis.baidu.com/showapi_open_bus/ip/ip?ip=14.154.251.237',
                                headers: {
                                    apikey: '5143027707684af3ebd3707303c62616'
                                }
                            },function(error, response, data){

                                data = JSON.parse(data);

                                db.Action_log.create({
                                    user_id: permission.id,
                                    user_name: permission.name,
                                    ip: '14.154.251.237',//utils.getClientIp(req),
                                    type: 2,
                                    group_id: groups[0].id,
                                    group_name: groups[0].city+' '+groups[0].community+' '+groups[0].room,
                                    platform: utils.getUA(req),
                                    region: data.showapi_res_body.region,
                                    city: data.showapi_res_body.city,
                                    operate: '删除了 '+scene.name,
                                    other: ''
                                }).then(function(log){
                                    res.json({code:0, msg:'successed'});
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});

router.post('/delpano',function(req,res){
    
    var groupid = req.body.id?parseInt(req.body.id):'';
    var groupkey;
    var show;
    var deletepsw = utils.hex_sha1('muwenhu'+req.body.deletepsw);

    utils.login(req, res, function(userid){


        utils.getChildrenUsers(userid).then(function(users){

            db.Groups.findOne({
                where:{
                    user_id:{
                        $in:users
                    },
                    id:groupid
                }
            }).then(function(group){
                if(!group){
                    res.json({code:-3,msg:'No such group'});
                    return;
                }
                db.Users.findOne({
                    where:{
                        id:req.session.user
                    }
                }).then(function(permission){

                    if(permission.permission_delete==0&&permission.level<10){
                        res.json({code:-1,msg:'权限不足'});
                        return;
                    }

                    if(permission.deletepsw!=deletepsw){
                        if(req.query.lang=='en'){
                            res.json({code:-2,msg:'Incorrect Delete Password'});
                        }else{
                            res.json({code:-2,msg:'删除密码错误'});
                        }
                        return;
                    }
                    
                    show=group.show-10;
                    var links_id=JSON.parse(group.links_id);
                    var comments_id=JSON.parse(group.comments_id);

                    var links_map={};
                    for(var i in links_id){
                        for(var j in links_id[i]){
                            if(!links_map[links_id[i][j]]){
                                links_map[links_id[i][j]]=links_id[i][j];
                            }
                        }
                    }
                    links_id=[];
                    for(var i in links_map){
                        links_id.push(links_map[i]);
                    }

                    var comments_map={};
                    for(var i in comments_id){
                        for(var j in comments_id[i]){
                            if(!comments_map[comments_id[i][j]]){
                                comments_map[comments_id[i][j]]=comments_id[i][j];
                            }
                        }
                    }
                    comments_id=[];
                    for(var i in comments_map){
                        comments_id.push(comments_map[i]);
                    }
                    var scenes_id=JSON.parse(group.scenes_id);

                    //删除相关link
                    db.Links.destroy({
                        where:{
                            id:{
                                in:links_id
                            }
                        }
                    }).then(function(result){
                        //删除相关comment
                        return db.Comments.destroy({
                            where:{
                                id:{
                                    in:comments_id
                                }
                            }
                        })
                    }).then(function(result){
                        //更新group
                        db.Groups.update({
                            show:show,
                            scenes_id:"[]",
                            links_id:"{}",
                            comments_id:"{}"
                        },{
                            where:{
                                user_id:group.user_id,
                                id:groupid,
                                show:{
                                    gte:10
                                }
                            }
                        }).then(function(result){
                            db.Scenes.update({
                                show:-99
                            },{
                                where:{
                                    id:{
                                        in:scenes_id
                                    }
                                }
                            }).then(function(a){

                                request({
                                    url: 'http://apis.baidu.com/showapi_open_bus/ip/ip?ip=14.154.251.237',
                                    headers: {
                                        apikey: '5143027707684af3ebd3707303c62616'
                                    }
                                },function(error, response, data){

                                    data = JSON.parse(data);

                                    db.Action_log.create({
                                        user_id: permission.id,
                                        user_name: permission.name,
                                        ip: '14.154.251.237',//utils.getClientIp(req),
                                        type: 2,
                                        group_id: group.id,
                                        group_name: group.city+' '+group.community+' '+group.room,
                                        platform: utils.getUA(req),
                                        region: data.showapi_res_body.region,
                                        city: data.showapi_res_body.city,
                                        operate: '删除了全景',
                                        other: ''
                                    }).then(function(log){
                                        res.json({code:0, msg:'successed'});
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});

module.exports = router;
