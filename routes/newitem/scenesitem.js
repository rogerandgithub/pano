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
            db.Users.findOne({
                where:{
                    id: user_id
                }
            }).then(function(user){
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

                    db.Groups.findOne({
                        where:{
                            user_id:{
                                $in:users
                            },
                            id: scene.group_id
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
                            },
                            platform: utils.getPlatform(req)
                        };
                        
                        result.user = user;
                        if(group.width!=0||scene.type==5||scene.type==6){

                            result.infowidth = group.width;
                            res.render('newitem/editscene', result);

                        }else{
                            nodegrass.get('http://qncdn.sz-sti.com/images/scenes/'+scene.key+'/allinone.jpg?imageInfo',function(data, status, headers){

                                try{
                                	result.infowidth = JSON.parse(data).width;
                                }catch(err){
                                	result.infowidth = 1024;
                                }
                                

                                db.Groups.update({
                                    width: data.width
                                }, {
                                    where:{
                                        id: group.id
                                    }
                                });
                                res.render('newitem/editscene', result);
                            });
                        }
                    });
                });
            })
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



router.get('/editxml', function(req, res) {
    if(!req.query.key){
        res.json({code:-1,msg:'?'});
        return;
    }
    var result={};
    result.width=req.query.width?req.query.width:1024;
    result.imageHeight=req.query.imageHeight!=0?req.query.imageHeight:350;
    result.scene_key=req.query.key;

    result.rx=req.query.rx?req.query.rx:0;
    result.ry=req.query.ry?req.query.ry:0;
    result.is_360=req.query.is_360;

    db.Scenes.findOne({
        where:{
            key:req.query.key,
            show:{
                gte:0
            }
        }
    }).then(function(s){
        if(!s){
            res.json({code:-2,msg:'No such scene'});
            return;
        }
        result.scene=s;

        db.Groups.findOne({
            where:{
                id: s.group_id
            }
        }).then(function(g){
            if(!g){
                res.json({code:-3,msg:'No such group'});
                return;
            }
            result.group_info=g;

            var lid2info=[];

            db.Scenes.findAll({
                where:{
                    id:{
                        in:JSON.parse(g.scenes_id)
                    },
                    show:{
                        gte:0
                    }
                }
            }).then(function(romaing){
                var cover_id = JSON.parse(g.scenes_id);
                    cover_id = cover_id[0];

                var links_id=JSON.parse(g.links_id);

                var link_id_arr = [];

                for(var i in links_id){
                    link_id_arr=link_id_arr.concat(links_id[i]);
                }

                db.Links.findAll({
                    where:{
                        id:{
                            in:link_id_arr
                        }
                    }
                }).then(function(all_links){

                    var links_object = {};
                    var links_id=JSON.parse(result.group_info.links_id);

                    var link_to_id;

                    for(var i in all_links){

                        var x=all_links[i].position_x;
                        var z=all_links[i].position_y;
                        var y=all_links[i].position_z;
                        var r=utils.distance3D(x,y,z,0,0,0);
                        var rx=Math.asin(z/r);
                        var ry=Math.asin(y/r/Math.cos(rx));
                        if(x<0){
                            ry=ry>0?Math.PI-ry:-Math.PI-ry;
                        }

                        all_links[i].rx=-rx*180/Math.PI;
                        all_links[i].ry=ry*180/Math.PI;

                        for(var g in links_id){
                            if(links_id[g].indexOf(all_links[i].id)!=-1){
                                link_to_id = g;
                            }
                        }

                        if(links_object[link_to_id]){
                            links_object[link_to_id].push(all_links[i]);
                        }else{
                            links_object[link_to_id]=[all_links[i]];
                        }
                    }

                    for(var r in romaing){
                        if(links_object[romaing[r].id]){
                            romaing[r].links=links_object[romaing[r].id];
                        }else{
                            romaing[r].links=[];
                        }
                    }

                    var commentId=JSON.parse(result.group_info.comments_id);
                    var comments_id=[];

                    for(var i in commentId){
                        comments_id.push(commentId[i]);
                    }

                    db.Comments.findAll({
                        where:{
                            id:comments_id
                        }
                    }).then(function(allcomments){

                        var comments_object={};
                        var comment_to_id;

                        for(var i in allcomments){

                            var x=allcomments[i].position_x;
                            var z=allcomments[i].position_y;
                            var y=allcomments[i].position_z;
                            var r=utils.distance3D(x,y,z,0,0,0);
                            var rx=Math.asin(z/r);
                            var ry=Math.asin(y/r/Math.cos(rx));
                            if(x<0){
                                ry=ry>0?Math.PI-ry:-Math.PI-ry;
                            }

                            allcomments[i].rx=-rx*180/Math.PI;
                            allcomments[i].ry=ry*180/Math.PI;

                            for(var g in commentId){
                                if(commentId[g].indexOf(allcomments[i].id)!=-1){
                                    comment_to_id = g;
                                }
                            }

                            if(comments_object[comment_to_id]){
                                comments_object[comment_to_id].push(allcomments[i]);
                            }else{
                                comments_object[comment_to_id]=[allcomments[i]];
                            }
                        }

                        for(var r in romaing){
                            if(comments_object[romaing[r].id]){
                                romaing[r].comments=comments_object[romaing[r].id];
                            }else{
                                romaing[r].comments=[];
                            }
                        }

                        for(var sj in romaing){
                            if (romaing[sj].key==req.query.key) {
                                var arr = romaing.splice(sj,1);
                                romaing.unshift(arr[0]);
                            };
                        }


                        result.cover_id=cover_id;

                        db.Comments.findAll({
                            where:{
                                type: 1,
                                reply_id:result.group_info.id
                            }
                        }).then(function(imgcomment){

                            if(!imgcomment){
                                imgcomment = [];
                            }

                            var imgcommentObj = {};
                            for(var ic in imgcomment){
                                if(!imgcommentObj[imgcomment[ic].is_description]){
                                    imgcommentObj[imgcomment[ic].is_description] = [imgcomment[ic]];
                                }else{
                                    imgcommentObj[imgcomment[ic].is_description].push(imgcomment[ic]);
                                }
                            }
                            for(var sic in romaing){
                                romaing[sic].imgcomments = imgcommentObj[romaing[sic].id]?imgcommentObj[romaing[sic].id]:[];
                            }
                            result.romaing=romaing;//输出所有scene的信息含漫游点信息links和图片热点

                            db.Users.findOne({
                                where:{
                                    id:s.user_id
                                }
                            }).then(function(owner){

                                utils.getexpire(s.user_id).then(function(expire){

                                    result.expire = Date.parse(expire)<Date.now();

                                    result.owner=owner;

                                    result.permission_bgsnd=owner.permission_bgsnd;
                                    result.permission_introduction=owner.permission_introduction;

                                    result.permission_logo=owner.permission_logo;
                                    if(result.permission_logo==1){
                                        result.logo=owner.logo?owner.logo:result.logo;
                                    }

                                    var advertisement=s.advertisement?s.advertisement:"速腾聚创";

                                    advertisement=advertisement.replace(/"/g,'').replace(/<div>/g,'');
                                    advertisement=advertisement.split('</div>');

                                    var text1=advertisement.length>0?advertisement[0]:'';
                                    var text2=advertisement.length>1?advertisement[1]:'';
                                    var text3=advertisement.length>2?advertisement[2]:'';

                                    if(text2+text3==''||
                                       text1+text3==''||
                                       text2+text1==''
                                            ){
                                        text2=text1||text2||text3;
                                        text1='';
                                        text3='';
                                    }

                                    result.text1=text1;
                                    result.text2=text2;
                                    result.text3=text3;

                                    result.title1=owner.permission_prefix&&owner.prefix?owner.prefix:'速腾聚创';;//输出大标题
                                    result.title2=result.group_info.city+' '+result.group_info.region+' '+result.group_info.community+' '+s.name;//输出小标题
                                    result.title=result.title1+' '+result.group_info.city+' '+result.group_info.region+' '+result.group_info.community;

                                    
                                    var defaultTrademark='http://7xiljm.com1.z0.glb.clouddn.com/images/tools/logo_ie.png';
                                    result.trademark=owner.permission_trademark?(s.trademark
                                        ||owner.trademark
                                        ||defaultTrademark):defaultTrademark;
                                    result.platform=utils.getPlatform(req);

                                    res.set({'Content-Type': 'text/xml'});
                                    res.render('newitem/editxml',result);
                                });
                            });
                        });
                    });
                });
            });
        });
    })
});


router.post('/set-comment',function(req,res){
    
    utils.autologin(req, res, function(sessionuser){

        var data={
            text:req.body.text,
            position_x:req.body.position_x,
            position_y:req.body.position_y,
            position_z:req.body.position_z,
            reply_id:req.body.reply_id,
            user_id:sessionuser,
            is_new:req.body.is_new
        };

        if(!utils.isNum(data.position_x)||!utils.isNum(data.position_y)||!utils.isNum(data.reply_id)||!utils.isNum(data.position_z)){
            res.json({code:-99,msg:'参数格式有误'});
            return;
        }

        var scene_key=req.body.scene_key;
        var group_key=req.body.group_key;

        var scene,group;
        db.Scenes.findOne({
            where:{
                key:scene_key,
                show:{
                    gte:0
                }
            }
        }).then(function(SCENE){
            scene=SCENE;
            return db.Groups.findOne({
                where:{
                    key:group_key,
                    show:{
                        gte:0
                    }
                }
            });
        }).then(function(GROUP){
            group=GROUP;
            if(!scene||!group){
                res.json({code:-1,msg:'scene and group no matched'});
                return;
            }
            var scenes_id=JSON.parse(group.scenes_id);
            var matched=false;
            for(var i in scenes_id){
                if(scenes_id[i]==scene.id){
                    matched=true;
                }
            }
            if(!matched){
                res.json({code:-2,msg:'scene and group no matched'});
                return;
            }

            utils.getChildrenUsers(sessionuser).then(function(users){

                var flag=false;
                for(var i in users){
                    if(users[i]==group.user_id){
                        flag=true;
                    }
                }
                if(flag&&req.body.is_description==1){
                    data.type=req.body.type?req.body.type:0;
                    data.is_description=1;
                }
                if(flag&&(req.body.is_mosaic==1||req.body.is_mosaic==2||req.body.is_mosaic==3)){
                    data.type=req.body.type?req.body.type:0;
                    data.is_mosaic=req.body.is_mosaic;
                }

                //创建评论
                db.Comments.create(data).then(function(comment){
                    var comments_id=JSON.parse(group.comments_id);
                    if(comments_id[scene.id+'']){
                        comments_id[scene.id+''].push(comment.id);
                    }else{
                        comments_id[scene.id+'']=[comment.id];
                    }

                    //更新group
                    db.Groups.update({
                        comments_id:JSON.stringify(comments_id)
                    },{
                        where:{
                            key:group_key,
                            show:{
                                gte:0
                            }
                        }
                    }).then(function(result){
                        res.json({code:0,msg:'ok',id:comment.id});
                    });
                });
            });
        });
    });
});

router.post('/del-comment',function(req,res){
    
    utils.autologin(req, res, function(sessionuser){
        if(!req.body.comment_id){
            res.json({msg:'??',code:'-2'});
            return;
        }
        utils.getChildrenUsers(sessionuser).then(function(users){
            db.Groups.findOne({
                where:{
                    key:req.body.group_key,
                    user_id:{
                        in:users
                    }
                }
            }).then(function(group){
                if(!group){
                    res.json({code:-1,msg:'?'});
                    return;
                }
                var comments_id=JSON.parse(group.comments_id);
                for(var i in comments_id){
                    if(i!=req.query.scene_id){
                        continue;
                    }
                    for(var j in comments_id[i]){
                        if(req.body.comment_id==comments_id[i][j]){
                            comments_id[i].splice(j,1);
                        }
                    }
                }
                db.Comments.destroy({
                    where:{
                        id:req.body.comment_id
                    }
                }).then(function(des){
                    db.Groups.update({
                        comments_id:JSON.stringify(comments_id)
                    },{
                        where:{
                            key:req.body.group_key
                        }
                    }).then(function(up){
                        res.json({code:0,msg:'ok'});
                        return;
                    });
                });
            });
        });
    });
});

router.post('/set-view',function(req,res){


    utils.autologin(req, res, function(sessionuser){

        var key=req.body.key;
        var ry=req.body.ry;
        var rx=req.body.rx?req.body.rx:0;
        var is_new=req.body.is_new?req.body.is_new:0;
        if(!ry||!key){
            res.json({msg:'w',code:-1});
            return;
        }

        utils.getChildrenUsers(sessionuser).then(function(users){
            db.Scenes.update({
                ry:ry,
                rx:rx,
                is_new:is_new
            },{
                where:{
                    user_id:{
                        in:users
                    },
                    key:key
                }
            }).then(function(r){
                res.json({msg:'ok',code:0});
            });
        });
    });
});

router.post('/set-spot',function(req,res){

    utils.autologin(req, res, function(sessionuser){
        var data={
            text:req.body.text,
            x:parseFloat(req.body.position_x),
            y:parseFloat(req.body.position_y),
            z:parseFloat(req.body.position_z),
            groupkey:req.body.groupkey,
            scene_id:req.body.scene_id,
            user_id:sessionuser,
            type:req.body.type,
            link_id:req.body.link_id,
            go_scene:req.body.go_scene,
            is_new:req.body.is_new
        };

        if(!utils.isNum(data.type)||
           !utils.isNum(data.scene_id)||
           !utils.isNum(data.go_scene)||
           !data.groupkey){
            res.json({code:-99,msg:'heheda1'});
            return;
        }

        var group,link;

        if(data.link_id){    //修改link
            //查找组
            utils.getChildrenUsers(sessionuser).then(function(users){
                db.Groups.findOne({
                    where:{
                        user_id:{
                            in:users
                        },
                        key:data.groupkey
                    }
                }).then(function(GROUP){
                    group=GROUP;
                    console.log(GROUP);
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
                                in:[data.go_scene,data.scene_id]
                            },
                            user_id:{
                                in:users
                            }
                        }
                    });
                }).then(function(SCENES){
                    if(SCENES.length!=2||
                        !group||
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
                            id:data.link_id
                        }
                    }).then(function(result){
                        res.json({code:0,msg:'添加成功',id:data.link_id});
                        return;
                    });
                });
            });
        }else{   //新增link
            if(!utils.isNum(data.x)||
               !utils.isNum(data.y)||
               !utils.isNum(data.z)){
                   res.json({code:-4,msg:'he'});
                   return;
            }
            utils.getChildrenUsers(sessionuser).then(function(users){
                //查找组
                db.Groups.findOne({
                    where:{
                        user_id:{
                            in:users
                        },
                        key:data.groupkey,
                        show:{
                            gte:0
                        }
                    }
                }).then(function(GROUP){
                    group=GROUP;
                    //检查场景是否是本人创建的
                    return db.Scenes.findAll({
                        where:{
                            id:{
                                in:[data.go_scene,data.scene_id]
                            },
                            user_id:{
                                in:users
                            }
                        }
                    });
                }).then(function(SCENES){
                    if(SCENES.length!=2||!group){
                        res.json({code:-4,msg:"该场景与当前场景相同，不能添加"});
                        return;
                    }

                    db.Links.create({
                        text:data.text,
                        type:data.type,
                        scene_id:data.go_scene,
                        user_id:data.user_id,
                        position_x:data.x,
                        position_y:data.y,
                        position_z:data.z,
                        is_new:data.is_new
                    }).then(function(new_link){

                        var links_id=JSON.parse(group.links_id);
                        if(links_id[data.scene_id+'']&&links_id[data.scene_id+''].length>0){
                            links_id[data.scene_id+''].push(new_link.id);
                        }else{
                            links_id[data.scene_id+'']=[new_link.id];
                        }
                        db.Groups.update({
                            links_id:JSON.stringify(links_id)
                        },{
                            where:{
                                key:data.groupkey
                            }
                        }).then(function(result){
                            res.json({code:0,msg:'添加跳转点成功',id:new_link.id});
                            return;
                        });
                    });
                });
            });
        }
    });
});

router.post('/del-spot',function(req,res){

    utils.autologin(req, res, function(sessionuser){

        var link_id=req.body.link_id;
        var scene_id=req.body.scene_id;
        var groupkey=req.body.groupkey;
        if(!utils.isNum(link_id)||!utils.isNum(scene_id)||!groupkey){
            res.json({code:-99,msg:link_id});
            return;
        }

        utils.getChildrenUsers(sessionuser).then(function(users){
            //判断链接是不是本人的
            db.Links.findOne({
                where:{
                    user_id:{
                        in:users
                    },
                    id:link_id
                }
            }).then(function(result){
                //删除链接
                db.Links.destroy({
                    where:{
                        id:link_id
                    }
                }).then(function(result){

                    //查找组
                    db.Groups.findOne({
                        where:{
                            user_id:{
                                in:users
                            },
                            key:groupkey
                        }
                    }).then(function(group){
                        if(!group){
                            res.json({code:-97,msg:'无法删除'});
                            return;
                        }
                        var links_id=JSON.parse(group.links_id);
                        if(links_id[scene_id+'']&&links_id[scene_id+''].length>0){
                            for(var j in links_id[scene_id+'']){
                                if(links_id[scene_id+''][j]==link_id){
                                    links_id[scene_id+''].splice(j,1);
                                }
                            }
                        }

                        //更新组
                        db.Groups.update({
                            links_id:JSON.stringify(links_id)
                        },{
                            where:{
                                key:groupkey
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

module.exports = router;
