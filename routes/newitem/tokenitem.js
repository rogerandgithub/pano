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


// //记录用户行为

// var t={
//     ip:utils.getClientIp(req),
//     user_id:req.session?req.session.user:'anonymous',
//     group_id:group.id,
//     city:group.city,
//     region:group.region,
//     community:group.community,
//     building:group.building,
//     room:scene.name,
//     visited_times:scene.visited+1,
//     apartment_halls:group.apartment_halls,
//     apartment_bathrooms:group.apartment_bathrooms,
//     apartment_rooms:group.apartment_rooms,
//     business_circle:group.business_circle,
//     groupCreatedTime:group.createdAt,
//     groupUpdatedTime:group.updatedAt,
//     userCreatedTime:0,
//     sex:0,
//     platform:utils.getPlatform(req)
// }


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

                var putPolicy = new qiniu.rs.PutPolicy('suteng:images/scenes/'+data.key+'/allinone.jpg','120.76.27.228/tokenitem/uploadcallback','name=$(fname)&hash=$(etag)'+'&key='+data.key+'&user_id='+req.session.user+'&groupkey='+groupkey+'&type='+type+'&redis_token='+redis_token);

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
                        groups_id:"["+group.id+"]",
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
                    groups_id:"["+result.id+"]",
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
               groups_id:'['+group.id+']',
               extra:'{}'
            });
        }).then(function(map){
            if(map==false){
                return false;
            }

            var redis_token='token_new_map_'+map.key;
            redis.hmset(redis_token, { used: 'false', date: new Date().valueOf()+'' }, function(err) {
                if(err){
                    res.json({code:-2,msg:'redis error!'});
                    return;
                }
                var putPolicy = new qiniu.rs.PutPolicy('suteng:images/maps/'+map.key+'.jpg','120.76.27.228/tokenitem/mapcallback','name=$(fname)&hash=$(etag)'+'&key='+map.key+'&user_id='+group.user_id+'&redis_token='+redis_token);

                var uptoken = putPolicy.token();
                var imgurl = 'images/maps/'+map.key+'.jpg';

                res.json({code:0,msg:'OK',token:uptoken,userid:group.user_id,url:imgurl,key:map.key,mapid:map.id});
            });
        });
    });
});


router.post('/slogan', function ( req, res ){

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
            hotimg_name: req.body.hotimg_name,
            hotimg_des: req.body.hotimg_des,
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
            //         res.json({code:-2,msg:'redis error'});
            //         return;
            //     }

                var type='0';

                var imgurl = 'images/slogan/'+scene_key+'/'+comment.id+'/allinone.jpg';
                var putPolicy = new qiniu.rs.PutPolicy('suteng:'+imgurl,'120.76.27.228/tokenitem/slogancallback','name=$(fname)&hash=$(etag)'+'&key='+scene_key+'&user_id='+sessionuser+'&commentid='+comment.id+'&type='+type+'&redis_token'+redis_token);

                var uptoken = putPolicy.token();

                console.log(comment.id);
                res.json({token:uptoken,userid:sessionuser,key:imgurl,msg:'ok',code:0,id:comment.id});
            // });
        });
    });   
});


router.post('/slogancallback', function( req, res ){
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
            res.json({code:0,msg:'ok'});
        });
    });
});

router.post('/mapcallback',function(req,res){

    var key=req.body.key;
    var user_id=req.body.user_id;

    var redis_token=req.body.redis_token;
    if(!redis_token){
        res.json({code:-1,msg:'redis token missions'});
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
            // if(!u.permission_trademark){
            //     res.json({code:-1,msg:'No Authority'});
            //     return;
            // }
            var string = 'global_'+new Date().valueOf();
            var imgname = string+'.jpg';
            var imgurl='images/trademarks/'+imgname;
            var putPolicy = new qiniu.rs.PutPolicy('suteng:'+imgurl,'120.76.27.228/tokenitem/topad/callback','name=$(fname)&hash=$(etag)'+'&type=global&user_id='+req.session.user+'&imgname='+imgname);
            var uptoken = putPolicy.token();
            res.json({msg:'OK',code:0,token:uptoken,userid:userid,url:imgurl,key:string});
        });
        return;
    }

    var groupkey = req.body.groupkey;
    var groupid = req.body.groupid;
    var map = groupid?{id:groupid}:{key:groupkey};


    utils.getChildrenUsers(req.session.user).then(function(users){
        map.user_id = {in:users};
        db.Groups.findOne({
            where:map
        }).then(function(group){
            if(!group){
                res.json({code:-1,msg:'no such group'});
                return;
            }
            var string = group.key+'_'+(new Date().valueOf());
            var imgname = string+'.jpg';
            var imgurl='images/trademarks/'+imgname;
            var putPolicy = new qiniu.rs.PutPolicy('suteng:'+imgurl,'120.76.27.228/tokenitem/topad/callback','name=$(fname)&hash=$(etag)'+'&key='+group.key+'&user_id='+group.user_id+'&imgname='+imgname);
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
            key:req.body.key,
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
            // if(!u.permission_trademark){
            //     res.json({code:-1,msg:'No Authority'});
            //     return;
            // }
            var string = 'global_'+(new Date().valueOf());
            var imgname = string+'.jpg';
            var imgurl='images/bottrademarks/'+imgname;
            var putPolicy = new qiniu.rs.PutPolicy('suteng:'+imgurl,'120.76.27.228/tokenitem/botad/callback','name=$(fname)&hash=$(etag)'+'&type=global&user_id='+req.session.user+'&imgname='+imgname);
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
            var putPolicy = new qiniu.rs.PutPolicy('suteng:'+imgurl,'120.76.27.228/tokenitem/botad/callback','name=$(fname)&hash=$(etag)'+'&id='+groupid+'&user_id='+group.user_id+'&imgname='+imgname);
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
            var putPolicy = new qiniu.rs.PutPolicy('suteng:'+musicurl,'120.76.27.228/tokenitem/musiccallback','name=$(fname)&hash=$(etag)'+'&type=global&user_id='+sessionuser+'&musicname='+musicname);
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
                var musicname=group.key+'_'+(new Date().valueOf());
                var musicurl='images/music/'+musicname;
                var putPolicy = new qiniu.rs.PutPolicy('suteng:'+musicurl,'120.76.27.228/tokenitem/musiccallback','name=$(fname)&hash=$(etag)'+'&key='+group.key+'&user_id='+group.user_id+'&musicname='+musicname);
                var uptoken = putPolicy.token();
                res.json({msg:'OK',code:0,token:uptoken,userid:group.user_id,musicurl:musicurl});
            });
        });
    });
});

router.post('/musiccallback', function(req, res){
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

                        var putPolicy = new qiniu.rs.PutPolicy('suteng:images/scenes/'+data.key+'/allinone.jpg','120.76.27.228/tokenitem/keycallback','name=$(fname)&hash=$(etag)'+'&key='+data.key+'&user_id='+req.session.user+'&groupkey='+groupkey+'&type='+type+'&redis_token='+redis_token+'&count='+count);

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
                        groups_id:"["+group.id+"]",
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
                        groups_id:"["+result.id+"]",
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
            //         res.json({code:-2,msg:'redis error'});
            //         return;
            //     }

                var type='0';

                var imgurl = 'images/slogan/'+scene_key+'/'+comment.id+'/allinone.jpg';
                var putPolicy = new qiniu.rs.PutPolicy('suteng:'+imgurl,'120.76.27.228/tokenitem/slogancallback','name=$(fname)&hash=$(etag)'+'&key='+scene_key+'&user_id='+req.session.user+'&commentid='+comment.id+'&type='+type+'&redis_token'+redis_token);

                var uptoken = putPolicy.token();

                console.log(comment.id);
                res.json({token:uptoken,userid:sessionuser,key:imgurl,msg:'OK',code:0,userid:comment.id});
            // });
        });
    });   
});

router.post('/slogancallback', function( req, res ){
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


router.post('/upload12', function ( req, res ) {

    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
    
    if(!req.body.name){
        res.json({msg:'请输入全景名称',code:-97});
        return;
    }

    utils.autologin(req, res, function(sessionuser){

        utils.getexpire(sessionuser).then(function(expire){

            db.Groups.findAll({
                where: {
                    user_id: sessionuser,
                    show: {
                        $gt: 0
                    }
                }
            }).then(function(groups){

                if(Date.parse(expire)<Date.now()&&groups.length>=200){
                    res.json({code:-1, msg:'体验版最多发布200个房间'});
                    return;
                }
                var data = {
                    user_id:sessionuser,
                    show:1,//所有人可见
                    key:utils.hex_sha1(new Date().valueOf()+'kgggggggggggggggggggdfgdhfgdhfghdfgjwegfwagkfjs'),
                    name:req.body.name,
                    groups_id:req.body.groups_id?'['+req.body.groups_id+']':'[]',
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
                            show:-1,
                            links_id:"{}",
                            comments_id:"{}",
                            maps_id:"[]",
                            scenes_id:"["+scene.id+"]",

                            city:req.body.city?req.body.city:'',
                            region:req.body.region?req.body.region:'',
                            community:req.body.community?req.body.community:'',
                            business_circle:req.body.business_circle?req.body.business_circle:'',
                            room:req.body.room?req.body.room:'',
                            price:req.body.price?req.body.price:'',
                            building:req.body.building?req.body.building:'',

                            extra:'{}'
                        }).then(function(group){

                            var redis_token='token_new_scene_'+scene.key;
                            redis.hmset(redis_token, { used: 'false', date: new Date().valueOf()+'' }, function(err) {
                                if(err){
                                    res.json({code:-2,msg:'redis error'});
                                    return;
                                }
                                type='0';

                                var putPolicy = new qiniu.rs.PutPolicy('suteng:images/scenes/'+scene.key+'/allinone.jpg','http://120.76.27.228/tokenitem/upload12callback','name=$(fname)&hash=$(etag)'+'&key='+scene.key+'&user_id='+req.session.user+'&groups_id='+group.id+'&type='+type+'&redis_token'+redis_token);

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
                                scenes_id:JSON.stringify(scenes_id)
                            },{
                                where:{
                                    id:groups_id
                                }
                            }).then(function(group){

                                if(!group){return false;};

                                var redis_token='token_new_scene_'+scene.key;
                                redis.hmset(redis_token, { used: 'false', date: new Date().valueOf()+'' }, function(err) {
                                    if(err){
                                        res.json({code:-2,msg:'redis error'});
                                        return;
                                    }
                                    type='1';
                                    
                                    var putPolicy = new qiniu.rs.PutPolicy('suteng:images/scenes/'+scene.key+'/allinone.jpg','http://120.76.27.228/tokenitem/upload12callback','name=$(fname)&hash=$(etag)'+'&key='+scene.key+'&user_id='+sessionuser+'&groups_id='+group.id+'&type='+type+'&redis_token'+redis_token);


                                    var uptoken = putPolicy.token();

                                    res.json({token:uptoken,userid:sessionuser,key:'images/scenes/'+scene.key+'/allinone.jpg'});
                                });
                            });
                        });
                    }
                });
            });
        });
    });   
});

router.post('/upload12callback',function(req,res){


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
            db.Groups.update({
                show: 11
            }, {
                where: {
                    id: data.groups_id
                }
            }).then(function(newg) {
                res.json({code:0,msg:'OK'});
            });
        });

    }else{
        db.Scenes.update({
            show:1
        },{
            where:{
                key:req.body.key
            }
        }).then(function(result){
            db.Groups.update({
                show: 11
            }, {
                where: {
                    id: data.groups_id
                }
            }).then(function(newg) {
                res.json({code:0,msg:'OK'});
            });
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
                        groups_id:"["+group.id+"]",
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
                    groups_id:"["+result.id+"]",
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
        // if(u.permission_logo!=1&&u.level<10){
        //     res.json({code:-1,msg:'Permission denied'});
        //     return;
        // }
        var imgname=u.company+'_'+u.id+'_'+new Date().valueOf()+'.jpg';
        var putPolicy = new qiniu.rs.PutPolicy('suteng:images/logos/'+imgname,'120.76.27.228/tokenitem/logocallback','name=$(fname)&hash=$(etag)'+'&imgname='+imgname+'&user_id='+u.id);

        var uptoken = putPolicy.token();

        res.json({token:uptoken,userid:u.id,key:'images/logos/'+imgname,url:'images/logos/'+imgname});
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
        // if(u.permission_logo!=1&&u.level<10){
        //     console.log("logo upload Failed");
        //     res.json({code:-1,msg:'Permission denied'});
        //     return;
        // }
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


router.post('/shareicon', function ( req, res ) {

    db.Users.findOne({
        where:{
            id:req.session.user
        }
    }).then(function(u){
        if(!u){
            res.json({code:-1,msg:'NO such user'});
            return;
        }
        var time = Date.parse(new Date());
        var imgname = u.id+'_'+new Date().valueOf()+'/'+time+'.jpg';
        var putPolicy = new qiniu.rs.PutPolicy('suteng:images/shareicon/'+imgname,'120.76.27.228/tokenitem/shareiconcallback','name=$(fname)&hash=$(etag)'+'&imgname='+imgname+'&user_id='+u.id);

        var uptoken = putPolicy.token();
        res.json({token:uptoken,userid:u.id,key:'images/shareicon/'+imgname,url:'images/shareicon/'+imgname});
    });
});

router.post('/shareiconcallback',function(req,res){
    var user_id=req.body.user_id;
    db.Users.findOne({
        where:{
            id:user_id
        }
    }).then(function(u){
        if(!u){
            console.log("shareicon upload Failed");
            res.json({code:-1,msg:'NO such user'});
            return;
        }
        var sharearr = [2,req.body.imgname];
        db.Users.update({
            sharekey: JSON.stringify(sharearr)
        },{
            where:{
                id:user_id
            }
        }).then(function(r){
            console.log("logo upload success");
            res.json({code:0,msg:'OK'});
        });
    });
});













function getuploadarr(key){

    return [
        key+".tiles/mobile_b.jpg",
        key+".tiles/mobile_d.jpg",
        key+".tiles/mobile_f.jpg",
        key+".tiles/mobile_l.jpg",
        key+".tiles/mobile_r.jpg",
        key+".tiles/mobile_u.jpg",
        key+".tiles/preview.jpg",

        key+".tiles/mres_b/l1/1/l1_b_1_1.jpg",
        key+".tiles/mres_b/l1/1/l1_b_1_2.jpg",
        key+".tiles/mres_b/l1/2/l1_b_2_1.jpg",
        key+".tiles/mres_b/l1/2/l1_b_2_2.jpg",

        key+".tiles/mres_b/l2/1/l2_b_1_1.jpg",
        key+".tiles/mres_b/l2/1/l2_b_1_2.jpg",
        key+".tiles/mres_b/l2/1/l2_b_1_3.jpg",
        key+".tiles/mres_b/l2/1/l2_b_1_4.jpg",

        key+".tiles/mres_b/l2/2/l2_b_2_1.jpg",
        key+".tiles/mres_b/l2/2/l2_b_2_2.jpg",
        key+".tiles/mres_b/l2/2/l2_b_2_3.jpg",
        key+".tiles/mres_b/l2/2/l2_b_2_4.jpg",

        key+".tiles/mres_b/l2/3/l2_b_3_1.jpg",
        key+".tiles/mres_b/l2/3/l2_b_3_2.jpg",
        key+".tiles/mres_b/l2/3/l2_b_3_3.jpg",
        key+".tiles/mres_b/l2/3/l2_b_3_4.jpg",

        key+".tiles/mres_b/l2/4/l2_b_4_1.jpg",
        key+".tiles/mres_b/l2/4/l2_b_4_2.jpg",
        key+".tiles/mres_b/l2/4/l2_b_4_3.jpg",
        key+".tiles/mres_b/l2/4/l2_b_4_4.jpg",




        key+".tiles/mres_d/l1/1/l1_d_1_1.jpg",
        key+".tiles/mres_d/l1/1/l1_d_1_2.jpg",
        key+".tiles/mres_d/l1/2/l1_d_2_1.jpg",
        key+".tiles/mres_d/l1/2/l1_d_2_2.jpg",

        key+".tiles/mres_d/l2/1/l2_d_1_1.jpg",
        key+".tiles/mres_d/l2/1/l2_d_1_2.jpg",
        key+".tiles/mres_d/l2/1/l2_d_1_3.jpg",
        key+".tiles/mres_d/l2/1/l2_d_1_4.jpg",

        key+".tiles/mres_d/l2/2/l2_d_2_1.jpg",
        key+".tiles/mres_d/l2/2/l2_d_2_2.jpg",
        key+".tiles/mres_d/l2/2/l2_d_2_3.jpg",
        key+".tiles/mres_d/l2/2/l2_d_2_4.jpg",

        key+".tiles/mres_d/l2/3/l2_d_3_1.jpg",
        key+".tiles/mres_d/l2/3/l2_d_3_2.jpg",
        key+".tiles/mres_d/l2/3/l2_d_3_3.jpg",
        key+".tiles/mres_d/l2/3/l2_d_3_4.jpg",

        key+".tiles/mres_d/l2/4/l2_d_4_1.jpg",
        key+".tiles/mres_d/l2/4/l2_d_4_2.jpg",
        key+".tiles/mres_d/l2/4/l2_d_4_3.jpg",
        key+".tiles/mres_d/l2/4/l2_d_4_4.jpg",




        key+".tiles/mres_f/l1/1/l1_f_1_1.jpg",
        key+".tiles/mres_f/l1/1/l1_f_1_2.jpg",
        key+".tiles/mres_f/l1/2/l1_f_2_1.jpg",
        key+".tiles/mres_f/l1/2/l1_f_2_2.jpg",

        key+".tiles/mres_f/l2/1/l2_f_1_1.jpg",
        key+".tiles/mres_f/l2/1/l2_f_1_2.jpg",
        key+".tiles/mres_f/l2/1/l2_f_1_3.jpg",
        key+".tiles/mres_f/l2/1/l2_f_1_4.jpg",

        key+".tiles/mres_f/l2/2/l2_f_2_1.jpg",
        key+".tiles/mres_f/l2/2/l2_f_2_2.jpg",
        key+".tiles/mres_f/l2/2/l2_f_2_3.jpg",
        key+".tiles/mres_f/l2/2/l2_f_2_4.jpg",

        key+".tiles/mres_f/l2/3/l2_f_3_1.jpg",
        key+".tiles/mres_f/l2/3/l2_f_3_2.jpg",
        key+".tiles/mres_f/l2/3/l2_f_3_3.jpg",
        key+".tiles/mres_f/l2/3/l2_f_3_4.jpg",

        key+".tiles/mres_f/l2/4/l2_f_4_1.jpg",
        key+".tiles/mres_f/l2/4/l2_f_4_2.jpg",
        key+".tiles/mres_f/l2/4/l2_f_4_3.jpg",
        key+".tiles/mres_f/l2/4/l2_f_4_4.jpg",




        key+".tiles/mres_l/l1/1/l1_l_1_1.jpg",
        key+".tiles/mres_l/l1/1/l1_l_1_2.jpg",
        key+".tiles/mres_l/l1/2/l1_l_2_1.jpg",
        key+".tiles/mres_l/l1/2/l1_l_2_2.jpg",

        key+".tiles/mres_l/l2/1/l2_l_1_1.jpg",
        key+".tiles/mres_l/l2/1/l2_l_1_2.jpg",
        key+".tiles/mres_l/l2/1/l2_l_1_3.jpg",
        key+".tiles/mres_l/l2/1/l2_l_1_4.jpg",

        key+".tiles/mres_l/l2/2/l2_l_2_1.jpg",
        key+".tiles/mres_l/l2/2/l2_l_2_2.jpg",
        key+".tiles/mres_l/l2/2/l2_l_2_3.jpg",
        key+".tiles/mres_l/l2/2/l2_l_2_4.jpg",

        key+".tiles/mres_l/l2/3/l2_l_3_1.jpg",
        key+".tiles/mres_l/l2/3/l2_l_3_2.jpg",
        key+".tiles/mres_l/l2/3/l2_l_3_3.jpg",
        key+".tiles/mres_l/l2/3/l2_l_3_4.jpg",

        key+".tiles/mres_l/l2/4/l2_l_4_1.jpg",
        key+".tiles/mres_l/l2/4/l2_l_4_2.jpg",
        key+".tiles/mres_l/l2/4/l2_l_4_3.jpg",
        key+".tiles/mres_l/l2/4/l2_l_4_4.jpg",





        key+".tiles/mres_r/l1/1/l1_r_1_1.jpg",
        key+".tiles/mres_r/l1/1/l1_r_1_2.jpg",
        key+".tiles/mres_r/l1/2/l1_r_2_1.jpg",
        key+".tiles/mres_r/l1/2/l1_r_2_2.jpg",

        key+".tiles/mres_r/l2/1/l2_r_1_1.jpg",
        key+".tiles/mres_r/l2/1/l2_r_1_2.jpg",
        key+".tiles/mres_r/l2/1/l2_r_1_3.jpg",
        key+".tiles/mres_r/l2/1/l2_r_1_4.jpg",

        key+".tiles/mres_r/l2/2/l2_r_2_1.jpg",
        key+".tiles/mres_r/l2/2/l2_r_2_2.jpg",
        key+".tiles/mres_r/l2/2/l2_r_2_3.jpg",
        key+".tiles/mres_r/l2/2/l2_r_2_4.jpg",

        key+".tiles/mres_r/l2/3/l2_r_3_1.jpg",
        key+".tiles/mres_r/l2/3/l2_r_3_2.jpg",
        key+".tiles/mres_r/l2/3/l2_r_3_3.jpg",
        key+".tiles/mres_r/l2/3/l2_r_3_4.jpg",

        key+".tiles/mres_r/l2/4/l2_r_4_1.jpg",
        key+".tiles/mres_r/l2/4/l2_r_4_2.jpg",
        key+".tiles/mres_r/l2/4/l2_r_4_3.jpg",
        key+".tiles/mres_r/l2/4/l2_r_4_4.jpg",



        key+".tiles/mres_u/l1/1/l1_u_1_1.jpg",
        key+".tiles/mres_u/l1/1/l1_u_1_2.jpg",
        key+".tiles/mres_u/l1/2/l1_u_2_1.jpg",
        key+".tiles/mres_u/l1/2/l1_u_2_2.jpg",

        key+".tiles/mres_u/l2/1/l2_u_1_1.jpg",
        key+".tiles/mres_u/l2/1/l2_u_1_2.jpg",
        key+".tiles/mres_u/l2/1/l2_u_1_3.jpg",
        key+".tiles/mres_u/l2/1/l2_u_1_4.jpg",

        key+".tiles/mres_u/l2/2/l2_u_2_1.jpg",
        key+".tiles/mres_u/l2/2/l2_u_2_2.jpg",
        key+".tiles/mres_u/l2/2/l2_u_2_3.jpg",
        key+".tiles/mres_u/l2/2/l2_u_2_4.jpg",

        key+".tiles/mres_u/l2/3/l2_u_3_1.jpg",
        key+".tiles/mres_u/l2/3/l2_u_3_2.jpg",
        key+".tiles/mres_u/l2/3/l2_u_3_3.jpg",
        key+".tiles/mres_u/l2/3/l2_u_3_4.jpg",

        key+".tiles/mres_u/l2/4/l2_u_4_1.jpg",
        key+".tiles/mres_u/l2/4/l2_u_4_2.jpg",
        key+".tiles/mres_u/l2/4/l2_u_4_3.jpg",
        key+".tiles/mres_u/l2/4/l2_u_4_4.jpg",
        key+'.tiles/pano_s.jpg'
    ];
}

var exec = require('child_process').exec;
var fs = require('fs');
var path = require('path');
var files = [];
var formidable = require('formidable');
var queuefun = require('queue-fun');
var Queue = queuefun.Queue(); 


router.post('/upload', function(req, res){

    var formParse = new formidable.IncomingForm();  
    formParse.uploadDir = path.join(__dirname, '../../public/pano/temp/');
    formParse.multiples = true;  // 设置为多文件上传  
    formParse.keepExtensions = true;  // 是否包含文件后缀  

    formParse.on('file', function (filed, file) {
        files.push([filed, file]);
    });

    formParse.parse(req, function(error,fields,files) {

        var groupid = fields.groups_id && !isNaN(fields.groups_id) ? parseInt(fields.groups_id) : false;
        
        if(!groupid && (!fields.city || !fields.region || !fields.community || !fields.building || !fields.room|| !fields.business_circle)){
            res.json({code: -2, msg: '房源信息不完整'});
            return;
        }

        var token = fields.token?fields.token:null;

        utils.autologin(req, res, function(userid){
            if (error) {
                res.json({code: -1, msg: JSON.stringify(error.message)});  
                return;
            }

            var key = utils.md5(new Date().valueOf() + '' + userid).substr(0,10);
            var fileurl = path.join(__dirname, '../../public/pano/' + key + '.jpg');

            // //创建文件夹
            var dirurl = path.join(__dirname, '../../public/pano/pano2T/' + key);
            fs.mkdirSync(dirurl);

            // for(var i in files){
            if(files.length < 5){
                res.json({code: -1, msg: '文件数量不对'});
                return;
            }

            if(!files.file1 || !files.file2 || !files.file3 || !files.file4 || !files.file5){
                res.json({code: -1, msg: "缺乏文件"});
                return;
            }

            if(fs.existsSync(files.file1.path)){
                fs.renameSync(files.file1.path, dirurl + '/' + files.file1.name);
            }else{
                res.json({code:-1,msg:"缺少文件"});
                return;
            }

            if(fs.existsSync(files.file2.path)){
                fs.renameSync(files.file2.path, dirurl + '/' + files.file2.name);
            }else{
                res.json({code: -1, msg: "缺少文件"});
                return;
            }

            if(fs.existsSync(files.file3.path)){
                fs.renameSync(files.file3.path, dirurl + '/' + files.file3.name);
            }else{
                res.json({code: -1, msg: "缺少文件"});
                return;
            }

            if(fs.existsSync(files.file4.path)){
                fs.renameSync(files.file4.path, dirurl + '/' + files.file4.name);
            }else{
                res.json({code: -1, msg: "缺少文件"});
                return;
            }

            if(fs.existsSync(files.file5.path)){
                fs.renameSync(files.file5.path, dirurl + '/pano_s.jpg');
            }else{
                res.json({code: -1, msg: "缺少文件"});
                return;
            }

            var images = require('images');
            var inputpath = path.join(dirurl + '/pano_s.jpg');
            var outputpath = path.join(dirurl + '/thumb.jpg');
            var i = images(inputpath).size(500).save(outputpath, {quality: 100});

            var data={
                type: -1,//-1是新的还没拼接的
                show: 11,
                key: key,
                order: -1,
                scenestyle: 5,
                user_id: userid,
                name: fields.name ? fields.name : '',
                deviceid: fields.deviceid ? fields.deviceid : '',
                cfov: fields.cfov==undefined ? null : fields.cfov,
                jzmode: fields.jzmode ? parseInt(fields.jzmode) : '',
                introduction: fields.introduction ? fields.introduction : '',
                width: '0'
            }


            var uuid = fields.uuid ? fields.uuid : parseInt(Math.random() * 10000000) + '';
            var group_key = utils.md5(uuid + 'qson').substr(0, 10);


            db.Scenes.create(data).then(function(scene){

                if(!scene){
                    res.json({code: -3, msg: '创建失败'});
                    fs.unlinkSync(fileurl);
                    return;
                }

                var groupmap;
                groupid && groupid !=0 ? groupmap = {id: groupid} : groupmap = {key: group_key};

                db.Groups.findOne({
                    where: groupmap
                }).then(function(group){

                    if(!group){

                        console.log('如果没有，生成一个新的group');

                        var group_data = {
                            key: group_key,
                            user_id: userid,
                            show: 11,
                            links_id: "{}",
                            comments_id: "{}",
                            maps_id: "[]",
                            scenes_id: "[" + scene.id + "]",
                            city: fields.city,
                            region: fields.region,
                            community: fields.community,
                            building: fields.building,
                            room: fields.room,
                            housekey: fields.key, //房源的唯一标识号
                            floor: fields.floor ? fields.floor : 0,
                            apartment_halls: fields.apartment_halls ? fields.apartment_halls : 0,
                            apartment_rooms: fields.apartment_rooms ? fields.apartment_rooms : 0,
                            apartment_bathrooms: fields.apartment_bathrooms ? fields.apartment_bathrooms : 0,
                            area: fields.area ? fields.area : 0,
                            total_floor: fields.total_floor ? fields.total_floor : 0,
                            floor: fields.floor ? fields.floor : 0,
                            business_circle: fields.business_circle,
                            face: '',
                            lat: (fields.lat && fields.lat > 0.1) ? fields.lat : 0,
                            lng: (fields.lng && fields.lng > 0.1) ? fields.lng : 0,
                            area: fields.area,
                            price: fields.price,
                            extra: fields.desc ? fields.desc : '{}',
                            name: fields.name ? fields.name : '',
                            width: 0
                        }

                        return db.Groups.create(group_data);

                    }else{

                        //如果有group，更新groups的scenes_id
                        var scenes_id = JSON.parse(group.scenes_id);
                        scenes_id.push(scene.id);

                        return db.Groups.update({
                            scenes_id: JSON.stringify(scenes_id)
                        },{
                            where: {
                                id: group.id
                            }
                        }).then(function(up){
                            if(!up){
                                res.json({code: -4, msg: 'update failed'});
                                return;
                            }
                            return db.Groups.findOne({
                                where: {
                                    id: group.id
                                }
                            });
                        })
                    }
                }).then(function(group){

                    //更新scene的groupsid
                    db.Scenes.update({
                        group_id: group.id,
                        order: JSON.parse(group.scenes_id).length
                    },{
                        where: {
                            id: scene.id
                        }
                    }).then(function(up){
                        res.json({code: 0, msg: '上传成功', key: key});

                        //往数据库里插入任务
                        db.Missions.create({
                            key: key,
                            type: 2,   // type==2是还拼接加裁切的任务
                            status: 0  // 状态0是还未处理的状态
                        }).then(function(mission){
                            // 触发上传
                            startUpload(); 
                        }).catch(function(err){
                            console.log(err);
                        })
                    });
                });
            });
        }, token);
    });
});

/*
var upload_flg = 0;  // 控制上传
// 每次只上传一套，用普通的方式上传
function startUpload(){
    console.log('sqing--------------------------');
    // 上传控制器判断
    if(upload_flg){
        return;
    }else{
        upload_flg = 1;  // 上传控制器开
    }
    db.Missions.findOne({
        where: {
            status: 0
        },
    }).then(function(mission){
        if(!mission){
            // 当前没有任务上传
            console.log('No mission to upload');
            return;
        }
        console.log('start uploading.....');

        var fileurl = path.join(__dirname, '../../public/pano/' + mission.key + '.jpg');
        var pathurl = path.join(__dirname, '../../public/pano/pano2T/' + mission.key + '/');  
        // var cmd = '/home/qson/suteng/linux_2cam_server/release/StiPano2camCloud ' + pathurl + ' ' + pathurl + ' /home/qson/suteng/linux_2cam_server/data/commonPath pano.jpg';

        var cmd = '/home/qson/suteng/linux_2cam_server/appCloud/build2/StiPano2camCloud ' + pathurl + ' ' + pathurl + ' /home/qson/suteng/linux_2cam_server/data/commonPath pano.jpg';

        exec(cmd, function(err, stdout,stderr){
            upload_flg = 0;  // 更改上传控制器
            console.log('upload_flg:', upload_flg);
            
            //要上传的空间
            var bucket = 'suteng';
            //上传到七牛后保存的文件名
            var key = 'pano/' + mission.key + '.jpg';
            var token = uptoken(bucket, key);
            //要上传文件的本地路径
            var filePath = path.join(__dirname, '../../public/pano/pano2T/' + mission.key + '/pano.jpg');

            uploadFile(token, key, filePath, function(err){
                db.Scenes.update({
                    type: 18 // new mode
                }, {
                    where: {
                        key: mission.key
                    }
                }).then(function(up){
                    db.Missions.update({
                        status: 2
                    },{
                        where: {
                            key: mission.key
                        }
                    })
                    // emptyDir(path.join(__dirname, '../../public/pano/pano2T/' + mission.key));
                    // rmEmptyDir(path.join(__dirname, '../../public/pano/pano2T/' + mission.key));
                    startUpload();  // 循环调用上传功能
                });
            });
            
        });
    })
}
*/




var upload_flg = 0;  // 控制上传
var LIMIT_UPLOAD_NUM = 4;  // 上传数量控制器
var upload_num = LIMIT_UPLOAD_NUM;  // 上传数量控制器
// 每次只上传一套，用普通的方式上传
function startUpload(){
    db.Missions.findAll({
        where: {
            status: 0
        },
        limit: LIMIT_UPLOAD_NUM  // 上传数量控制
    }).then(function(missions){
        if(!missions.length){
            // 当前没有任务上传
            console.log('No mission to upload');
            return;
        }
        // 上传控制器判断
        if(upload_flg){
            return;
        }else{
            upload_flg = 1;  // 上传控制器开
        }
        // 当未上传张数小于控制上传的张数时，将控制上传的张数改为未上传的张数，确保上传功能自动化
        upload_num = missions.length;
        console.log('start uploading.....', 'upload_num', upload_num);

        // 队列上传
        var queue = new Queue(missions.length, {
            event_err: function(err){
                console.log('upload error:', err)
            },
            event_succ: function(key){
                console.log('完成了一个任务.....');
                db.Missions.update({
                    status: 2
                },{
                    where: {
                        key: key
                    }
                })
            }
        });

        queue.allArray(missions, sqing_convert, {'event_succ': 'start queue....'}).then(function(key){
            // queueup();
        });

        queue.start();

        function sqing_convert(obj){
            var q = queuefun.Q;
            var deferred = q.defer();
            var key = obj.key;

            var fileurl = path.join(__dirname, '../../public/pano/' + key + '.jpg');
            var pathurl = path.join(__dirname, '../../public/pano/pano2T/' + key + '/');
            var cmd = '/home/qson/suteng/linux_2cam_server/release/StiPano2camCloud_20181123 ' + pathurl + ' ' + pathurl + ' /home/qson/suteng/linux_2cam_server/data/commonPath pano.jpg';
            
            //var cmd = '/home/qson/suteng/linux_2cam_server/appCloud/build2/StiPano2camCloud ' + pathurl + ' ' + pathurl + ' /home/qson/suteng/linux_2cam_server/data/commonPath pano.jpg';

            exec(cmd, function(err, stdout, stderr){
                if(err){
                    upload_num--;  //如果拼接不成功，任务量也减一
                    return;
                };
                upload_num--;  //如果拼接成功，任务量减一

                if(upload_num == 0){
                    upload_num = LIMIT_UPLOAD_NUM;  // 全部拼接成功，将状态值恢复初始化
                    upload_flg = 0;  // 更改上传控制器
                }
                console.log('upload_flg:', upload_flg, '-----upload_num:', upload_num);

                //要上传的空间
                var bucket = 'suteng';
                //上传到七牛后保存的文件名
                var qiniu_key = 'pano/' + key + '.jpg';
                var token = uptoken(bucket, qiniu_key);
                //要上传文件的本地路径
                var filePath = path.join(__dirname, '../../public/pano/pano2T/' + key + '/pano.jpg');

                uploadFile(token, qiniu_key, filePath, function(err){
                    db.Scenes.update({
                        type: 18 // new mode
                    }, {
                        where: {
                            key: key
                        }
                    }).then(function(up){
                        db.Missions.update({
                            status: 2
                        },{
                            where: {
                                key: key
                            }
                        })
                        // emptyDir(path.join(__dirname, '../../public/pano/pano2T/' + key));
                        // rmEmptyDir(path.join(__dirname, '../../public/pano/pano2T/' + key));
                        startUpload();  // 循环调用上传功能
                    });
                });
                return deferred.promise;
            });
        }
    })
}


var count_num = 5;
//任务轮询
function queueup(){
    //标记下当前执行的任务数
    utils.client.get('upNum', function(err, value){

        value = parseInt(value);

        if(value >= count_num){ //8个任务就暂时不新增任务
            return;
        }

        db.Missions.findAll({
            where: {
                status: 0
            },
            limit: count_num,
            order: "createdAt DESC"
        }).then(function(missions){
    
            if(missions.length == 0){
                console.log("No Missions");
                return;
            }

            //如果任务数加起来共超过8个，就先处理一部分
            var toLen = missions.length + value;
            if(toLen > count_num){
                missions.splice(count_num - value, toLen - count_num);
            }
            
            //登记下目前正在进行的任务数
            var le = (value + missions.length) < 0 ? 0 : (value + missions.length);
            utils.redis.set('upNum', le);
    
            var arr = [];
            for(var i in missions){
                arr.push(missions[i].id);
            }

            //推进了队列中的任务状态值改成1
            db.Missions.update({
                status: 1
            },{
                where: {
                    id: {$in: arr}
                }
            }).then(function(up){
    
                var queue = new Queue(missions.length,{
                    event_err: function(err){console.log('queue-succ:', err)},  //失败
                    event_succ: function(key){
                        console.log('完成了一个任务' + key);
                        db.Missions.update({
                            status: 2
                        },{
                            where: {
                                key: key
                            }
                        })
                    }
                });
    
                queue.allArray(missions, convert, {'event_succ': console.log}).then(function(key){
                    queueup();
                });

                queue.start();
            });
        })
    });
}



function subValue() {

    utils.client.get('upNum', function(err, value){
        value = parseInt(value) - 1;
        value = value < 0 ? 0 : value;
        utils.redis.set('upNum', value);
    });
}

function convert(obj){
    var q = queuefun.Q;
    var deferred = q.defer();
    var key = obj.key;

    console.log(JSON.stringify(obj))

    var fileurl = path.join(__dirname, '../../public/pano/' + key + '.jpg');
    var pathurl = path.join(__dirname, '../../public/pano/pano2T/' + key + '/');
 
    // var cmd = '/home/qson/suteng/linux_2cam_server/release/StiPano2camCloud ' + pathurl + ' ' + pathurl + ' /home/qson/suteng/linux_2cam_server/data/commonPath pano.jpg';
    var cmd = '/home/qson/suteng/linux_2cam_server/appCloud/build2/StiPano2camCloud ' + pathurl + ' ' + pathurl + ' /home/qson/suteng/linux_2cam_server/data/commonPath pano.jpg';

    console.log('开始拼接');

    exec(cmd, function(err, stdout,stderr){
        if(err){
            //如果拼接不成功，任务量也减一
            subValue();
            db.Missions.update({
                status: 3
            },{
                where: {
                    key: key
                }
            })
            deferred.reject(new Error(stderr));
            return;
        };
        //  ............
        subValue();
        // try{
        //     fs.renameSync(pathurl + 'pano.jpg', fileurl);
        // }catch(err){
        //     subValue();
        //     return;
        // }
        
        // cutcmd(obj, deferred);

        // Cut off the cut
        uploadimg_12(key, deferred)
    });
}

// uploadimg_12
function uploadimg_12(cbkey, deferred){
    //要上传的空间
    var bucket = 'suteng';
    //上传到七牛后保存的文件名
    var key = 'pano/' + cbkey + '.jpg';
    var token = uptoken(bucket, key);

    //要上传文件的本地路径
    var filePath = path.join(__dirname, '../../public/pano/pano2T/' + cbkey + '/pano.jpg');

    uploadFile(token, key, filePath, function(err){
        db.Scenes.update({
            type: 18 // new mode
        }, {
            where: {
                key: cbkey
            }
        }).then(function(up){
            // emptyDir(path.join(__dirname, '../../public/pano/pano2T/' + cbkey));
            // rmEmptyDir(path.join(__dirname, '../../public/pano/pano2T/' + cbkey));
        });
    });
    return deferred.promise;
}


function cutcmd(obj, deferred){
    console.log('111111cutcmdcutcmdcutcmdcutcmdcutcmdcutcmdcutcmdcutcmdcutcmdv')
    var key = obj.key;
    var fileurl = path.join(__dirname, '../../public/pano/' + key + '.jpg');

    var cmd = "/home/qson/krpano19/krpanotools makepano -config=/home/qson/krpano19/templates/qson.config " + fileurl;


    console.log('11111------------------------------------------', fileurl)
    console.log('22222------------------------------------------', JSON.stringify(obj))

    exec(cmd, function(err, stdout, stderr){
        //无论裁切成不成功，任务量减一
        utils.client.get('upNum', function(err, value){
            value = parseInt(value) - 1;
            value = value < 0 ? 0 : value;
            utils.redis.set('upNum', value);
        });

        if(err){
            return;
        };

        var mulindex = stdout.indexOf('multires: tilesize='),
            makindex = stdout.indexOf('making images');

        var m = stdout.substring(mulindex+1, makindex).split(' ');
        var m1 = m[4].split('x')[0];
        var m2 = m[5].split('x')[0];

        m1 = m1?parseInt(m1):1600;
        m2 = m2?parseInt(m2):768;

        var m3 = m1 + '|' + m2;

        if(err){
            // console.log('发生了错误'+err);
            fs.unlinkSync(fileurl);
            deferred.reject(new Error(stderr));
     

            console.log('eeeeeeeeeeeeeeeeeeeeeeee')
            return;
        }

        var dirurl = path.join(__dirname, '../../public/pano/' + key + '.tiles');

        if(stdout.indexOf('done.')==-1){
            deferred.reject(new Error('转换失败'));
            fs.unlinkSync(dirurl);
            return;
        }

        try{
            fs.renameSync(path.join(__dirname, '../../public/pano/pano2T/' + key + '/pano_s.jpg'), dirurl + '/pano_s.jpg');
            fs.renameSync(path.join(__dirname, '../../public/pano/pano2T/' + key + '/thumb.jpg'), dirurl + '/thumb.jpg');
        }catch(err){
            console.log('fsffdfdfddffffffffffffff')
            return;
        }

        console.log('------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------裁切成功');

        //裁切成功，更新type
        db.Scenes.update({
            type: 5,//状态5为保存在主服务器的1比120的全景套图
            width: m3
        },{
            where: {
                key: key
            }
        }).then(function(up){

            console.log('裁切成功，更新type');

            if(!up){
                deferred.reject(new Error('更新数据库失败'));
            }else{
                deferred.resolve(key);
                uploadarr(key, 0);
            }
        });
    });
    return deferred.promise;
}




//文件上传到七牛后删除主服务的图片文件夹
//清空文件夹
var emptyDir = function(fileUrl){
    var files = fs.readdirSync(fileUrl);//读取该文件夹
    files.forEach(function(file){
        var stats = fs.statSync(fileUrl + '/' + file);
        if(stats.isDirectory()){
            emptyDir(fileUrl + '/' + file);
        }else{
            fs.unlinkSync(fileUrl+'/'+file);
            console.log("删除文件" + fileUrl + '/' + file + "成功");
        }
    });
}
var rmEmptyDir = function(fileUrl){
    var files = fs.readdirSync(fileUrl);
    if(files.length > 0){
        var tempFile = 0;
        files.forEach(function(fileName)
        {
            tempFile++;
            rmEmptyDir(fileUrl+'/'+fileName);
        });
        if(tempFile == files.length){//删除母文件夹下的所有字空文件夹后，将母文件夹也删除
            fs.rmdirSync(fileUrl);
            console.log('删除空文件夹' + fileUrl + '成功');
        }
    }else{
        fs.rmdirSync(fileUrl);
        console.log('删除空文件夹' + fileUrl + '成功');
    }
}


//构造递归函数
function uploadarr(cbkey, i){
    var files = getuploadarr(cbkey);

    if(files[i]){
        // 要上传的空间
        var bucket = 'suteng';
        // 上传到七牛后保存的文件名
        var key = 'pano/' + files[i];
        var token = uptoken(bucket, key);

        // 要上传文件的本地路径
        var filePath = path.join(__dirname, '../../public/pano/' + files[i]);

        uploadFile(token, key, filePath, function(err){

            fs.unlinkSync(filePath);

            uploadarr(cbkey, ++i);
        });
    }else{
        // 删除文件夹
        // emptyDir(path.join(__dirname, '../../public/pano/' + cbkey + '.tiles'));
        // rmEmptyDir(path.join(__dirname, '../../public/pano/' + cbkey + '.tiles'));
        db.Scenes.update({
            type: 6
        }, {
            where: {
                key: cbkey
            }
        }).then(function(up){
            db.Scenes.findOne({
                where: {
                    key: cbkey
                }
            }).then(function(Scene){

                console.log('------------abc4');
                if(!Scene)return;

                db.Users.findOne({
                    where: {
                        id: Scene.user_id
                    }
                }).then(function(u){

                    console.log('------------------abc3');
                    if(!u)return;

                    if(u.listapi && u.callbackapi){
                        db.Groups.findOne({
                            where: {
                                id: Scene.group_id
                            }
                        }).then(function(g){
                            console.log('---------abc2');
                            if(!g)return;
                            var scenes_id = JSON.parse(g.scenes_id);
                            if(scenes_id.length == 1){
                                console.log('------------------abc1');
                                request.post({url: u.callbackapi,form:{
                                    key: g.housekey,
                                    scenekey: cbkey}
                                },function (error, response, body) {
                                    if(!error && response.statusCode == 200){
                                        console.log(body);
                                    }
                                }) 
                            }
                        })
                    }
                })
            })
        });
    }
}

function uploadimg(){

    db.Scenes.findAll({
        where: {
            type: 5
        }
    })
}

//构造上传函数
function uploadFile(uptoken, key, localFile, callback) {
    var extra = new qiniu.io.PutExtra();
    qiniu.io.putFile(uptoken, key, localFile, extra, function(err, ret) {
        callback();
    });
}

//构造上传函数
function uptoken(bucket, key) {
    var putPolicy = new qiniu.rs.PutPolicy(bucket + ":" + key);
    putPolicy.callbackUrl = 'http://120.76.27.228/tokenitem/nodeupcb';
    putPolicy.callbackBody = 'filename=$(fname)&filesize=$(fsize)';
    return putPolicy.token();
}


router.post('/nodeupcb',function(req,res){
    res.json({code: 0, msg: 'OK'});
});


router.get('/runqueue', function(req, res){

    db.Missions.update({
        status: 0
    },{
        where: {
            status: 1
        }
    }).then(function(up){
        queueup();
        res.json({msg:'queue running'});
    });
});


router.post('/avatar', function ( req, res ) {

    utils.autologin(req, res, function(userid){

        var key = utils.hex_sha1((new Date()).valueOf() + ('' + userid)).substr(0,10);
        var imgurl='avatar/' + key + '.jpg';

        var putPolicy = new qiniu.rs.PutPolicy('suteng:' + imgurl,'120.76.27.228/tokenitem/avatar/callback','name=$(fname)&hash=$(etag)'+'&userid='+userid+'&key='+key);
        var uptoken = putPolicy.token();

        res.json({code:0,token:uptoken,url:imgurl,key:key});
    });
});


router.post('/avatar/callback',function(req,res){

    var userid = req.body.userid;
    var key = req.body.key;

    db.Users.update({
        avatar: key
    },{
        where: {
            id: userid
        }
    }).then(function(up){

        if(!up)
            res.json({code:-1,msg:'更新数据库失败'});
        else
            res.json({code:0,msg:'OK'});
    });
});


router.get('/queueup', function(req, res){

    utils.client.get('upNum', function(err, value){
            queueup();
        if(req.query.change==0&&value!=0){
            utils.redis.set('upNum', 0);
            res.send('设置成功');
        }else{
            res.send(value);
        }
    });
});

router.get('/fsrename', function(req, res){

    var fileurl = path.join(__dirname, '../../public/pano/3a83551106.jpg');
    var pathurl = path.join(__dirname, '../../public/pano/pano2T/3a83551106/');
    fs.rename(pathurl+'pano.jpg', fileurl, function(result){
        console.log(result);
        res.json(result);
    });
})


router.get('/testload', function(req, res){
    utils.autologin(req, res, function(sessionuser){
        db.Scenes.findAll({
            where: {
                user_id: '579',
                show: {
                    gt: 0
                }
            }
        }).then(function(scene){
            res.json(scene);
        })
    })
})


// start upload
router.get('/start_upload', function(req, res){
    // queueup();
    startUpload2();
    res.json({code: 0, msg: 'ok'});
})


// scene type
router.get('/getType/:key', function(req, res){
    var key = req.params.key;
    db.Scenes.findOne({
        where: {
            key: key
        }
    }).then(function(scene){
        if(!scene){
            res.json({code: -1, msg: 'No scene', type: ''});
            return;
        }
        res.json({code: -1, msg: 'ok', type: scene.type});
    })
})

// get Mission count
router.get('/misson/count', function(req, res){
    db.Missions.findAndCountAll({
        where: {
            status: 0
        }
    }).then(function(result){
        var count = result.count;
        res.json({code: 0, msg: 'ok', count: count});
    })
})

module.exports= router;
