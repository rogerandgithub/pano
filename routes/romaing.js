var express = require('express');
var router = express.Router();
var config= require('./config');
var utils= require('./utils');
var when= require('when');
var db= require('./model');
var nodegrass = require('nodegrass');


router.get('/',function(req,res){

    utils.autologin(req, res, function(sessionuser){

        var cur_page=parseInt(req.query.cur_page)?parseInt(req.query.cur_page):1;
        var limit=10;
        var r={};
        var gkey2sid={};
        var userinfoarr={};

        var fliteruser=req.query.user?req.query.user.split('|'):null;

        utils.getChildrenUsers(sessionuser,fliteruser).then(function(users){

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
            var order;
            var order_map={
                'desc_area':'area DESC',
                'desc_updated_time':'updatedAt DESC',
                'desc_created_time':'createdAt DESC',
                'desc_community':'community DESC',

                'asc_area':'area ASC',
                'asc_updated_time':'updatedAt ASC',
                'asc_created_time':'createdAt ASC',
                'asc_community':'community ASC'
            }


            for(var i in req.query){
                if(i=='max_area'){
                    conditions.area=conditions.area?conditions.area:{};
                    conditions.area.lte=req.query[i];
                }else if(i=='min_rooms'){
                    conditions.apartment_rooms=conditions.apartment_rooms?conditions.apartment_rooms:{};
                    conditions.apartment_rooms.gte=req.query[i];
                }else if(i=='min_area'){
                    conditions.area=conditions.area?conditions.area:{};
                    conditions.area.gte=req.query[i];
                }else if(i=='start_created_time'){
                    conditions.createdAt=conditions.createdAt?conditions.createdAt:{};
                    conditions.createdAt.gte=req.query[i];
                }else if(i=='end_created_time'){
                    conditions.createdAt=conditions.createdAt?conditions.createdAt:{};
                    conditions.createdAt.lte=req.query[i];
                }else if(i=='start_updated_time'){
                    conditions.updatedAt=conditions.updatedAt?conditions.updatedAt:{};
                    conditions.updatedAt.gte=req.query[i];
                }else if(i=='end_updated_time'){
                    conditions.updatedAt=conditions.updatedAt?conditions.updatedAt:{};
                    conditions.updatedAt.lte=req.query[i];
                }else if(order_map[i]){
                    order=order_map[i];
                }else if(i=='area'||
                         i=='apartment_halls'||
                         i=='apartment_bathrooms'||
                         i=='face'||
                         i=='city'||
                         i=='business_circle'||
                         i=='region'||
                         i=='community'||
                         i=='apartment_rooms'||
                         i=='community_like')
                {
                    conditions[i]={
                        $like:'%'+req.query[i]+'%'
                    };
                }
            }

            db.Groups.findAndCountAll({
                where:conditions,
                limit:limit,
                offset:(cur_page-1)*limit,
                order:order?order:'createdAt DESC'
            }).then(function(result){
                r.count=result.count;
                r.pagenums=Math.ceil(result.count/limit);
                result=result.rows;
                for(var i in result){
                    if(req.query.type=='json'){
                        result[i].dataValues.group_name=result[i].name;
                        result[i].dataValues.name=result[i].city+result[i].region+result[i].community+' '+result[i].building+' '+result[i].room;
                        //leejie
                        result[i].dataValues.privatename=result[i].city+result[i].region+result[i].community;
                        ///
                    }else{
                        result[i].name=result[i].city+result[i].region+result[i].community+' '+result[i].building+' '+result[i].room;
                    }
                }
                r.romaing=result?result:[];
                r.title='漫游列表';
                r.page='romaing';
                r.platform=utils.getPlatform(req);
                r.cur_page=cur_page;
                var ids=[];
                var userarr=[];
                for(var i in result){
                    var temp=JSON.parse(result[i].scenes_id);
                    ids=ids.concat(temp);
                    gkey2sid[result[i].key]=temp[0];
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

                    r.romaing = JSON.parse(JSON.stringify(r.romaing));

                    for(var i in r.romaing){

                        var scenes_id = JSON.parse(r.romaing[i].scenes_id);
                        r.romaing[i].scenes = [];
                        r.romaing[i].scenesname = [];
                        r.romaing[i].jz_arr = [];

                        for(var j in data){
                            if(scenes_id.indexOf(data[j].id) != -1){
                                r.romaing[i].scenes.push(data[j]);
                                if(r.romaing[i].scenesname.indexOf(data[j].name)=='-1'){
                                    r.romaing[i].scenesname.push(data[j].name);
                                }
                                if(data[j].jzmode)r.romaing[i].jz_arr.push(parseInt(data[j].jzmode));
                            }
                        }

                        r.romaing[i].scene_key = r.romaing[i].scenes[0].key;
                        r.romaing[i].prefix = r.romaing[i].scenes[0].prefix;
                        r.romaing[i].type = r.romaing[i].scenes[0].type;
                        r.romaing[i].thumbsrc = utils.getThumbSrc(r.romaing[i].type,r.romaing[i].scene_key,r.romaing[i].scenes[0].scenestyle);


                        if(req.query.type == 'json'){

                            r.romaing[i].telephone = r.romaing[i].scenes[0].telephone;

                            var ad = r.romaing[i].scenes[0].advertisement?r.romaing[i].scenes[0].advertisement.split('</div>'):[''];
                            var ad1 = '',ad2 = '',ad3 = '';

                            if(ad.length>0)
                                ad1 = ad[0].split('<div>').length>1 ? (ad[0].split('<div>'))[1] : ad[0];
                            if(ad.length>1)
                                ad2 = ad[1].split('<div>').length>1 ? (ad[1].split('<div>'))[1] : ad[1];
                            if(ad.length>2)
                                ad3 = ad[2].split('<div>').length>1 ? (ad[2].split('<div>'))[1] : ad[2];

                            r.romaing[i].ad = {
                                ad1: ad1?ad1:'',
                                ad2: ad2?ad2:'',
                                ad3: ad3?ad3:''
                            };

                            if(r.romaing[i].scenestyle == '3'||r.romaing[i].scenestyle == '4'){
                                r.romaing[i].thumb = '/thumbnail/!10p';
                            }else{
                                r.romaing[i].thumb = '/crop/!1024x1024a0a0/thumbnail/!20p';
                            }

                        }
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
                    re.push(sessionuser);

                    db.Users.findAll({
                        where:{
                            id:{
                                in:re
                            }
                        }
                    }).then(function(userinfo) {

                        for(var j in userinfo){
                            userinfo[j].dataValues.sharedesc = userinfo[j].itccontacts;
                            for(var i in r.romaing){
                                if(r.romaing[i].user_id == userinfo[j].id){
                                    r.romaing[i].user_id = userinfo[j];
                                    r.romaing[i].imageUrl = utils.getShareIcon(r.romaing[i].scene_key, r.romaing[i].width, r.romaing[i].type, userinfo[j].sharekey);
                                }
                            }
                        }

                        for(var i in userinfo){
                            if(userinfo[i].id == sessionuser){
                                r.user = userinfo[i];
                            }
                        }

                        utils.getexpire(r.user.id).then(function(expire){

                            r.user.expire = expire;
                            var children_arr = JSON.parse(r.user.children);
                            db.Users.findAll({
                                where:{
                                    id: children_arr
                                }
                            }).then(function(new_children){

                                r.is_grandchild = false;

                                var children_name = [];
                                for(var ui in new_children){
                                    if(children_name.indexOf(new_children[ui].name)==-1){
                                        children_name.push(new_children[ui].name);
                                    }
                                    if(new_children[ui].children!='[]')r.is_grandchild = true;
                                }
                                children_name.push(r.user.nickname);
                                r.children_name = children_name;
                                r.userquery = req.query.user?req.query.user:'';

                                r.is_father = !!(r.user.children!='[]'||sessionuser==1);
                                req.query.type=='json'?res.json(r):res.render('romaing',r);
                            });
                        });
                    })
                });
            });
        });
    });
});

//漫游详细列表
router.get('/list',function(req,res){

    utils.autologin(req, res, function(user_id){

        utils.getChildrenUsers(user_id).then(function(users){

            var groupkey=req.query.groupkey;
            var r;
            var ids=[];
            var owner;

            db.Groups.findOne({
                where:{
                    user_id:{
                        in:users
                    },
                    key:groupkey,
                    show:{
                        $gte:10
                    },
                    scenes_id:{
                        ne:'[]'
                    }
                }
            }).then(function(group){
                if(!group){
                    res.json({code:-1,msg:'没有该全景'});
                    return false;
                }
                owner=group.user_id;

                r={
                    page:'romaing',
                    title:group.city+group.region+group.community+' '+group.building+' '+group.room,
                    platform:utils.getPlatform(req),
                    groupkey:groupkey,
                    group:group,
                    redir: req.query.redir?req.query.redir:''
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
                    return false;
                }
                if(!scenes.length||scenes.length!=ids.length){
                    ids=[];
                    for(var i in scenes){
                        ids.push(scenes[i].id);
                    }
                    return db.Groups.update({
                        scenes_id:JSON.stringify(ids)
                    },{
                        where:{
                            key:groupkey
                        }
                    }).then(function(r){
                        res.redirect(req.originalUrl);
                    });
                }

                for(var sj in scenes){
                    if (scenes[sj].id==r.cover_id) {
                        var arr = scenes.splice(sj,1);
                        scenes.unshift(arr[0]);
                    };
                }

                for(var si in scenes){
                    if(scenes[si].scenestyle == 3 || scenes[si].scenestyle == 4){
                        scenes[si].dataValues.crop = '?imageMogr2/crop/!5000x2000a0a200/thumbnail/!10p';
                    }else{
                        scenes[si].dataValues.crop = '?imageMogr2/crop/!1024x356a0a500/thumbnail/!45p';
                    }

                    scenes[si].dataValues.thumbsrc = utils.getThumbSrc(scenes[si].type,scenes[si].key,scenes[si].scenestyle);

                    if(scenes[si].introduction===null){scenes[si].introduction='';}
                }

                r.scenes = scenes;
                var ad = r.scenes[0].advertisement?r.scenes[0].advertisement.split('</div>'):[''];

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
                r.ad1 = ad1?ad1:'';
                r.ad2 = ad2?ad2:'';
                r.ad3 = ad3?ad3:'';


                db.Users.findOne({
                    where:{
                        id:owner
                    }
                }).then(function(u){
                    r.permission_trademark=u.permission_trademark;
                    r.permission_prefix=u.permission_prefix;
                    r.permission_logo=u.permission_logo;
                    r.nickname=u.name;

                    utils.getexpire(u.id).then(function(expire){

                        // if(Date.parse(expire)<Date.now()&&r.platform.indexOf('pc')!=-1){
                        //     res.render('tip', {
                        //         msg:'账号已过期',
                        //         url:expire
                        //     });
                        //     return;
                        // }

                        u.expiredate = expire;

                        var children_arr = JSON.parse(u.children);
                        r.is_father = children_arr.length>0||u.id==1;
                        r.user = u;
                        db.Users.findAll({
                            where:{
                                id: children_arr
                            }
                        }).then(function(new_children){

                            var children_name = [];
                            for(var ui in new_children){
                                if(children_name.indexOf(new_children[ui].name)==-1){
                                    children_name.push(new_children[ui].name);
                                }
                            }
                            children_name.push(u.nickname);
                            r.children_name = children_name;
                            r.userquery = req.query.user?req.query.user:'';
                            db.Groups.findAll({
                                where: {
                                    user_id: user_id,
                                    show: {
                                        $gte: 10
                                    },
                                    scenes_id:{
                                        ne:"[]"
                                    }
                                }
                            }).then(function(groups){
                                r.sceneCount = groups.length;
                                if(req.query.type=='json'){
                                    res.json(r);
                                }else{
                                    var en = req.query.lang=='en'?'en/':'';
                                    if(r.platform.indexOf('pc')!=-1) {
                                        res.render(en+'romaing-edit',r);
                                    }else{
                                        res.render(en+'romaing-list',r);
                                    }
                                }
                            });
                        });
                    });
                });
            });
        });
    });
});

router.post('/delete',function(req,res){

    utils.autologin(req, res, function(sessionuser){
    
        var groupkey=req.body.groupkey?req.body.groupkey:'';
        var show;
        var deletepsw = utils.hex_sha1('muwenhu'+req.body.deletepsw);

        utils.getChildrenUsers(sessionuser).then(function(users){
            db.Groups.findOne({
                where:{
                    user_id:{
                        in:users
                    },
                    key:groupkey,
                    show:{
                        gte:10
                    }
                }
            }).then(function(group){
                if(!group){
                    res.json({code:-3,msg:'no such group'});
                    return;
                }
                db.Users.findOne({
                    where:{
                        id:sessionuser
                    }
                }).then(function(permission){
                    utils.getexpire(permission.id).then(function(expire){

                        if(permission.permission_delete==0&&permission.level<10){
                            res.json({code:-1,msg:'权限不足'});
                            return;
                        }
                        if( Date.parse(expire)>Date.now() ){
                        	if(permission.deletepsw!=deletepsw){
                                if(req.query.lang=='en'){
                                    res.json({code:-2,msg:'Deletepassword is wrong'});
                                }else{
                                    res.json({code:-2,msg:'删除密码错误'});
                                }
                                return;
                            }
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
                                    key:groupkey,
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
                                    res.json({code:0,msg:'ok'});
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});

router.post('/modify-info',function(req,res){

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
                &&i!='extra'
                &&i!='price'
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

router.post('/telephone-post',function(req,res){

    utils.autologin(req, res, function(sessionuser){

        if(!utils.isArray(req.body.scene_ids)){
            res.json({code:-99,msg:'error'});
            return;
        }
        var scene_ids=JSON.parse(req.body.scene_ids);
        var telephone=req.body.telephone;
        if(scene_ids.length==0||!utils.isTelephone(telephone)){
            res.json({code:-98,msg:'请输入正确电话'});
            return;
        }
        utils.getChildrenUsers(sessionuser).then(function(users){
            db.Scenes.findAll({
                where:{
                    user_id:{
                        in:users
                    },
                    id:{
                        in:scene_ids
                    },
                    show:{
                        gte:0
                    }
                }
            }).then(function(scenes){
                var querys=[];
                for(var i in scenes){
                    querys.push(
                        db.Scenes.update({
                            telephone:telephone
                        },{
                            where:{
                                id:scenes[i].id
                            }
                        })
                    );
                }

                when.all(querys).then(function(result){
                    res.json({msg:'ok',code:0});
                });

            });
        });
    });
});


router.post('/tel',function(req,res){

    utils.autologin(req, res, function(sessionuser){

        var groupid=req.body.groupid;
        var telephone=req.body.telephone;

        if(!sessionuser){
            res.json({code:-1,msg:"You don't seem to be logged in"});
            return;
        }

        if(groupid.length==0||!utils.isTelephone(telephone)){
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

////接口废弃
router.post('/set-trademark',function(req,res){

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
                    return;
                }
                var scenes_id=JSON.parse(group.scenes_id);
                db.Scenes.update({
                    trademark:req.body.url
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

router.post('/setcover',function(req,res){

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



router.post('/set_telephone', function(req, res){

    utils.autologin(req, res, function(sessionuser){

        var telephone=req.body.telephone;
        if(!utils.isTelephone(telephone)){
            res.json({code:-98,msg:'请输入正确电话'});
            return;
        }
        var groupkey=req.body.groupkey;
        if(!groupkey){
            res.json({code:-98,msg:'groupkey is required'});
            return;
        }

        db.Groups.findOne({
            where: {
                key: groupkey
            }
        }).then(function(group){
            if(!group){
                res.json({code:0,msg: 'No such group'});
                return;
            }
            var scenes_id = JSON.parse(group.scenes_id);

            db.Scenes.update({
                telephone:telephone
            },{
                where: {
                    id: {
                        $in: scenes_id
                    }
                }
            }).then(function(up){
                res.json({msg:'ok',code:0});
            })
        });
    });
});


router.post('/set_botad', function(req, res){

    var ad1=req.body.ad1
    var ad2=req.body.ad2
    var ad3=req.body.ad3
    var groupkey = req.body.groupkey

    advertisement = ad1+ad2+ad3==''?'':'<div>'+ad1+'</div>'+'<div>'+ad2+'</div>'+'<div>'+ad3+'</div>';

    utils.autologin(req, res, function(userid){

        db.Groups.findOne({
            where: {
                key: groupkey
            }
        }).then(function(group){
            if(!group){
                res.json({code:-97,msg: 'No such group'});
                return;
            }
            var scenes_id = JSON.parse(group.scenes_id);

            db.Scenes.update({
                advertisement:advertisement
            },{
                where: {
                    id: {
                        $in: scenes_id
                    }
                }
            }).then(function(up){
                res.json({msg:'ok',code:0});
            })
        });
    });
});



router.post('/set_advertisements',function(req,res){

    utils.autologin(req, res, function(sessionuser){

        if(!utils.isArray(req.body.scene_ids)){
            res.json({code:-99,msg:'heheda'});
            return;
        }
        var scene_ids=JSON.parse(req.body.scene_ids);
        if(scene_ids.length==0){
            res.json({code:-98,msg:'heheda'});
            return;
        }
        utils.getChildrenUsers(sessionuser).then(function(users){

            db.Scenes.findAll({
                where:{
                    id:{
                        in:scene_ids,
                    },
                    user_id:{
                        in:users
                    }
                }
            }).then(function(result){
                if(result.length!=scene_ids.length){
                    res.json({code:-97,msg:'heheda'});
                    return;
                }
                db.Scenes.update({
                    advertisement:req.body.advertisement
                },{
                    where:{
                        user_id:sessionuser,
                        id:{
                            in:scene_ids
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
