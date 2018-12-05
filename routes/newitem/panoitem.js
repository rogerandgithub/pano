var express = require('express');
var router = express.Router();
var db= require('../model');
var xss= require('xss');
var utils= require('../utils');
var config= require('../config');
var nodegrass = require('nodegrass');
var when = require('when');



/* GET home page. */
router.get('/', function(req, res) {
    var r = {};

    utils.autologin(req, res, function(userid){
        utils.getexpire(userid).then(function(expire){
            r.expire = expire;
            db.Users.findOne({
                where: {
                    id: userid
                }
            }).then(function(u){
                r.user=u;
                db.Groups.findAll({
                    where: {
                        user_id: userid,
                        //0是未处理的复制全景，-1是删除了的
                        show: 0,
                        copyfrom: {
                            $ne: 0
                        }
                    },
                    order: 'createdAt ASC'
                }).then(function(cgroups){

                    if(!cgroups)cgroups=[];

                    if(cgroups.length){
                        var copyfromid = [];
                        var cgs = [];
                        for(var i in cgroups){
                            cgs[i] = {
                                id: cgroups[i].id,
                                title: cgroups[i].city+cgroups[i].region+cgroups[i].community+cgroups[i].business_circle+cgroups[i].room,
                                copyfromid: cgroups[i].copyfrom,
                                createdAt: new Date(cgroups[i].createdAt)
                            };
                            copyfromid.push(cgroups[i].copyfrom);
                        }
                        db.Users.findAll({
                            attributes: ['id', 'name'],
                            where: {
                                id: {
                                    $in: copyfromid
                                }
                            }
                        }).then(function(copyfromusers){
                            var id2name = {};
                            for(var i in copyfromusers){
                                id2name[copyfromusers[i].id] = copyfromusers[i].name;
                            };

                            for(var i in cgs){
                                cgs[i].copyfrom = id2name[cgs[i].copyfromid];
                            }
                            r.cgs = JSON.stringify(cgs);
                            res.render('newitem/pano',r);
                        });
                    }else{
                        r.cgs = JSON.stringify(cgroups);
                        res.render('newitem/pano',r);
                    }
                })
            })
        });
    });
});


router.post('/settitle',function(req,res){

    utils.autologin(req, res, function(userid){

        var groupid = req.body.groupid&&!isNaN(req.body.groupid)?parseInt(req.body.groupid):false;
        var title = req.body.title;

        if(!groupid){
            res.json({code:-1,msg:'lack of key value'});
            return;
        }
        if(title.length>50){
            res.json({code:-2,msg:'全景标题不可长于五十个字节'});
            return;
        }
        // var pattern = new RegExp("[%--`~!@#$^&*()=|{}':;',\\[\\].<>/?~！@#￥……&*（）——|{}【】‘；：”“'。，、？]");
        var pattern = new RegExp("[%--`~!@#$^&*()=|{}':;',\\[\\]<>/?~！@#￥……&*（）——|{}‘；：”“'。，、？]");
        if(pattern.exec(title) != null){
            res.json({code:-3,msg:'全景标题不可含有特殊字符'});
            return;
        }
        db.Groups.update({
            title: title
        },{
            where: {
                id: groupid,
                user_id: userid
            }
        }).then(function(up){
            up?res.json({code:0,msg:'修改成功'}):res.json({code:-4,msg:'updated failed'});
        });
    });
});



router.post('/concat', function(req, res){

    utils.autologin(req, res, function(userid){

        var groups_id = req.body.groups_id;
        var title = req.body.title;
        var MultiPro_id = req.body.MultiPro_id?parseInt(req.body.MultiPro_id):0;

        if(groups_id.length>7){
            res.json({code:-3,msg:'一个多项目最多只能添加7套全景'});
            return;
        }

        if(!title||!groups_id){
            res.json({code:-1,msg:'lack of key value'});
            return;
        }

        db.Groups.findAll({
            where: {
                id: {
                    $in: groups_id
                },
                user_id: userid
            }
        }).then(function(groups){

            if(groups.length<groups_id.length){
                res.json({code:-2,msg:'No such group'});
                return;
            }

            db.MultiPro.findOne({
                where: {
                    id: MultiPro_id
                }
            }).then(function(MultiPro){

                if(!MultiPro&&MultiPro_id!=0){
                    res.json({code:-2,msg:'No such Multi-Project'});
                    return;
                }

                if(MultiPro){

                    //去除相同的
                    var groupid = JSON.parse(MultiPro.groups_id);
                    var len = groupid.length;

                    if(groupid.length>=7){
                        res.json({code:-3,msg:'该多项目已经满了'});
                        return;
                    }

                    for(var i in groups_id){
                        if(groupid.indexOf(groups_id[i])==-1)groupid.push(groups_id[i]);
                    }

                    if(groupid.length > 7){
                        res.json({code:-4,msg:'该项目已经有'+len+'套全景，不能添加多于'+(7-len)+'套'});
                        return;
                    }

                    if(groupid.length == len){
                        res.json({code:-4,msg:'所选全景已存在该多项目里'});
                        return;
                    }

                    db.MultiPro.update({
                        groups_id: JSON.stringify(groupid)
                    },{
                        where: {
                            id: MultiPro.id
                        }
                    }).then(function(up){

                        if(!up){
                            res.json({code:-3,msg:'updated failed'});
                            return;
                        }

                        var len1 = groups_id.length + len - groupid.length;

                        len1 > 0?res.json({code:0,msg:'成功添加'+(groupid.length - len)+'套，其中' + len1 + '套已存在'}):res.json({code:0,msg:'添加成功'});;
                    });
                }else{
                    var data = {
                        title: title,
                        user_id: userid,
                        show: 1,
                        key: utils.md5(new Date().valueOf()+''+userid).substr(0,8),
                        groups_id: JSON.stringify(groups_id)
                    };

                    db.MultiPro.create(data).then(function(multipro){
                        res.json({code:0,msg:'保存成功',data:multipro});
                    });
                }
            });
        });
    });
});


router.post('/setprefix',function(req,res){

    utils.autologin(req, res, function(userid){

        utils.getChildrenUsers(userid).then(function(users){

            db.Groups.findOne({
                where:{
                    user_id:{
                        in: users
                    },
                    key: req.body.groupkey
                }
            }).then(function(group){

                if(!group){
                    res.json({code:-1,msg:'No such group'});
                    return;
                }
                var scenes_id=JSON.parse(group.scenes_id);
                db.Scenes.update({
                    prefix:req.body.prefix
                },{
                    where:{
                        id:{
                            in:scenes_id
                        }
                    }
                }).then(function(up){
                    res.json({code:0,msg:'ok'});
                    return;
                });
            });
        });
    });
});


router.get('/json',function(req,res){

    utils.autologin(req, res, function(userid){

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
                    $gt: 0
                },
                scenes_id:{
                    ne:"[]"
                }
            };

            db.Groups.findAndCountAll({

                attributes: ['id', 'key', 'city', 'region', 'community', 'business_circle', 'building', 'room', 'user_id', 'recommend', 'scenes_id', 'autoplay', 'createdAt', 'updatedAt' ],
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
                    gkey2sid[result[i].key] = temp[0]; //scenes first-id
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
                    var id2scenetype = {};

                    for(var i in data){
                        id2key[data[i].id] = data[i].key;
                        id2groupid[data[i].id] = data[i].group_id;
                        id2scenestyle[data[i].id] = data[i].scenestyle;
                        id2scenetype[data[i].id] = data[i].type;
                        id2scenestyle[data[i].id] = data[i].scenestyle;
                    }
                    for(var i in r.romaing){
                        r.romaing[i].dataValues.scene_key = id2key[gkey2sid[r.romaing[i].key]];
                        r.romaing[i].dataValues.groupid = id2groupid[gkey2sid[r.romaing[i].key]];
                        r.romaing[i].dataValues.scenestyle = id2scenestyle[gkey2sid[r.romaing[i].key]];
                        r.romaing[i].dataValues.type = id2scenetype[gkey2sid[r.romaing[i].key]];
                        r.romaing[i].scenes_id = undefined;
                        r.romaing[i].key = undefined;
                        r.romaing[i].dataValues.startDate = new Date(r.romaing[i].createdAt).valueOf();

                        r.romaing[i].dataValues.thumbsrc = utils.getThumbSrc(r.romaing[i].dataValues.type,r.romaing[i].dataValues.scene_key,r.romaing[i].dataValues.scenestyle);
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


                        db.MultiPro.findAll({
                            where: {
                                user_id: userid,
                                show: 1
                            }
                        }).then(function(multipros){

                            if(!multipros){
                                multipros = [];
                            };

                            r.multipros = multipros;

                            utils.getexpire(userid).then(function(expire){

                                utils.getuserinfo(userid).then(function(user){

                                    r.user = user;
                                    r.user.expire = expire;
                                    res.json(r);
                                });
                            });
                        });
                    })
                });
            });
        });
    });
});
         
router.get('/getsharable/:name', function(req, res){
    var username = req.params.name;
    utils.getsharable(username).then(function(sharable){
        res.json(sharable);
    });
});

router.post('/set-housedesc',function(req, res){

    utils.autologin(req, res, function(sessionuser){

        if(!req.body.groupid){
            res.json({code:-1,msg:'groupid is required'});
            return;
        }
        var extra = req.body.housedesc;
        var groupid = req.body.groupid;
        
        utils.getChildrenUsers(sessionuser).then(function(users){
            db.Groups.update({
                extra:extra
            },{
                where:{
                    id:groupid,
                    user_id:{
                        in:users
                    }
                }
            }).then(function(data){
                res.json({code:0,msg:'ok'});
                return;
            });
        });
    });
});

router.post('/set-introduction',function(req,res){

    utils.autologin(req, res, function(userid){

        if(req.body.groupid){

            if(!req.body.groupid){
                res.json({code:-1,msg:'groupid is required'});
                return;
            }
            var intro=req.body.introduction?req.body.introduction:'';
            var groupid=req.body.groupid?parseInt(req.body.groupid):0;

            utils.getChildrenUsers(userid).then(function(users){

                db.Groups.update({
                    introduction:intro
                },{
                    where:{
                        id:groupid,
                        user_id:{
                            in:users
                        }
                    }
                }).then(function(up){
                    if(up){
                        res.json({code:0,msg:'ok'});
                    }else{
                        res.json({code:-2,msg:'Db error'});
                    }
                });
            });

        }else{

            if(!req.body.scene_key){
                res.json({code:-1,msg:'scene_key is required'});
                return;
            }
            var intro=req.body.introduction;
            var scene_key=req.body.scene_key;
            utils.getChildrenUsers(userid).then(function(users){
                db.Scenes.update({
                    introduction:intro
                },{
                    where:{
                        key:scene_key,
                        user_id:{
                            in:users
                        }
                    }
                }).then(function(data){
                    res.json({code:0,msg:'ok'});
                    return;
                });
            });
        }
    });
});

router.post('/toggleautoplay', function(req, res){

    utils.autologin(req, res, function(user_id){

        utils.getChildrenUsers(user_id).then(function(users){

            var key = req.body.key;

            db.Scenes.findOne({
                where: {
                    key: key,
                    user_id: {
                        in: users
                    }
                }
            }).then(function(scene){
                if(!scene){
                    res.json({code: -1,msg:'No such scene'});
                    return;
                }

                db.Groups.findOne({
                    where: {
                        id: scene.group_id
                    }
                }).then(function(group){

                    db.Groups.update({
                        autoplay: group.autoplay==0?1:0
                    },{
                        where: {
                            id: groupid
                        }
                    }).then(function(up){
                        if(up){
                            res.json({code:0, msg:'successed'});
                        }else{
                            res.json({code:-2, msg:'db wrong'});
                        }
                    });
                });
            });
        });
    });
});

router.post('/togglerecommend',function(req, res){

    utils.autologin(req, res, function(user_id){

        utils.getChildrenUsers(user_id).then(function(users){

            var id = req.body.id;
            db.Groups.findOne({
                where: {
                    id: id,
                    user_id: {
                        in: users
                    }
                }
            }).then(function(group){
                if(!group){
                    res.json({code: -1,msg:'No such group'});
                    return;
                }

                db.Groups.update({
                    recommend: group.recommend==0?1:0
                },{
                    where: {
                        id: group.id
                    }
                }).then(function(up){
                    if(up){
                        res.json({code:0, msg:'successed'});
                    }else{
                        res.json({code:-2, msg:'db wrong'});
                    }
                });
            });
        });
    });
});


router.get('/edit/:id', function(req, res){

    var groupid = req.params.id;
    
    utils.autologin(req, res, function(user_id){

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
            }).then(function(group){                if(!group){
                    res.json({code:-1,msg:'no such group'});
                    return;
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

                db.Scenes.findAll({
                    where:{
                        id:{
                            in:ids
                        },
                        show:{
                            gte:0
                        }
                    }
                }).then(function(scenes){

                    if(!scenes||scenes.length==0){
                        res.json({code:-2,msg:'no scene in the group'});
                        return;
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

                                utils.getexpire(user_id).then(function(expire){

                                    utils.getuserinfo(user_id).then(function(user){

                                        r.user = u;
                                        r.user.expire = expire;
                                        res.render('newitem/edit',r);
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

router.get('/scenes/:id', function(req, res){

    utils.autologin(req, res, function(userid){

        var groupid = req.params.id;
        db.Groups.findOne({
            where:{
                id: groupid,
                user_id: userid
            }
        }).then(function(group){

            if(!group){
                res.json({code:-1,msg:'你不能操作该全景'});
                return;
            }

            var scenes_id = JSON.parse(group.scenes_id);

            db.Scenes.findAll({
                where:{
                    id:{
                        in:scenes_id
                    },
                    show:{
                        gte:0
                    }
                },
                order: ['order']
            }).then(function(scenes){
                for(var i in scenes){
                    scenes[i].dataValues.thumbsrc = utils.getThumbSrc(scenes[i].type,scenes[i].key,scenes[i].scenestyle);
                }
                res.json(scenes);
            });
        });
    });
});

router.post('/sort',function(req, res){

    var neworder = !!req.body.neworder.length?req.body.neworder:[];
    var groupid = req.body.groupid?req.body.groupid:'';

    utils.autologin(req, res, function(userid){

        utils.getChildrenUsers(userid).then(function(users){

            db.Groups.findOne({
                where: {
                    user_id: {
                        in: users
                    },
                    id: groupid
                }
            }).then(function(group){

                if(!group){
                    res.json({ code:-1,msg:'No such group' });
                    return false;
                }

                var sqlArr = [];

                for(var i in neworder){
                    sqlArr.push(db.Scenes.update({
                        order: i
                    }, {
                        where: {
                            id: neworder[i],
                            user_id: {
                                $in: users
                            }
                        }
                    }));
                }

                when.all(sqlArr).then(function(up){

                    if(!up[0][0]){
                        res.json({code:-2, msg:'Db error'});
                        return;
                    }
                    res.json({code: 0,msg: 'Updated succeed'})
                });
            });
        });
    });
});

router.get('/editmap/:id', function(req, res){

    var groupid = req.params.id;

    utils.autologin(req, res, function(userid){

        if(!req.session.user){
            res.redirect('/newitem/login');
            return;
        } 
        if(!groupid){
            res.json({msg:'Groupid is required!',code:-2});
            return;
        }

        db.Users.findOne({
            where: {
                id: userid
            }
        }).then(function(user){
            res.render('newitem/editmap',{groupid:groupid,user:user});
        })
    });

});

router.post('/spot-delete',function(req,res){
    utils.autologin(req,res,function(userid){
        var link_id=req.body.link_id;
        var mapkey=req.body.mapkey;
        if(!utils.isNum(link_id)||!mapkey){
            res.json({code:-99,msg:'Invalid params'});
            return;
        }
        //判断链接是不是本人的
        utils.getChildrenUsers(req.session.user).then(function(users){
            db.Links.findOne({
                where:{
                    user_id:{
                        in:users
                    },
                    id:link_id
                }
            }).then(function(result){
                if(!result){
                    res.json({code:-98,msg:'It\'s not yours'});
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
                            res.json({code:-97,msg:'No such map'});
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

router.post('/spot-post',function(req,res){

    utils.autologin(req, res, function(userid){

        var data={
            text:req.body.text,
            x:parseFloat(req.body.position_x),
            y:parseFloat(req.body.position_y),
            z:parseFloat(req.body.position_z),
            mapkey:req.body.mapkey,
            type:req.body.type,
            go_scene:req.body.go_scene
        };

        if(!utils.isNum(data.type)||
           !utils.isNum(data.go_scene)||
           !data.mapkey||!utils.isNum(data.x)||
           !utils.isNum(data.y)||
           !utils.isNum(data.z)){
               res.json({code:-5,msg:'Invalid data'});
               return;
        }
        //查找组
        utils.getChildrenUsers(req.session.user).then(function(users){
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
                    res.json({code:-6,msg:'No such scene'});
                    return;
                }

                db.Links.create({
                    text:data.text,
                    type:data.type,
                    scene_id:data.go_scene,
                    user_id:SCENES.user_id,
                    position_x:data.x,
                    position_y:data.y,
                    position_z:0
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
                        res.json({code:0,msg:'ok',links:new_link});
                        return;
                    });
                });
            });
        });
    });
});


router.post('/set-introduction',function(req,res){

    utils.autologin(req, res, function(sessionuser){

        if(!req.body.scene_key){
            res.json({code:-1,msg:'scene_key is required'});
            return;
        }
        var intro=req.body.introduction;
        var scene_key=req.body.scene_key;
        utils.getChildrenUsers(sessionuser).then(function(users){
            db.Scenes.update({
                introduction:intro
            },{
                where:{
                    key:scene_key,
                    user_id:{
                        in:users
                    }
                }
            }).then(function(data){
                res.json({code:0,msg:'ok'});
                return;
            });
        });
    });
});

router.post('/set-tel',function(req,res){

    utils.autologin(req, res, function(sessionuser){

        var groupid=req.body.groupid;
        var telephone=req.body.telephone;

        if(!sessionuser){
            res.json({code:-1,msg:"You don't seem to be logged in"});
            return;
        }

        if((groupid.length==0||!utils.isTelephone(telephone))&&telephone.indexOf('400')==-1){
            res.json({code:-2,msg:'Incorrect phone number'});
            return;
        }

        utils.getChildrenUsers(sessionuser).then(function(users){
            db.Groups.findOne({
                where:{
                    id:groupid
                }
            }).then(function(group){
                var scene_ids = JSON.parse(group.scenes_id);
                db.Scenes.update({
                    telephone:telephone
                },{
                    where:{
                        id:{
                            $in:scene_ids
                        }
                    }
                }).then(function(data){
                    res.json({code:0,msg:'successed'});
                });
            });
        });
    });
});

router.post('/set-prefix',function(req,res){

    utils.autologin(req, res, function(sessionuser){

        utils.getChildrenUsers(sessionuser).then(function(users){
            db.Groups.findOne({
                where:{
                    user_id:{
                        in:users
                    },
                    key:req.body.groupkey
                }
            }).then(function(group){
                if(!group){
                    res.json({code:-1,msg:'No such group'});
                    return;
                }
                var scenes_id=JSON.parse(group.scenes_id);
                db.Scenes.update({
                    prefix:req.body.prefix
                },{
                    where:{
                        id:{
                            in:scenes_id
                        }
                    }
                }).then(function(up){
                    res.json({code:0,msg:'ok'});
                    return;
                });
            });
        });
    });
});

router.post('/set-name',function(req,res){

    utils.autologin(req, res, function(sessionuser){

        var id=req.body.id;
        var name=req.body.name;
        db.Scenes.findOne({
            where:{
                id:id
            }
        }).then(function(scene){
            if (!scene) {
                res.json({code:-3,msg:"No such scene"});
                return;
            };
            utils.getChildrenUsers(sessionuser).then(function(users){
            
                if (users.indexOf(scene.user_id)==-1) {
                    res.json({code:-4,msg:'I\'s not your scene'});
                    return;
                };
                db.Scenes.update({
                    name:name
                },{
                    where:{
                        id:id
                    }
                }).then(function(data){
                    db.Links.update({
                        text:name
                    },{
                        where:{
                            scene_id:id
                        }
                    }).then(function(links){
                        res.json({code:0,msg:"OK"});
                    })
                });
            });
        });
    });
});

router.post('/set-info',function(req,res){

    utils.autologin(req, res, function(sessionuser){

        var data=req.body;
        for(var i in data){
            if(
                  i!='community'
                &&i!='building'
                &&i!='room'
                &&i!='city'
                &&i!='region'
                &&i!='business_circle'
                &&i!='apartment_halls'
                &&i!='apartment_rooms'
                &&i!='apartment_bathrooms'
                &&i!='area'
                &&i!='floor'
                &&i!='total_floor'
                &&i!='face'
                &&i!='key'
                &&i!='group_name'
                &&i!='price'
                &&i!='extra'
              ){
                  res.json({code:-1,msg:'error'});
                  return;
              }
        }
        data.name = data.group_name;
        var key=req.body.key;
        delete(data.key);

        for(var i in req.body){
            if(req.body[i]){
                if(req.body[i].indexOf('\\')>=0){
                    res.json({code:-2,msg:'error'});
                    return;
                }
            }
        }

        utils.getChildrenUsers(sessionuser).then(function(users){

            db.Groups.update(data,{
                where:{
                    user_id:{
                        in:users
                    },
                    key:key
                }
            }).then(function(r){
                res.json({msg:'ok',code:0});
                return;
            });
        });
    });
});

router.post('/set-cover',function(req,res){

    utils.autologin(req, res, function(sessionuser){

        utils.getChildrenUsers(sessionuser).then(function(users){
            db.Groups.findOne({
                where:{
                    user_id:{
                        in:users
                    },
                    key:req.body.groupkey
                }
            }).then(function(group){
                if(!group){
                    res.json({code:-1,msg:'error'});
                    return false;
                }

                var scenes_id=JSON.parse(group.scenes_id);

                var index=-1;
                for(var i in scenes_id){
                    if(scenes_id[i]==req.body.id){
                        index=i;
                        scenes_id.splice(i,1);
                        break;
                    }
                }

                if(index==-1){
                    res.json({code:-3,msg:'error'});
                    return false;
                }

                var new_scenes_id=[parseInt(req.body.id)];
                for(var i in scenes_id){
                    new_scenes_id.push(parseInt(scenes_id[i]));
                }

                return db.Groups.update({
                    scenes_id:JSON.stringify(new_scenes_id)
                },{
                    where:{
                        user_id:group.user_id,
                        key:req.body.groupkey
                    }
                });
            }).then(function(up){
                if(!up){
                    return false;
                }
                res.json({msg:'ok',code:0});
                return;
            });
        });
    });
});


router.post('/del-topimg',function(req,res){

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




router.get('/mapdata/:id',function(req,res){

    var groupid = req.params.id;

    if(!req.session.user){
        res.json({msg:"You don't seem to be logged in",code:-1});
        return;
    } 
    if(!groupid){
        res.json({msg:'Groupid is required!',code:-2});
        return;
    }

    var r={groupid:groupid};

    var scenes_id=[];

    utils.getChildrenUsers(req.session.user).then(function(users){
        db.Groups.findOne({
            where:{
                id:groupid,
                user_id:{
                    in:users
                }
            }
        }).then(function(group){
            if(!group){
                res.json({msg:'?',code:-2});
                return;
            }
            var maps_id=group.maps_id?JSON.parse(group.maps_id):[];
            scenes_id=JSON.parse(group.scenes_id);
            //获取maps
            return db.Maps.findAll({
                where:{
                    id:{
                        in:maps_id
                    },
                    show: {
                        $gt: 0
                    }
                }
            });
        }).then(function(maps){
            r.maps=maps;
            return db.Scenes.findAll({
                where:{
                    id:{
                        in:scenes_id
                    },
                    show: {
                        $gt: 0
                    }
                }
            });
        }).then(function(scenes){
            for(var i in scenes){
                scenes[i].dataValues.thumbsrc = utils.getThumbSrc(scenes[i].type,scenes[i].key,scenes[i].scenestyle);
            }
            r.romaing=scenes;
            //查找链接
            var links_id=[];
            mapid2linksid={};
            for(var i in r.maps){
                var temp=JSON.parse(r.maps[i].links_id);
                mapid2linksid[r.maps[i].id+'']=[];
                for(j in temp){
                    mapid2linksid[r.maps[i].id+''].push(temp[j]);
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
            res.json(r);
        });
    });
});

router.post('/share/check', function(req, res){

    var groupid = req.body.groupid?req.body.groupid:[];
    var shareid = req.body.shareid?req.body.shareid:[];

    if(!groupid.length||!shareid.length){
        res.json({code:-1, msg:'Lack of key value'});
        return;
    }

    db.Groups.findAll({
        where: {
            id: {
                $in: groupid
            }
        },
        show: {
            $gt: 0
        }
    }).then(function(groups){

        db.Users.findAll({
            where: {
                id: {
                    $in: shareid
                }
            }
        }).then(function(users){

            var key_arr = [];

            for(var i in groups){
                for(var j in users){
                    var key = groups[i].key.split('_')[0]+'_'+users[j].id;
                    key_arr.push(key);
                }
            }

            var id2name = {};
            for(var i in users){
                id2name[users[i].id] = users[i].name;
            }

            db.Groups.findAll({
                where: {
                    key: {
                        $in: key_arr
                    }
                }
            }).then(function(groups_exit){

                if(!groups_exit.length){
                    res.json({code:0,msg:'No groups exit'});
                    return;
                }

                for(var i in groups_exit){
                    groups_exit[i].dataValues.title = groups_exit[i].city+groups_exit[i].region+groups_exit[i].community+groups_exit[i].business_circle+groups_exit[i].room;
                    groups_exit[i].dataValues.username = id2name[groups_exit[i].user_id];
                }
                res.json({code:-1,groups:groups_exit});
            });
        });
    });
});

router.post('/share',function(req, res){

    utils.autologin(req, res, function(userid){

        utils.getChildrenUsers(userid).then(function(users){

            var groupid = req.body.groupid?req.body.groupid:[];
            var shareid = req.body.shareid?req.body.shareid:[];

            if(!groupid.length||!shareid.length){
                res.json({code:-1, msg:'Lack of key value'});
                return;
            }

            db.Groups.findAll({
                where:{
                    id: {
                        $in: groupid
                    },
                    user_id: {
                        $in: users
                    },
                    scenes_id: {
                        $ne: '[]'
                    }
                }
            }).then(function(groups){

                if(!groups){
                    res.json({code:-99,msg:'No such groupid'});
                    return;
                }

                var childrenid = [];
                // for(var i in users){
                    for(var j in shareid){
                        // if(users[i] == shareid[j]){
                            childrenid.push(shareid[j]);
                        // }
                    }
                // }
                if(!childrenid.length){
                    res.json({code:-1,msg:'It\' not yours child'});
                    return;
                }

                //先查找所有的scenes的数据
                var scenes_id = [];
                var scenes_insert_sql = [];

                for(var i in groups){
                    scenes_id = scenes_id.concat(JSON.parse(groups[i].scenes_id));
                }

                db.Scenes.findAll({
                    where: {
                        id: {
                            $in: scenes_id
                        },
                        show: {
                            $gt: 0
                        }
                    }
                }).then(function(scenes){

                    //先 生成并插入 scenes数据
                    var new_s = {}, s_sql_arr = [];

                    //对应每个scene和每个user都要新生成一个scene
                    for(var i in scenes){
                        for(var j in childrenid){
                            new_s = JSON.parse(JSON.stringify(scenes[i]));
                            new_s.key = new_s.key.split('_')[0]+'_'+childrenid[j];//带上复制的标志
                            new_s.id = null;
                            //这里可以约定show等于0的复制全景，是接收者还没处理的，也即没推入列表也没删除
                            //show等于-1的复制全景，即是被接收者删除的全景
                            new_s.show = 0;
                            new_s.createdAt = new Date();
                            new_s.updatedAt = new Date();
                            new_s.user_id = childrenid[j];
                            s_sql_arr.push(db.Scenes.create(new_s));
                            new_s = {};
                        }
                    }

                    when.all(s_sql_arr).then(function(new_scenes){
                        
                        var new_scenes_arr = {}, new_g = {}, g_sql_arr = [];

                        for(var i in groups){

                            new_scenes_arr[groups[i].id] = {};

                            //按groupid和userid分配新生成的new_scenes
                            for(var j in new_scenes){
                                if(!new_scenes_arr[groups[i].id][new_scenes[j].user_id])
                                    new_scenes_arr[groups[i].id][new_scenes[j].user_id] = [];

                                if(new_scenes[j].group_id == groups[i].id)
                                    new_scenes_arr[groups[i].id][new_scenes[j].user_id].push(new_scenes[j].id);
                            }
                            //生成一个新的group信息，插入
                            for(var uid in childrenid){
                                new_g = JSON.parse(JSON.stringify(groups[i]));                                new_g.key = new_g.key.split('_')[0]+'_'+childrenid[uid];//带上复制的标志
                                new_g.id = null;
                                new_g.createdAt = new Date();
                                new_g.updatedAt = new Date();
                                new_g.user_id = childrenid[uid];
                                new_g.show = 0;
                                new_g.scenes_id = JSON.stringify(new_scenes_arr[groups[i].id][childrenid[uid]]);
                                new_g.copyfrom = userid;
                                g_sql_arr.push(db.Groups.create(new_g));
                            }
                            new_g = {};
                        }

                        when.all(g_sql_arr).then(function(new_groups){

                            var s_update_gid_arr = [];

                            for(var i in new_groups){

                                var new_scenes_id = JSON.parse(new_groups[i].scenes_id);

                                s_update_gid_arr.push(db.Scenes.update({
                                    groups_id: '['+new_groups[i].id+']',
                                    group_id: new_groups[i].id
                                }, {
                                    where: {
                                        id: {
                                            $in: new_scenes_id
                                        }
                                    }
                                }))
                            }

                            when.all(s_update_gid_arr).then(function(up){

                                if(!up[0]){
                                    res.json({code:-3,msg:'更新scenes失败了'});
                                    return;
                                }

                                //复制跳转点
                                //1、构建新sceneid到老sceneid的映射对象
                                var nsid_to_osid = {};
                                var osid_to_nsid = {};

                                for(var i in new_scenes){
                                    for(var j in scenes){
                                        if(new_scenes[i].key.split('_')[0] == scenes[j].key.split('_')[0]){
                                            nsid_to_osid[new_scenes[i].id] = scenes[j].id;
                                            osid_to_nsid[scenes[j].id] = new_scenes[i].id;
                                        }
                                    }
                                }

                                //找到所有的links
                                var o_links_id_arr = [];
                                for(var i in new_groups){

                                    if(new_groups[i].links_id != '{}'){
                                        
                                        var links_id = JSON.parse(new_groups[i].links_id);
                                        for(var key in links_id){
                                            o_links_id_arr = o_links_id_arr.concat(links_id[key]);
                                        }
                                    }
                                }



                                db.Links.findAll({
                                    where: {
                                        id: {
                                            $in: o_links_id_arr
                                        }
                                    }
                                }).then(function(old_links){

                                    //构建id到links的映射对象
                                    var id_link = {};

                                    for(var i in old_links){
                                        id_link[old_links[i].id] = old_links[i];
                                    }



                                    //构建新links的sql数组
                                    var new_links_sql_arr = [], n_link = {};

                                    for(var i in childrenid){
                                        for(var j in new_groups){

                                            //这里还差一步要把旧的links_id的key给替换了，也就是新的sceneid
                                            var run_linkid = JSON.stringify(JSON.parse(new_groups[j].links_id));

                                            for(var rid in nsid_to_osid){
                                                run_linkid = run_linkid.replace(nsid_to_osid[rid]+'', rid+'');
                                            }
                                            var n_g_l = JSON.parse(run_linkid);

                                            for(var key in n_g_l){
                                                var n_g_l_arr = n_g_l[key];
                                                for(var k in n_g_l_arr){
                                                    //生成新的link的对象
                                                    if(id_link[n_g_l_arr[k]]){
                                                        n_link = JSON.parse(JSON.stringify(id_link[n_g_l_arr[k]]));
                                                        n_link.id = null;
                                                        n_link.scene_id = osid_to_nsid[n_link.scene_id];
                                                        n_link.user_id = childrenid[i];
                                                        new_links_sql_arr.push(db.Links.create(n_link));
                                                        n_link = {};
                                                    }
                                                }
                                            }
                                        }
                                    }


                                    when.all(new_links_sql_arr).then(function(new_links){

                                        //更新所有new_group的links_id
                                        //先构建scene_id到new_links的映射
                                        var olid_to_nlid = {};

                                        for(var i in new_links){
                                            for(var j in old_links){
                                                if(new_links[i].position_x==old_links[j].position_x&&new_links[i].position_y==old_links[j].position_y){
                                                    olid_to_nlid[old_links[j].id] = new_links[i].id;
                                                }
                                            }
                                        }

                                        //构建group新的links_id
                                        var up_g_l_sql_arr = [];


                                        for(var i in new_groups){

                                            var n_g_l = new_groups[i].links_id;

                                            for(var j in olid_to_nlid){
                                                n_g_l = n_g_l.replace(j+'', olid_to_nlid[j]+'');
                                            }

                                            for(var rid in nsid_to_osid){
                                                n_g_l = n_g_l.replace(nsid_to_osid[rid]+'', rid+'');
                                            }

                                            up_g_l_sql_arr.push(db.Groups.update({
                                                links_id: n_g_l
                                            }, {
                                                where: {
                                                    id: new_groups[i].id
                                                }
                                            }))
                                        }


                                        when.all(up_g_l_sql_arr).then(function(ups){

                                            if(!up[0]){
                                                res.json({code:-3,msg:'更新groups失败了'});
                                                return;
                                            }

                                            //复制马赛克和图片热点
                                            //找到所有的马赛克和图片热点
                                            var o_comments_id_arr = [];
                                            for(var i in new_groups){

                                                if(new_groups[i].comments_id != '{}'){
                                                    
                                                    var comments_id = JSON.parse(new_groups[i].comments_id);
                                                    for(var key in comments_id){
                                                        o_comments_id_arr = o_comments_id_arr.concat(comments_id[key]);
                                                    }
                                                }
                                            } 

                                            db.Comments.findAll({
                                                where: {
                                                    id: {
                                                        $in: o_comments_id_arr
                                                    }
                                                }
                                            }).then(function(old_comments){

                                                //构建id到comments的映射对象
                                                var id_comment = {};

                                                for(var i in old_comments){
                                                    id_comment[old_comments[i].id] = old_comments[i];
                                                }

                                                //构建新links的sql数组
                                                var new_comments_sql_arr = [], n_comment = {}, count = 0;

                                                for(var i in childrenid){
                                                    for(var j in new_groups){

                                                        //这里还差一步要把旧的comments_id的key给替换了，也就是新的sceneid
                                                        var run_comments_id = JSON.stringify(JSON.parse(new_groups[j].comments_id));
                                                        for(var rid in nsid_to_osid){
                                                            run_comments_id = run_comments_id.replace(nsid_to_osid[rid]+'', rid+'');
                                                        }
                                                        var n_g_c = JSON.parse(run_comments_id);

                                                        for(var key in n_g_c){
                                                            var n_g_c_arr = n_g_c[key];
                                                            for(var k in n_g_c_arr){
                                                                try{
                                                                    n_comment = JSON.parse(JSON.stringify(id_comment[n_g_c_arr[k]]));
                                                                }catch(err){
                                                                    n_comment = {};
                                                                }
                                                                n_comment.id = null;
                                                                n_comment.position_z = parseInt(key);
                                                                n_comment.user_id = childrenid[i];
                                                                new_comments_sql_arr.push(db.Comments.create(n_comment));
                                                                n_comment = {};
                                                                count++;
                                                            }
                                                        }
                                                    }
                                                }

                                                when.all(new_comments_sql_arr).then(function(new_comments){

                                                    //更新所有new_group的comments_id
                                                    //先构建scene_id到new_comments的映射
                                                    var sid_to_n_c = {};
                                                    for(var i in new_comments){
                                                        //position_z保存着sceneid
                                                        if(!sid_to_n_c[new_comments[i].position_z])sid_to_n_c[new_comments[i].position_z] = [];
                                                        sid_to_n_c[new_comments[i].position_z].push(new_comments[i].id);
                                                    }

                                                    //构建group新的comments_id
                                                    for(var i in new_groups){
                                                        var n_g_s_id_arr = JSON.parse(new_groups[i].scenes_id);
                                                        var new_comments_id = {};
                                                        for(var j in n_g_s_id_arr){
                                                            new_comments_id[n_g_s_id_arr[j]] = sid_to_n_c[n_g_s_id_arr[j]];
                                                        }

                                                        var up_g_c_sql_arr = [];


                                                        up_g_c_sql_arr.push(db.Groups.update({
                                                            comments_id: JSON.stringify(new_comments_id)
                                                        }, {
                                                            where: {
                                                                id: new_groups[i].id
                                                            }
                                                        }))
                                                    }


                                                    when.all(up_g_c_sql_arr).then(function(ups){

                                                        //复制map数据
                                                        var o_maps_id_arr = [];
                                                        for(var i in new_groups){

                                                            if(new_groups[i].maps_id != '[]'){
                                                                
                                                                var maps_id = JSON.parse(new_groups[i].maps_id);
                                                                o_maps_id_arr = o_maps_id_arr.concat(maps_id);
                                                            }
                                                        } 

                                                        db.Maps.findAll({
                                                            where: {
                                                                id: {
                                                                    $in: o_maps_id_arr
                                                                }
                                                            }
                                                        }).then(function(old_maps){

                                                            //构建id到maps的映射对象
                                                            var id_map = {};

                                                            for(var i in old_maps){
                                                                id_map[old_maps[i].id] = old_maps[i];
                                                            }

                                                            //构建新maps的sql数组
                                                            var new_maps_sql_arr = [], n_map = {}, count = 0;

                                                            for(var i in childrenid){

                                                                for(var j in new_groups){

                                                                    var run_map_id = JSON.parse(new_groups[j].maps_id)[0];

                                                                    if(run_map_id){

                                                                        try{
                                                                            n_map = JSON.parse(JSON.stringify(id_map[run_map_id]));
                                                                        }catch(err){
                                                                            n_map = {};
                                                                        }
                                                                        n_map.groups_id = '['+new_groups[j].id+']';
                                                                        n_map.id = null;
                                                                        n_map.user_id = childrenid[i];
                                                                        new_maps_sql_arr.push(db.Maps.create(n_map));
                                                                        n_map = {};
                                                                        count++;
                                                                    }
                                                                }
                                                            }

                                                            when.all(new_maps_sql_arr).then(function(new_maps){

                                                                //更新新组的maps_id
                                                                var new_groups_mapsid_sql = [];
                                                                for(var i in new_maps){
                                                                    new_groups_mapsid_sql.push(db.Groups.update({
                                                                        maps_id: '['+new_maps[i].id+']'
                                                                    },{
                                                                        where: {
                                                                            id: JSON.parse(new_maps[i].groups_id)[0]
                                                                        }
                                                                    }))
                                                                }

                                                                when.all(new_groups_mapsid_sql).then(function(ups){

                                                                    var o_maps_links_id = [];


                                                                    for(var i in new_maps){
                                                                        o_maps_links_id = o_maps_links_id.concat(JSON.parse(new_maps[i].links_id));
                                                                    }

                                                                    db.Links.findAll({
                                                                        where: {
                                                                            id: {
                                                                                $in: o_maps_links_id
                                                                            }
                                                                        }
                                                                    }).then(function(o_maps_links){


                                                                        var n_maps_links_sql = [], n_map_link = null;

                                                                        for(var i in childrenid){

                                                                            for(var j in o_maps_links){
                     
                                                                                try{
                                                                                    n_map_link = JSON.parse(JSON.stringify(o_maps_links[j]));
                                                                                }catch(err){
                                                                                    n_map_link = {};
                                                                                }
                                                                                n_map_link = JSON.parse(JSON.stringify(o_maps_links[j]));
                                                                                n_map_link.scene_id = osid_to_nsid[n_map_link.scene_id];
                                                                                n_map_link.user_id = childrenid[i];
                                                                                //把position_z这个字段来存储对应map的信息，便于下一步更新map的links_id
                                                                                for(var k in new_maps){
                                                                                    if(JSON.parse(new_maps[k].links_id).indexOf(n_map_link.id)!=-1){
                                                                                        n_map_link.position_z = new_maps[k].id;
                                                                                    }
                                                                                }
                                                                                n_map_link.id = null;
                                                                                n_maps_links_sql.push(db.Links.create(n_map_link));
                                                                                n_map_link = null;
                                                                            }
                                                                        }

                                                                        when.all(n_maps_links_sql).then(function(new_maps_links){

                                                                            var mapid_to_n_links = {};

                                                                            for(var i in new_maps_links){

                                                                                if(mapid_to_n_links[new_maps_links[i].position_z]){
                                                                                    mapid_to_n_links[new_maps_links[i].position_z].push(new_maps_links[i].id);
                                                                                }else{
                                                                                    mapid_to_n_links[new_maps_links[i].position_z] = [new_maps_links[i].id];
                                                                                }
                                                                            }

                                                                            var update_map_lid_sql = [];

                                                                            for(var i in mapid_to_n_links){
                                                                                update_map_lid_sql.push(db.Maps.update({
                                                                                    links_id: JSON.stringify(mapid_to_n_links[i])
                                                                                },{
                                                                                    where: {
                                                                                        id: parseInt(i)
                                                                                    }
                                                                                }))
                                                                            }

                                                                            when.all(update_map_lid_sql).then(function(ups){
                                                                                res.json({code: 0,msg:'发送成功'});
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



router.post('/del-map',function(req,res){

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
                    return;
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


router.post('/deal/:id', function(req, res){

    var groupid = req.params.id?parseInt(req.params.id):0;
    if(!groupid){
        res.json({code:-1,msg:'Lack of key value'});
        return;
    }

    utils.autologin(req, res, function(userid){

        var bool = req.body.confirm == 1?10:-1;//插入列表更新show为10，反之更新为-1

        db.Groups.findOne({
            where: {
                show: 0,
                id: groupid
            }
        }).then(function(group){
            if(!group){
                res.json({code:-2,msg:'No such group'});
                return;
            }

            db.Groups.update({
                show: bool
            }, {
                where: {
                    id: group.id
                }
            }).then(function(up){

                if(!up){
                    res.json({code:-3,msg:'更新失败'});
                    return;
                }
                if(req.body.confirm == 0){
                    res.json({code:0,msg:'删除成功'});
                    return;
                }


                var check_key = group.key.split('_')[0];

                db.Groups.findAll({
                    where: {
                        user_id: userid,
                        key: {
                            $like: check_key+'%'
                        },
                        show: {
                            $gt: 0
                        }
                    }
                }).then(function(groups){
                    var update_arr = [];

                    var scenes_id = JSON.parse(group.scenes_id);

                    db.Scenes.findAll({
                        where: {
                            id: {
                                $in: scenes_id
                            }
                        }
                    }).then(function(scenes){
                        var time = new Date().valueOf();

                        for(var i in scenes){

                            for(var j in groups){
                                groups[j].dataValues.thumbsrc = utils.getThumbSrc(scenes[i].type,scenes[i].key,scenes[i].scenestyle);
                            }
                            update_arr.push(db.Scenes.update({
                                show: 11,
                                key: scenes[i].key.split('_')[0]+'_'+userid+'_'+time
                            },{
                                where: {
                                    id: scenes[i].id
                                }
                            }));
                        }

                        update_arr.push(db.Groups.update({
                            createdAt: new Date(),
                            key: check_key+'_'+userid+'_'+(groups.length+1)
                        }, {
                            where: {
                                id: group.id
                            }
                        }));

                        when.all(update_arr).then(function(ups){
                            if(!ups){
                                res.json({code:-3,msg:'更新失败'});
                                return;
                            }
                            res.json({code:0,msg:'插入成功',groups:groups});
                        });
                    });
                });
            });
        });
    });
});


router.get('/check/:id', function(req, res){

    var groupid = req.params.id?parseInt(req.params.id):0;

    if(!groupid){
        res.json({code:-1,msg:'Lack of key value'});
        return;
    }

    utils.autologin(req, res, function(userid){

        db.Groups.findOne({
            where: {
                user_id: userid,
                id: groupid
            }
        }).then(function(group){

            if(!group){
                res.json({code:-2,msg:'No such group'});
                return;
            }

            var check_key = group.key.split('_')[0];

            db.Groups.findAll({
                where: {
                    user_id: userid,
                    key: {
                        $like: check_key+'%'
                    },
                    show: {
                        $gt: 0
                    }
                }
            }).then(function(groups){

                if(groups.length == 0){
                    res.json({code:0});
                    return;
                }
                res.json({code:1,count:groups.length});
            });
        });
    });
});

module.exports = router;
