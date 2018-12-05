var express = require('express');
var router = express.Router();
var config= require('./config');
var db= require('./model');
var when = require('when');
var utils= require('./utils');

router.get('/',function(req,res){

    utils.autologin(req, res, function(sessionuser){


        var groupkey=req.query.groupkey;
        if(!groupkey){
            res.json({msg:'?',code:-1});
            return;
        }

        var r={page:'maps',groupkey:groupkey};
        r.token = req.query.token?req.query.token:'';
        r['platform']=req.query.platform?req.query.platform:'web';
        var scenes_id=[];
        utils.getChildrenUsers(sessionuser).then(function(users){
            db.Groups.findOne({
                where:{
                    key:groupkey,
                    user_id:{
                        in:users
                    }
                }
            }).then(function(group){
                if(!group){
                    res.json({msg:'?',code:-2});
                    return;
                }

                r.title=group.city+group.region+group.community+' '+group.building+' '+group.room;
                var maps_id=group.maps_id?JSON.parse(group.maps_id):[];
                scenes_id=JSON.parse(group.scenes_id);
                //获取maps
                return db.Maps.findAll({
                    where:{
                        id:{
                            in:maps_id
                        }
                    }
                });
            }).then(function(maps){
                //暂时只有1张沙盘
                r.maps=maps;
                return db.Scenes.findAll({
                    where:{
                        id:{
                            in:scenes_id
                        }
                    }
                });
            }).then(function(scenes){
                r.romaing=scenes;
                //查找链接
                var links_id=[];
                r.mapid2linksid={};
                for(var i in r.maps){
                    var temp=JSON.parse(r.maps[i].links_id);
                    r.mapid2linksid[r.maps[i].id+'']=[];
                    for(j in temp){
                        r.mapid2linksid[r.maps[i].id+''].push(temp[j]);
                        links_id.push(temp[j]);
                    }
                }

                return db.Links.findAll({
                    where:{
                        id:{
                            in:links_id
                        }
                    }
                });
            }).then(function(links){
                var linkid2link={};
                for(var i in links){
                    linkid2link[links[i].id+'']=links[i];
                }
                r.links=linkid2link;
                if (req.query.type=="json") {
                    res.json(r);
                }else{
                    var en = req.query.lang=='en'?'en/':'';
                    if (utils.getPlatform(req).indexOf('pc')!=-1) {
                        res.render(en+'maps_pc',r);
                    }else{
                        res.render(en+'maps',r);
                    }
                }
            });
        });
    });
});

router.post('/delete',function(req,res){

    utils.autologin(req, res, function(sessionuser){

        if(!req.body.mapkey){
            res.json({msg:'k',code:-99});
        }
        var mapkey=req.body.mapkey;
        utils.getChildrenUsers(sessionuser).then(function(users){
            db.Maps.findOne({
                where:{
                    user_id:{
                        in:users
                    },
                    key:mapkey
                }
            }).then(function(map){
                if(!map){
                    res.json({msg:'?',code:-99});
                }
                var groups_id=JSON.parse(map.groups_id);
                var links_id=JSON.parse(map.links_id);
                var map_id=map.id;
                //删除链接
                db.Links.destroy({
                    where:{
                        user_id:{
                            in:users
                        },
                        id:{
                            in:links_id
                        }
                    }
                }).then(function(r){
                    //更新map 
                    db.Maps.update({
                        show:-99,
                        links_id:'[]'
                    },{
                        where:{
                            user_id:{
                                in:users
                            },
                            key:mapkey
                        }
                    }).then(function(r){
                        //更新group

                        db.Groups.findAll({
                            where:{
                                user_id:{
                                    in:users
                                },
                                id:{
                                    in:groups_id
                                }
                            }
                        }).then(function(groups){
                            var qlist=[];
                            for(var i in groups){
                                qlist.push(db.Groups.update({
                                    maps_id:'[]'
                                },{
                                    where:{
                                        id:groups[i].id
                                    }
                                }));
                            }
                            return when.all(qlist);
                        }).then(function(r){
                            res.json({msg:'ok',code:0});
                        });
                    });
                });
            });
        });
    });
});

router.post('/spot-post',function(req,res){

    utils.autologin(req, res, function(sessionuser){

        var data={
            text:req.body.text,
            x:parseFloat(req.body.position_x),
            y:parseFloat(req.body.position_y),
            z:parseFloat(req.body.position_z),
            mapkey:req.body.mapkey,
            type:req.body.type,
            link_id:req.body.link_id,
            go_scene:req.body.go_scene
        };

        if(!utils.isNum(data.type)||
           !utils.isNum(data.go_scene)||
           !data.mapkey){
            res.json({code:-99,msg:'heheda1'});
            return;
        }

        var map,link;

        if(data.link_id){    //修改link
            //查找map
            utils.getChildrenUsers(sessionuser).then(function(users){
                db.Maps.findOne({
                    where:{
                        user_id:{
                            in:users
                        },
                        key:data.mapkey,
                        show:{
                            gte:0
                        }
                    }
                }).then(function(MAP){
                    map=MAP;
                    //查找链接
                    return db.Links.findOne({
                        where:{
                            user_id:{
                                in:users
                            },
                            id:data.link_id
                        }
                    });
                }).then(function(LINK){
                    link=LINK;
                    //检查场景是否是本人创建的
                    return db.Scenes.findAll({
                        where:{
                            id:{
                                in:[data.go_scene]
                            },
                            user_id:{
                                in:users
                            }
                        }
                    });
                }).then(function(SCENES){
                    if(SCENES.length!=1||
                        !map||
                        !link){
                            res.json({code:-4,msg:'what?'});
                            return;
                        }

                    //更新link
                    db.Links.update({
                        text:data.text,
                        type:data.type,
                        scene_id:data.go_scene
                    },{
                        where:{
                            user_id:{
                                in:users
                            },
                            id:data.link_id
                        }
                    }).then(function(result){
                        res.json({code:0,msg:'ok'});
                        return;
                    });
                });
            });
        }else{   //新增link
            if(!utils.isNum(data.x)||
               !utils.isNum(data.y)||
               !utils.isNum(data.z)){
                   res.json({code:-5,msg:'he'});
                   return;
            }
            //查找组
            utils.getChildrenUsers(sessionuser).then(function(users){
                db.Maps.findOne({
                    where:{
                        user_id:{
                            in:users
                        },
                        key:data.mapkey,
                        show:{
                            gte:0
                        }
                    }
                }).then(function(MAP){
                    map=MAP;
                    //检查场景是否是本人创建的
                    return db.Scenes.findOne({
                        where:{
                            id:data.go_scene,
                            user_id:{
                                in:users
                            }
                        }
                    });
                }).then(function(SCENES){
                    if(!SCENES||!map){
                        res.json({code:-6,msg:'what?'});
                        return;
                    }

                    db.Links.create({
                        text:data.text,
                        type:data.type,
                        scene_id:data.go_scene,
                        user_id:SCENES.user_id,
                        position_x:data.x,
                        position_y:data.y,
                        position_z:data.z
                    }).then(function(new_link){

                        var links_id=JSON.parse(map.links_id);
                        links_id.push(new_link.id);
                        ///更新map links_id
                        db.Maps.update({
                            links_id:JSON.stringify(links_id)
                        },{
                            where:{
                                user_id:{
                                    in:users
                                },
                                key:data.mapkey
                            }
                        }).then(function(result){
                            res.json({code:0,msg:'ok',id:new_link.id});
                            return;
                        });
                    });
                });
            });
        }
    });
});


router.post('/spot-delete',function(req,res){

    utils.autologin(req, res, function(sessionuser){

        var link_id=req.body.link_id;
        var mapkey=req.body.mapkey;
        if(!utils.isNum(link_id)||!mapkey){
            res.json({code:-99,msg:'heheda'});
            return;
        }

        //判断链接是不是本人的
        utils.getChildrenUsers(sessionuser).then(function(users){
            db.Links.findOne({
                where:{
                    user_id:{
                        in:users
                    },
                    id:link_id
                }
            }).then(function(result){
                if(!result){
                    res.json({code:-98,msg:'heheda'});
                    return;
                }
                //删除链接
                db.Links.destroy({
                    where:{
                        user_id:{
                            in:users
                        },
                        id:link_id
                    }
                }).then(function(result){

                    //查找map
                    db.Maps.findOne({
                        where:{
                            user_id:{
                                in:users
                            },
                            key:mapkey
                        }
                    }).then(function(map){
                        if(!map){
                            res.json({code:-97,msg:'heheda'});
                            return;
                        }
                        var links_id=JSON.parse(map.links_id);
                        for(var i in links_id){
                            if(links_id[i]==link_id){
                                links_id.splice(i,1);
                                break;
                            }
                        }

                        //更新组
                        db.Maps.update({
                            links_id:JSON.stringify(links_id)
                        },{
                            where:{
                                user_id:{
                                    in:users
                                },
                                key:mapkey
                            }
                        }).then(function(result){
                            res.json({msg:'ok',code:0});
                        });
                    });
                });
            });
        });
    });
});
module.exports= router;
