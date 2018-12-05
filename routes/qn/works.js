var express = require('express');
var router = express.Router();
var config= require('./config');
var db= require('./model');
var when = require('when');
var utils= require('./utils');
var fs = require('fs');
var request = require('request');


router.get('/saveqn', function(req, res){

    db.Groups.findAll({
        where:{
            id:{
                gt:2545,
                lt:2550
            }
        }
    }).then(function(results){
        if(!results){
            res.json({code:-1,msg:"no such group"});
            return;
        }

        var scenearr = [];
        var sceneid;
        for(var i in results){
            sceneid = JSON.parse(results[i].scenes_id);
            scenearr=scenearr.concat(sceneid)
        }

        db.Scenes.findAll({
            attributes:['id','key', 'name'],
            where:{
                id:scenearr
            }
        }).then(function(romaings){
            if(!romaings){
                res.json({code:-2,msg:"no such scene"});
                return;
            }
            var tosceneid;


            for(var j in results){

                console.log('正在保存第'+(parseInt(i)+1)+"组图");

                for(var i in romaings){
                    tosceneid=JSON.parse(results[j].scenes_id);
                    if(tosceneid.indexOf(romaings[i].id!=-1)){
                        var url = "http://7xiljm.com1.z0.glb.clouddn.com/images/scenes/"+romaings[i].key+"/allinone.jpg";
                        try{
                            request.get(url, {}).pipe(
                                fs.createWriteStream(__dirname + '/qn/'+results[j].city+results[j].region+results[j].community+'__'+romaings[i].name+'.jpg'));
                        }catch(err){
                            console.log(err);
                        }
                    }
                }
            }
        });
    });

    // var url='http://7xiljm.com1.z0.glb.clouddn.com/images/scenes/1a37622e7aac02ddd84ca49be3b77c9b07324bc5/allinone.jpg'
    // request(url).pipe(fs.createWriteStream(__dirname + '/test.jpg'));
});

router.get('/',function(req,res){
    var cur_page=req.query.cur_page?req.query.cur_page:1;
    if(!utils.isNum(cur_page)){
        res.json({code:-1,msg:'hehe'});
        return;
    }
    var n=10;

    var gid2name={};
    var pubgid2name={};
    var gid2key={};

    utils.getChildrenUsers(req.session.user).then(function(users){
        db.Scenes.findAndCountAll({
            where:{
                user_id:{
                    in:users
                },
                show:{
                    gte:0
                }
            },
            offset:(cur_page-1)*n,
            limit:n,
            order:'createdAt DESC'
        }).then(function(scenes){
            var gids=[];
            for(var i in scenes.rows){
                gids.push(JSON.parse(scenes.rows[i].groups_id)[0]);
            }
            //查找父亲
            db.Groups.findAll({
                    where:{
                        id:{
                            in:gids
                        }
                    }
            }).then(function(data){
                //////////////////leejie
                var gid2extra={};
                //////////////////
                for(var i in data){
                    gid2name[data[i].id+'']=data[i].city+data[i].region+data[i].community+data[i].building+' '+data[i].room;
                    gid2key[data[i].id+'']=data[i].key;
                    //////////////leejie
                    gid2extra[data[i].id+'']={
                        city:data[i].city,
                        community:data[i].community,
                        region:data[i].region,
                        building:data[i].building,
                        room:data[i].room,
                        face:data[i].face,
                        total_floor:data[i].total_floor,
                        area:data[i].area,
                        floor:data[i].floor,
                        apartment_rooms:data[i].apartment_rooms,
                        apartment_bathrooms:data[i].apartment_bathrooms,
                        apartment_halls:data[i].apartment_halls,
                        business:data[i].business_circle,
                        telephone:0
                    };
                    ////////////////
                }
                for(var i in scenes.rows){

                    if(req.query.type=="json"){
                        ///////////lee jie
                        scenes.rows[i].dataValues.extra=gid2extra[JSON.parse(scenes.rows[i].groups_id)[0]];;
                        scenes.rows[i].dataValues.type=0;
                        scenes.rows[i].dataValues.group_id=0;
                        ///////////////////
                        scenes.rows[i].dataValues.place=scenes.rows[i].name;
                        scenes.rows[i].dataValues.groupname=gid2name[JSON.parse(scenes.rows[i].groups_id)[0]];
                        scenes.rows[i].dataValues.groupkey=gid2key[JSON.parse(scenes.rows[i].groups_id)[0]];
                    }else{
                        scenes.rows[i].place=scenes.rows[i].name;
                        scenes.rows[i].groupname=gid2name[JSON.parse(scenes.rows[i].groups_id)[0]];
                        scenes.rows[i].groupkey=gid2key[JSON.parse(scenes.rows[i].groups_id)[0]];
                    }
                }

                var result={
                        scenes:scenes.rows,
                        count:scenes.count,
                        cur_page:parseInt(cur_page),
                        platform:utils.getPlatform(req),
                        title:'我的作品',
                        page:'work'
                    };
                if(req.query.type=='json'){
                    res.json(result);
                }else{
                    res.render('works',result);
                }

            });
        });
    });
});

router.post('/delete',function(req,res){
    var data={
        key:req.body.scene_key
    };
    var deletepsw = utils.hex_sha1('muwenhu'+req.body.deletepsw);
    if(data.key.length==0){
        res.json({msg:'hehe',code:-99});
        return;
    }
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
            db.Scenes.findOne({
                where:{
                    key:data.key,
                    user_id:{
                        in:users
                    }
                }
            }).then(function(scene){
                if(!scene){
                    res.json({msg:'hehe',code:-98});
                    return;
                }

                show=scene.show;
                scene_id=scene.id;
                scene_type=scene.type;
                var groupids=JSON.parse(scene.groups_id);
                //删除漫游相关链接
                if(scene.type==0){
                    return db.Groups.findAll({
                        where:{
                            id:{
                                in:groupids
                            }
                        }
                    });
                } else if( scene.type==1){
                    return db.Groups.findAll({
                        where:{
                            id:{
                                in:groupids
                            }
                        }
                    });
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

                    return when.all(querys);
            }).then(function(result){
                return db.Scenes.update({
                            show:show%10-100
                        },{
                            where:{
                                key:data.key,
                                user_id:{
                                    in:users
                                }
                            }
                        }).then(function(result){
                            res.json({code:0,msg:'ok'});
                        });
            });
        });
    });
});
module.exports= router;