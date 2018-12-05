var qiniu= require('qiniu');
var express = require('express');
var utils = require('../utils');
var config = require('../config');
var db = require('../model');
var request = require('request');
var router = express.Router();

var redis = utils.client;

qiniu.conf.ACCESS_KEY = "ek6zXNw1Zvl9LAeIXPfzf_EAQZ1sXz0DcXZ0WKsL";
qiniu.conf.SECRET_KEY = "pUBR4t4LZOtXisXKm8O2Tj-tQnCxySmOwSJsXYDx";


router.post('/token',function(req,res){

    utils.autologin(req, res, function(sessionuser){

        var type=req.body.type?req.body.type+'':'0';
        var groupkey;
        var data={
            show:req.body.show,
            type:type,
            introduction:req.body.introduction?req.body.introduction:'',
            user_id:req.session.user,
            cfov:req.body.cfov==undefined?null:req.body.cfov,
            scenestyle:req.body.scenestyle?req.body.scenestyle:0,
            deviceid:req.body.deviceid?req.body.deviceid:'',
            jzmode:req.body.jzmode?parseInt(req.body.jzmode):''
        }

        if(type=='1'){//外景

            if(!req.body.city||!req.body.region||!req.body.community||!req.body.place){
                res.json({code:-98,msg:'?'});
                return;
            }
            req.body.building='外景';
            req.body.room='';
        }

        //if(type=='0'){//房源信息

        if(!utils.isNum(req.body.show+0)||!(parseInt(req.body.show)==0||parseInt(req.body.show)==1)||
            //!utils.isNum(req.body.apartment_rooms)||
            //!utils.isNum(req.body.apartment_halls)||
            //!utils.isNum(req.body.apartment_bathrooms)||
            //!utils.isNum(req.body.floor)||
            //!utils.isNum(req.body.total_floor)||
            //!utils.isNum(req.body.area)||
            !req.body.city||
            !req.body.region||
            !req.body.community||
            //!req.body.building||
            //!req.body.room||
            !req.body.place
          ){
              res.json({code:-99,msg:'房源信息不完整'});
              return;
          }

        data.extra='{"community":"'+req.body.community+'","city":"'+req.body.city+'","region":"'+req.body.region+'","business_circle":"'+req.body.business_circle+'","apartment_rooms":"'+req.body.apartment_rooms+'","apartment_halls":"'+req.body.apartment_halls+'","apartment_bathrooms":"'+req.body.apartment_bathrooms+'","area":"'+req.body.area+'","face":"'+req.body.face+'","floor":"'+req.body.floor+'","total_floor":"'+req.body.total_floor+'","building":"'+req.body.building+'","room":"'+req.body.room+'","place":"'+req.body.place+'"}';

        data.groupname=req.body.city+' '+req.body.region+' '+req.body.community+' '+req.body.building+' '+req.body.room;
        groupkey=utils.hex_sha1(data.groupname+'aienvrenoiwaefsdfawefasdaefwaefawefasdcwavaewfaw')+(data.user_id);;

        //}

        type='0';

        data.show=1;
        //所有人可见

        data.show-=10;
        data.key=utils.hex_sha1(new Date().valueOf()+'kgggggggggggggggggggdfgdhfgdhfghdfgjwegfwagkfjs');

        db.Scenes.findOne({
            where:{
                key:data.key,
                show:{
                    gte:0
                },
                user_id:req.session.user
            }
        }).then(function(scene){
            if(scene){
              console.log('当前场景名称已存在，请使用其他名称命名');
              res.json({code:-97,msg:'当前场景名称已存在，请使用其他名称命名'});
              return;
            }

            var redis_token='token_new_scene_'+data.key;
            db.Scenes.create(data).then(function(result){

                var putPolicy = new qiniu.rs.PutPolicy('suteng:images/scenes/'+data.key+'/allinone.jpg','120.76.27.228/token/uploadcallback','name=$(fname)&hash=$(etag)'+'&key='+data.key+'&user_id='+req.session.user+'&groupkey='+groupkey+'&type='+type+'&redis_token='+redis_token);

                var uptoken = putPolicy.token();

                res.json({token:uptoken,userid:data.key,code:0,msg:'OK'});
            });
        });
    });
});



router.post('/uploadcallback',function(req,res){

    var data={
        key:req.body.key,
        groupkey:req.body.groupkey,
        user_id:req.body.user_id,
        type:req.body.type?parseInt(req.body.type):0
    };

    db.Scenes.findOne({
        where:{
            key:data.key,
            user_id:data.user_id,
            show:{
                gte:-10,
                lt:0
            }
        }
    }).then(function(scene){
        if(!scene){
            res.json({code:-99,msg:'error'});
            return;
        }

        var scene_id=scene.id;
        data.show=parseInt(scene.show);

        data.extra=JSON.parse(scene.extra);

        db.Groups.findOne({
            where:{
                key:data.groupkey
            }
        }).then(function(group){
            //已经存在组
            if(group){
                var scenes_id=JSON.parse(group.scenes_id);
                scenes_id.push(scene_id);
                //更新group的scenesid
                db.Groups.update({
                    scenes_id:JSON.stringify(scenes_id),
                    show:11
                },{
                    where:{
                        key:data.groupkey
                    }
                }).then(function(up){
                    //更新scenes的groupsid
                    return db.Scenes.update({
                        group_id: group.id,
                        name:data.extra.place,
                        show:data.show+10,
                        extra:'{}'
                    },{
                        where:{
                            key:data.key
                        }
                    });
                }).then(function(result){

                    res.json({code:0,msg:'OK'});

                });
            }else{

                //创建组
                db.Groups.create({
                    key:data.groupkey,
                    user_id:data.user_id,
                    show:11,
                    links_id:"{}",
                    comments_id:"{}",
                    maps_id:"[]",
                    scenes_id:"["+scene_id+"]",

                    city:data.extra.city,
                    region:data.extra.region,
                    community:data.extra.community,

                    building:data.extra.building?data.extra.building:'',
                    room:data.extra.room?data.extra.room:'',
                    floor:data.extra.floor?data.extra.floor:0,
                    apartment_halls:data.extra.apartment_halls?data.extra.apartment_halls:0,
                    apartment_rooms:data.extra.apartment_rooms?data.extra.apartment_rooms:0,
                    apartment_bathrooms:data.extra.apartment_bathrooms?data.extra.apartment_bathrooms:0,
                    area:data.extra.area?data.extra.area:0,
                    total_floor:data.extra.total_floor?data.extra.total_floor:0,
                    floor:data.extra.floor?data.extra.floor:0,
                    business_circle:data.extra.business_circle?data.extra.business_circle:'',
                    face:data.extra.face?data.extra.face:'',
                    lat:0,
                    lng:0,

                    extra:'{}'
                }).then(function(result){

                    //更新scenes的groupsid
                    db.Scenes.update({
                    group_id: result.id,
                    name:data.extra.place,
                    show:data.show+10,
                    extra:'{}'
                    },{
                        where:{
                            id:scene_id
                        }
                    }).then(function(result){

                        request({
                            url: 'http://apis.baidu.com/showapi_open_bus/ip/ip?ip='+utils.getClientIp(req),
                            headers: {
                                apikey: '5143027707684af3ebd3707303c62616'
                            }
                        },function(data,status,headers){
                            var data = JSON.parse(data);
                            // res.json(data);
                            console.log(data);

                            db.Users.findOne({
                                where: {
                                    id: data.userid
                                }
                            }).then(function(user){
                                db.Action_log.create({
                                    user_id: data.user_id,
                                    type: 1,
                                    ip: utils.getClientIp(req),
                                    group_id: group.id,
                                    platform: utils.getPlatform(req),
                                    region: data.showapi_res_body.region,
                                    city: data.showapi_res_body.city,
                                    operate: ' 上传了新全景'+result.id,
                                    other: ''
                                }).then(function(log){
                                    res.json({code:0,msg:'OK'});
                                });
                            });
                        });
                    });
                });
            }
        });
    });
});

router.post('/map', function ( req, res ) {

    var groupkey = req.body.groupkey;
    var groupid = req.body.groupid;
    var group;

    var map = groupkey?{key:groupkey}:{id:groupid};

    utils.getChildrenUsers(req.session.user).then(function(users){
        map.user_id = {
            in: users
        }
        db.Groups.findOne({
            where:map
        }).then(function(g){
            if(!g){
                res.json({code:-1,msg:'no such group!'});
                return false;
            }
            group=g;

            // if(group.maps_id!='[]'){
            //     res.json({code:-2,msg:'map exist!'});
            //     return false;
            // }

            return db.Maps.create({
               show:-9,
               user_id:group.user_id,
               key:utils.hex_sha1(group.key+((new Date().valueOf())+'')),
               name:'户型图',
               links_id:'[]',
               group_id: group.id,
               extra:'{}'
            });
        }).then(function(map){
            if(map==false){
                return false;
            }

            var redis_token='token_new_map_'+map.key;
            redis.hmset(redis_token, { used: 'false', date: new Date().valueOf()+'' }, function(err) {
                if(err){
                    console.log(err);
                    res.json({code:-2,msg:'redis error!'});
                    return;
                }
                var putPolicy = new qiniu.rs.PutPolicy('suteng:images/maps/'+map.key+'.jpg','120.76.27.228/token/mapcallback','name=$(fname)&hash=$(etag)'+'&key='+map.key+'&user_id='+group.user_id+'&redis_token='+redis_token);

                var uptoken = putPolicy.token();
                var imgurl = 'images/maps/'+map.key+'.jpg';

                res.json({code:0,msg:'OK',token:uptoken,userid:group.user_id,url:imgurl,key:map.key});
            });
        });
    });
});

router.post('/mapcallback',function(req,res){

    var key=req.body.key;
    var user_id=req.body.user_id;

    var redis_token=req.body.redis_token;
    if(!redis_token){
        res.json({code:-1,msg:'redis token missing'});
        return;
    }

    redis.hgetall(redis_token, function(err, object) {
        if(!object){
            res.json({code:-3,msg:'Unknown token'});
            return;
        }
        if(object.used=='true'){
            res.json({code:-2,msg:'Token has been used'});
            return;
        }
        //20mins
        if(new Date().valueOf()-parseInt(object.date)>1000*60*20){
            res.json({code:-2,msg:'Token is out of Date'});
            return;
        }

        redis.hmset(redis_token, { used: 'true', date:object.date }, function(err) {
           if(err){
               console.log(err);
               res.json({code:-2,msg:'redis error'});
               return;
           }
            db.Maps.findOne({
                where:{
                    user_id:user_id,
                    key:key,
                    show:{
                        gte:-10,
                        lt:0
                    }
                }
            }).then(function(map){
                if(!map){
                    res.json({code:-9,msg:'map callback error'});
                    return false;
                }

                //更新map show
                db.Maps.update({
                    show:1
                },{
                    where:{
                        user_id:user_id,
                        key:key
                    }
                }).then(function(r){
                    db.Groups.findOne({
                        where:{
                            id:JSON.parse(map.groups_id)[0]
                        }
                    }).then(function(group){
                        var maps_id=JSON.parse(group.maps_id);
                        //删除原来的map
                        return db.Maps.update({
                            show:-99
                        },{
                            where:{
                                id:maps_id
                            }
                        });
                    }).then(function(r){
                        //更新groups maps_id
                        return db.Groups.update({
                            maps_id:'['+map.id+']'
                        },{
                            where:{
                                id:{
                                    in:JSON.parse(map.groups_id)
                                }
                            }
                        });
                    }).then(function(r){
                        res.json({code:0,msg:'OK'});
                    });
                });
            });
        });
    });
});


router.post( '/topad', function ( req, res ) {
    var userid = req.session.user;
    if(req.body.type=='global'){
        db.Users.findOne({
            where:{
                id:userid
            }
        }).then(function(u){
            if(!u.permission_trademark){
                res.json({code:-1,msg:'No Authority'});
                return;
            }
            var string = 'global_'+new Date().valueOf();
            var imgname = string+'.jpg';
            var imgurl='images/trademarks/'+imgname;
            var putPolicy = new qiniu.rs.PutPolicy('suteng:'+imgurl,'120.76.27.228/token/topad/callback','name=$(fname)&hash=$(etag)'+'&type=global&user_id='+req.session.user+'&imgname='+imgname);
            var uptoken = putPolicy.token();
            res.json({msg:'OK',code:0,token:uptoken,userid:userid,url:imgurl,key:string});
        });
        return;
    }

    var groupid = req.body.groupid;
    var map = { id:groupid };


    utils.getChildrenUsers(req.session.user).then(function(users){

        map.user_id = {in:users};

        db.Groups.findOne({
            where:map
        }).then(function(group){
            if(!group){
                res.json({code:-1,msg:'no such group'});
                return;
            }
            var string = groupid+'_'+(new Date().valueOf());
            var imgname = string+'.jpg';
            var imgurl='images/trademarks/'+imgname;
            var putPolicy = new qiniu.rs.PutPolicy('suteng:'+imgurl,'120.76.27.228/token/topad/callback','name=$(fname)&hash=$(etag)'+'&id='+groupid+'&user_id='+group.user_id+'&imgname='+imgname);
            var uptoken = putPolicy.token();
            res.json({msg:'OK',code:0,token:uptoken,userid:group.user_id,url:imgurl,key:string});

        });
    });
});


router.post('/topad/callback',function(req,res){
    if(req.body.type=='global'){
        utils.getChildrenUsers(req.body.user_id).then(function(users){
            db.Users.update({
                trademark:config.cdnImagesPath+'/trademarks/'+req.body.imgname
            },{
                where:{
                    id:{
                        in:users
                    }
                }
            }).then(function(u){
                res.json({code:0,msg:'OK'});
                return;
            });
        });
        return;
    }

    db.Groups.findOne({
        where:{
            id:req.body.id,
            user_id:req.body.user_id
        }
    }).then(function(group){
        if(!group){
            res.json({code:-1,msg:'error'});
            return;
        }
        var scenes_id=JSON.parse(group.scenes_id);
        db.Scenes.update({
            trademark:config.cdnImagesPath+'/trademarks/'+req.body.imgname
        },{
            where:{
                id:{
                    in:scenes_id
                }
            }
        }).then(function(up){
            res.json({code:0,msg:'OK'});
        });
    });
});


router.post( '/botad', function ( req, res ) {
    var userid = req.session.user;
    if(req.body.type=='global'){
        db.Users.findOne({
            where:{
                id:userid
            }
        }).then(function(u){
            if(!u.permission_trademark){
                res.json({code:-1,msg:'No Authority'});
                return;
            }
            var string = 'global_'+(new Date().valueOf());
            var imgname = string+'.jpg';
            var imgurl='images/bottrademarks/'+imgname;
            var putPolicy = new qiniu.rs.PutPolicy('suteng:'+imgurl,'120.76.27.228/token/botad/callback','name=$(fname)&hash=$(etag)'+'&type=global&user_id='+req.session.user+'&imgname='+imgname);
            var uptoken = putPolicy.token();
            res.json({msg:'OK',code:0,token:uptoken,userid:userid,url:imgurl,key:string});
        });
        return;
    }

    var groupkey = req.body.groupkey;
    var groupid = req.body.groupid;

    var map = groupkey?{key:groupkey}:{id:groupid};

    utils.getChildrenUsers(req.session.user).then(function(users){
        map.user_id = {in:users};
        db.Groups.findOne({
            where:map
        }).then(function(group){
            if(!group){
                res.json({code:-1,msg:'error'});
                return;
            }
            var string = groupkey?groupkey:groupid+'_'+(new Date().valueOf());
            var imgname = string+'.jpg';
            var imgurl='images/bottrademarks/'+imgname;
            var putPolicy = new qiniu.rs.PutPolicy('suteng:'+imgurl,'120.76.27.228/token/botad/callback','name=$(fname)&hash=$(etag)'+'&id='+groupid+'&user_id='+group.user_id+'&imgname='+imgname);
            var uptoken = putPolicy.token();
            res.json({msg:'OK',code:0,token:uptoken,userid:group.user_id,url:imgurl,key:string});
        });
    });
});

router.post('/botad/callback',function(req,res){

    if(req.body.type=='global'){
        utils.getChildrenUsers(req.body.user_id).then(function(users){
            db.Users.update({
                itccontactstel:config.cdnImagesPath+'/bottrademarks/'+req.body.imgname
            },{
                where:{
                    id:{
                        in:users
                    }
                }
            }).then(function(u){
                res.json({code:0,msg:'OK'});
                return;
            });
        });
        return;
    }

    var bottrademark = config.cdnImagesPath+'/bottrademarks/'+req.body.imgname;

    db.Groups.findOne({
        where:{
            id:req.body.id,
            user_id:req.body.user_id
        }
    }).then(function(group){
        if(!group){
            res.json({code:-1,msg:'error'});
            return;
        }
        db.Groups.update({
            bottrademark: bottrademark
        },{
            where:{
                id:group.id
            }
        }).then(function(up){
            res.json({code:0,msg:'OK',groupid:bottrademark});
        });
    });
});


router.post('/music', function(req, res){

    utils.autologin(req, res, function(sessionuser){
        if(req.body.type=='global'){

            var musicname='global_'+(new Date().valueOf())+'/'+req.body.name;
            var musicurl='images/music/'+musicname;
            var putPolicy = new qiniu.rs.PutPolicy('suteng:'+musicurl,'120.76.27.228/token/music/callback','name=$(fname)&hash=$(etag)'+'&type=global&user_id='+sessionuser+'&musicname='+musicname);
            var uptoken = putPolicy.token();
            res.json({msg:'OK',code:0,token:uptoken,musicurl:musicurl});
            return;

        }
        return;

        var groupkey = req.body.groupkey;

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
                    res.json({code:-1,msg:'error'});
                    return;
                }
                var musicname=groupkey+'_'+(new Date().valueOf());
                var musicurl='images/music/'+musicname;
                var putPolicy = new qiniu.rs.PutPolicy('suteng:'+musicurl,'120.76.27.228/token/music/callback','name=$(fname)&hash=$(etag)'+'&key='+groupkey+'&user_id='+group.user_id+'&musicname='+musicname);
                var uptoken = putPolicy.token();
                res.json({msg:'OK',code:0,token:uptoken,userid:group.user_id,musicurl:musicurl});
            });
        });
    });
});

router.post('/music/callback', function(req, res){
    var type = req.body.type;
    var url = config.cdnImagesPath+'images/music/'+req.body.musicname;
    var groupkey = req.body.groupkey;
    var user_id = req.body.user_id;
    if(type=="global"){
        var url = config.cdnImagesPath+"/music/"+req.body.musicname;
        db.Users.update({
            bgmusic:url
        },{
            where:{
                id:user_id
            }
        }).then(function(user){
            if(!user){
                return false;
            }
            res.json({code:0,msg:'OK'});
        })
    }
    return;
});



router.post('/key',function(req,res){

    var type=req.body.type?req.body.type+'':'0';
    var groupkey;
    var data={
        show:req.body.show,
        type:type,
        introduction:req.body.introduction?req.body.introduction:'',
        user_id:req.session.user,
        cfov:req.body.cfov==undefined?null:req.body.cfov,
        scenestyle:req.body.scenestyle?req.body.scenestyle:0,
        deviceid:req.body.deviceid?req.body.deviceid:'',
        jzmode:req.body.jzmode?parseInt(req.body.jzmode):''
    }

    console.log(data.deviceid);

    var count = req.body.count;

    utils.autologin(req, res, function(sessionuser){

        utils.getexpire(sessionuser).then(function(expiredate){

            var expire = Date.parse(expiredate);
            var todaytime = Date.parse((new Date(Date.now())).toLocaleDateString());

            if(expire<todaytime){
                res.json({code:-7,msg:'当前账户已过期，请续费后再上传'});
                return;
            }

            db.Users.findOne({
                where:{
                    id:sessionuser
                }
            }).then(function(user){

                var deviceid = user.itcmstertel;
                if(deviceid&&data.deviceid!=deviceid){
                    res.json({code:-5,msg:'请使用正确的设备上传'});
                    return;
                }
    console.log(data.deviceid);


                if(type=='1'){//外景

                    if(!req.body.city||!req.body.region||!req.body.community||!req.body.place){
                        res.json({code:-98,msg:'?'});
                        return;
                    }
                    req.body.building='外景';
                    req.body.room='';
                }

                if(!utils.isNum(req.body.show+0)||!(parseInt(req.body.show)==0||parseInt(req.body.show)==1)||
                    !req.body.city||
                    !req.body.region||
                    !req.body.community||
                    !req.body.place
                ){
                    res.json({code:-99,msg:'房源信息不完整'});
                    return;
                }

                data.extra='{"community":"'+req.body.community+'","city":"'+req.body.city+'","region":"'+req.body.region+'","business_circle":"'+req.body.business_circle+'","apartment_rooms":"'+req.body.apartment_rooms+'","apartment_halls":"'+req.body.apartment_halls+'","apartment_bathrooms":"'+req.body.apartment_bathrooms+'","area":"'+req.body.area+'","face":"'+req.body.face+'","floor":"'+req.body.floor+'","total_floor":"'+req.body.total_floor+'","building":"'+req.body.building+'","room":"'+req.body.room+'","place":"'+req.body.place+'"}';

                data.groupname=req.body.city+' '+req.body.region+' '+req.body.community+' '+req.body.building+' '+req.body.room;
                groupkey=utils.hex_sha1(data.groupname+'aienvrenoiwaefsdfawefasdaefwaefawefasdcwavaewfaw')+(data.user_id);;

                //}

                type='0';

                data.show=1;
                //所有人可见

                data.show-=10;
                data.key=utils.hex_sha1(new Date().valueOf()+'kgggggggggggggggggggdfgdhfgdhfghdfgjwegfwagkfjs');

                db.Scenes.findOne({
                    where:{
                        key:data.key,
                        show:{
                            gte:0
                        },
                        user_id:req.session.user
                    }
                }).then(function(scene){
                    if(scene){
                      console.log('当前场景名称已存在，请使用其他名称命名');
                      res.json({code:-97,msg:'当前场景名称已存在，请使用其他名称命名'});
                      return;
                    }

                    var redis_token='token_new_scene_'+data.key;
                    db.Scenes.create(data).then(function(result){

                        var putPolicy = new qiniu.rs.PutPolicy('suteng:images/scenes/'+data.key+'/allinone.jpg','120.76.27.228/token/keycallback','name=$(fname)&hash=$(etag)'+'&key='+data.key+'&user_id='+req.session.user+'&groupkey='+groupkey+'&type='+type+'&redis_token='+redis_token+'&count='+count);

                        var uptoken = putPolicy.token();

                        res.json({token:uptoken,userid:data.key,code:0,msg:'OK'});
                    });
                });
            })

        });
    });
});


router.post('/keycallback',function(req,res){
    var data={
        key:req.body.key,
        groupkey:req.body.groupkey,
        user_id:req.body.user_id,
        type:req.body.type?parseInt(req.body.type):0
    };
    db.Scenes.findOne({
        where:{
            key:data.key,
            user_id:data.user_id,
            show:{
                gte:-10,
                lt:0
            }
        }
    }).then(function(scene){
        if(!scene){
            res.json({code:-99,msg:'error'});
            return;
        }

        var scene_id=scene.id;
        data.show=parseInt(scene.show);

        data.extra=JSON.parse(scene.extra);

        db.Groups.findOne({
            where:{
                key:data.groupkey
            }
        }).then(function(group){
            //已经存在组
            if(group){
                var scenes_id=JSON.parse(group.scenes_id);
                scenes_id.push(scene_id);
                //更新group的scenesid
                db.Groups.update({
                    scenes_id:JSON.stringify(scenes_id),
                    show:11
                },{
                    where:{
                        key:data.groupkey
                    }
                }).then(function(up){
                    //更新scenes的groupsid
                    return db.Scenes.update({
                        group_id: group.id,
                        name:data.extra.place,
                        show:data.show+10,
                        extra:'{}'
                    },{
                        where:{
                            key:data.key
                        }
                    });
                }).then(function(result){

                    res.json({code:0,msg:'OK'});

                });
            }else{

                //创建组
                db.Groups.create({
                    key:data.groupkey,
                    user_id:data.user_id,
                    show:11,
                    links_id:"{}",
                    comments_id:"{}",
                    maps_id:"[]",
                    scenes_id:"["+scene_id+"]",

                    city:data.extra.city,
                    region:data.extra.region,
                    community:data.extra.community,

                    building:data.extra.building?data.extra.building:'',
                    room:data.extra.room?data.extra.room:'',
                    floor:data.extra.floor?data.extra.floor:0,
                    apartment_halls:data.extra.apartment_halls?data.extra.apartment_halls:0,
                    apartment_rooms:data.extra.apartment_rooms?data.extra.apartment_rooms:0,
                    apartment_bathrooms:data.extra.apartment_bathrooms?data.extra.apartment_bathrooms:0,
                    area:data.extra.area?data.extra.area:0,
                    total_floor:data.extra.total_floor?data.extra.total_floor:0,
                    floor:data.extra.floor?data.extra.floor:0,
                    business_circle:data.extra.business_circle?data.extra.business_circle:'',
                    face:data.extra.face?data.extra.face:'',
                    lat:0,
                    lng:0,

                    extra:'{}'
                }).then(function(result){

                    //更新scenes的groupsid
                    db.Scenes.update({
                        group_id: result.id,
                        name:data.extra.place,
                        show:data.show+10,
                        extra:'{}'
                    },{
                        where:{
                            id:scene_id
                        }
                    }).then(function(result){

                        res.json({code:0,msg:'OK'});
                    });

                });

            }

        });
    });
});



router.post('/slogan/token', function ( req, res ){

    utils.autologin(req, res, function(sessionuser){

        if(!req.body.position_x||!req.body.position_y){
            res.json({code:-66, msg:'Lack of x and y'});
            return;
        }

        var groupid=req.body.groupid;
        var data = {
            user_id:sessionuser,
            position_x:req.body.position_x,
            position_y:req.body.position_y,
            position_z:0,
            reply_id:groupid,
            is_description: 0,
            is_new:1,
            type:1,//图片介绍
            is_mosaic:0
        }

        db.Comments.create(data).then(function(comment){

            if(comment==false){return false;}

            var scene_key=req.body.scene_key;

            var redis_token='token_slogan_'+scene_key;
            // redis.hmset(redis_token, { used: 'false', date: new Date().valueOf()+'' }, function(err){
            //     if(err){
            //         console.log(err);
            //         res.json({code:-2,msg:'redis error'});
            //         return;
            //     }

                var type='0';

                var imgurl = 'images/slogan/'+scene_key+'/'+comment.id+'/allinone.jpg';
                var putPolicy = new qiniu.rs.PutPolicy('suteng:'+imgurl,'120.76.27.228/token/slogan/callback','name=$(fname)&hash=$(etag)'+'&key='+scene_key+'&user_id='+req.session.user+'&commentid='+comment.id+'&type='+type+'&redis_token'+redis_token);

                var uptoken = putPolicy.token();

                console.log(comment.id);
                res.json({token:uptoken,userid:sessionuser,key:imgurl,msg:'OK',code:0,userid:comment.id});
            // });
        });
    });   
});

router.post('/slogan/callback', function( req, res ){
    var scene_key = req.body.key,
        id=req.body.commentid;

        console.log(id);

    db.Scenes.findOne({
        where: {
            key: scene_key
        }
    }).then(function(scene){
        if(!scene)return false;
        db.Comments.update({
            is_description:scene.id
        }, {
            where: {
                id:id
            }
        }).then(function(comment){
            if(!comment){
                res.json({code:-1,msg:'更新失败'});
                return;
            }
            res.json({code:0,msg:'OK'});
        });
    });
});


router.post('/upload12token', function ( req, res ) {

    if(!req.body.name){
        res.json({msg:'请输入全景名称',code:-97});
        return;
    }

    utils.autologin(req, res, function(sessionuser){

        var data = {
            user_id:sessionuser,
            show:1,//所有人可见
            key:utils.hex_sha1(new Date().valueOf()+'kgggggggggggggggggggdfgdhfgdhfghdfgjwegfwagkfjs'),
            name:req.body.name,
            group_id:req.body.groups_id?req.body.groups_id:0,
            extra:'{}',
            scenestyle:req.body.scenestyle==6?0:3,
            is_new:2
        }
        data.show=1;
        //所有人可见
        data.show-=10;

        db.Scenes.create(data).then(function(scene){

            if(scene==false){return false;}

            if(!req.body.groups_id){

                var groupkey=utils.hex_sha1('aienvrenoiwaefsdfawefasdaefwaefawefasdcwavaewfaw'+data.user_id+(new Date().valueOf()+''));

                db.Groups.create({
                    key:groupkey,
                    user_id:req.session.user,
                    show:11,
                    links_id:"{}",
                    comments_id:"{}",
                    maps_id:"[]",
                    scenes_id:"["+scene.id+"]",

                    city:req.body.city?req.body.city:'',
                    region:req.body.region?req.body.region:'',
                    community:req.body.community?req.body.community:'',
                    business_circle:req.body.business_circle?req.body.business_circle:'',
                    room:req.body.room?req.body.room:'',
                    building:req.body.building?req.body.building:'',

                    extra:'{}'
                }).then(function(group){

                    var redis_token='token_new_scene_'+scene.key;
                    redis.hmset(redis_token, { used: 'false', date: new Date().valueOf()+'' }, function(err) {
                        if(err){
                            console.log(err);
                            res.json({code:-2,msg:'redis error'});
                            return;
                        }
                        type='0';

                        var putPolicy = new qiniu.rs.PutPolicy('suteng:images/scenes/'+scene.key+'/allinone.jpg','http://120.76.27.228/token/upload12callback','name=$(fname)&hash=$(etag)'+'&key='+scene.key+'&user_id='+req.session.user+'&groups_id='+group.id+'&type='+type+'&redis_token'+redis_token);

                        var uptoken = putPolicy.token();

                        res.json({groupid:group.id,token:uptoken,userid:req.session.user,key:'images/scenes/'+scene.key+'/allinone.jpg'});
                    });
                });
            }else{
                var groups_id = parseInt(req.body.groups_id);

                db.Groups.findOne({
                    where:{
                        id:groups_id
                    }
                }).then(function(group){
                    if(!group){return false;};
                    var scenes_id=JSON.parse(group.scenes_id);
                    scenes_id.push(scene.id);
                    //更新group的scenesid
                    db.Groups.update({
                        scenes_id:JSON.stringify(scenes_id),
                        show:11
                    },{
                        where:{
                            id:groups_id
                        }
                    }).then(function(group){

                        if(!group){return false;};

                        var redis_token='token_new_scene_'+scene.key;
                        redis.hmset(redis_token, { used: 'false', date: new Date().valueOf()+'' }, function(err) {
                            if(err){
                                console.log(err);
                                res.json({code:-2,msg:'redis error'});
                                return;
                            }
                            type='1';
                            
                            var putPolicy = new qiniu.rs.PutPolicy('suteng:images/scenes/'+scene.key+'/allinone.jpg','http://120.76.27.228/token/upload12callback','name=$(fname)&hash=$(etag)'+'&key='+scene.key+'&user_id='+sessionuser+'&groups_id='+group.id+'&type='+type+'&redis_token'+redis_token);


                            var uptoken = putPolicy.token();

                            res.json({token:uptoken,userid:sessionuser,key:'images/scenes/'+scene.key+'/allinone.jpg'});
                        });
                    });
                });
            }
        });
    });   
});

router.post('/upload12',function(req,res){

    var data={
        key:req.body.key,
        groups_id:req.body.groups_id?req.body.groups_id:-1,
        type:req.body.type?req.body.type:'0'
    };

    if(data.type=='0'){
        db.Scenes.update({
            show:1,
            group_id: data.groups_id
        },{
            where:{
                key:req.body.key
            }
        }).then(function(result){
            res.json({code:0,msg:'OK'});
        });

    }else{
        db.Scenes.update({
            show:1
        },{
            where:{
                key:req.body.key
            }
        }).then(function(result){
            res.json({code:0,msg:'OK'});
        });
    }
    
    return;

    db.Scenes.findOne({
        where:{
            key:data.key,
            user_id:data.user_id,
            show:{
                gte:-10,
                lt:0
            }
        }
    }).then(function(scene){
        if(!scene){
            res.json({code:-99,msg:'error'});
            return;
        }

        var scene_id=scene.id;
        data.show=parseInt(scene.show);

        data.extra=JSON.parse(scene.extra);

        //已经存在组
        if(data.groups_id!=-1){

            db.Groups.findOne({
                where:{
                    id:data.groups_id
                }
            }).then(function(group){
                var scenes_id=JSON.parse(group.scenes_id);
                scenes_id.push(scene_id);
                //更新group的scenesid
                db.Groups.update({
                    scenes_id:JSON.stringify(scenes_id),
                    show:11
                },{
                    where:{
                        id:data.groups_id
                    }
                }).then(function(up){
                    //更新scenes的groupsid
                    return db.Scenes.update({
                        group_id: group.id,
                        name:data.extra.place,
                        show:data.show+10,
                        extra:'{}'
                    },{
                        where:{
                            key:data.key
                        }
                    });
                }).then(function(result){
                    res.json({code:0,msg:'OK'});
                });
            });

        }else{

            //创建组
            var groupkey=utils.hex_sha1('aienvrenoiwaefsdfawefasdaefwaefawefasdcwavaewfaw'+data.user_id+(new Date().valueOf()+''));
            db.Groups.create({
                key:groupkey,
                user_id:data.user_id,
                show:11,
                links_id:"{}",
                comments_id:"{}",
                maps_id:"[]",
                scenes_id:"["+scene_id+"]",

                city:data.extra.city,
                region:data.extra.region,
                community:data.extra.community,

                building:data.extra.building?data.extra.building:'',
                room:data.extra.room?data.extra.room:'',
                floor:data.extra.floor?data.extra.floor:0,
                apartment_halls:data.extra.apartment_halls?data.extra.apartment_halls:0,
                apartment_rooms:data.extra.apartment_rooms?data.extra.apartment_rooms:0,
                apartment_bathrooms:data.extra.apartment_bathrooms?data.extra.apartment_bathrooms:0,
                area:data.extra.area?data.extra.area:0,
                total_floor:data.extra.total_floor?data.extra.total_floor:0,
                floor:data.extra.floor?data.extra.floor:0,
                business_circle:data.extra.business_circle?data.extra.business_circle:'',
                face:data.extra.face?data.extra.face:'',
                lat:0,
                lng:0,

                extra:'{}'
            }).then(function(result){

                //更新scenes的groupsid
                db.Scenes.update({
                    group_id: result.id,
                    name:data.extra.place,
                    show:data.show+10,
                    extra:'{}'
                },{
                    where:{
                        id:scene_id
                    }
                }).then(function(result){

                    res.json({code:0,msg:'OK'});
                });
            });
        }
    });
});

router.post( '/logo', function ( req, res ) {

    db.Users.findOne({
        where:{
            id:req.session.user
        }
    }).then(function(u){
        if(u.permission_logo!=1&&u.level<10){
            res.json({code:-1,msg:'Permission denied'});
            return;
        }
        var imgname=u.company+'_'+u.id+'_'+new Date().valueOf()+'.jpg';
        var putPolicy = new qiniu.rs.PutPolicy('suteng:images/logos/'+imgname,'120.76.27.228/token/logocallback','name=$(fname)&hash=$(etag)'+'&imgname='+imgname+'&user_id='+u.id);

        var uptoken = putPolicy.token();

        res.json({token:uptoken,key:'images/logos/'+imgname,url:'images/logos/'+imgname});
    });
});

router.post('/logocallback',function(req,res){
    console.log("logo upload callback");
    var user_id=req.body.user_id;
    db.Users.findOne({
        where:{
            id:user_id
        }
    }).then(function(u){
        if(u.permission_logo!=1&&u.level<10){
            console.log("logo upload Failed");
            res.json({code:-1,msg:'Permission denied'});
            return;
        }
        utils.getChildrenUsers(user_id).then(function(users){
            db.Users.update({
                logo:config.cdnImagesPath+'/logos/'+req.body.imgname
            },{
                where:{
                    id:{
                        in:users
                    }
                }
            }).then(function(r){
                console.log("logo upload success");
                res.json({code:0,msg:'OK'});
            });
        });
    });
});

module.exports= router;
