var express = require('express');
var router = express.Router();
var db= require('./model');
var xss= require('xss');
var utils= require('./utils');
var qr = require('qr-image');
var https = require('https');
var qs = require('querystring');

var config= require('./config');
var nodegrass = require('nodegrass');
var request = require('request');
var when = require('when');


router.get('/edit',function(req,res){

    var result={
        code:0,
        msg:'ok',
        page:'scene',
        track:req.query.track?req.query.track:0,
        hasLogin:req.session.user?true:false,
        platform:req.query.platform?req.query.platform:utils.getPlatform(req),
        sharead: 'ipano全景相机，房源拍照新趋势',
        logo: 'http://qncdn.sz-sti.com/logo-2.png',
        prefix: '',
        platform: utils.getPlatform(req),
        mode: req.query.type=='edit'?'editor':'viewer',
        preview: req.query.preview?req.query.preview:0
    };

    ///兼容
    req.query.group_key=req.query.groupkey?req.query.groupkey:req.query.group_key;
    req.query.scene_key=req.query.key?req.query.key:req.query.scene_key;

    var group,scene;

    db.Scenes.findOne({
        where:{
            key:req.query.scene_key
        }
    }).then(function(s){

        scene = s;

        var map;

        if(!req.query.group_key){
            if(!s){
                res.json({code:-2,msg:'该链接无效或已被删除'});
                return;
            }
            map = {
                id: scene.group_id,
                show: {
                    $gte: result.preview == 4?0:10
                }
            };
        }else{
            map = {
                key:req.query.group_key
            }
        }

        console.log(map);


        db.Groups.findOne({
            where: map
        }).then(function(g){

            group=g;

            db.Scenes.findAll({
                where:{
                    id:{
                        in:JSON.parse(group.scenes_id)
                    },
                    show:{
                        gte:0
                    }
                }
            }).then(function(scenes){

                if(scenes.length == 0){
                    res.json({code:-3,msg:'该链接无效或已被删除'});
                    return;
                }

                scene=scenes[0];
                result.type = scene.type;

                if(!scene||!group){
                    res.json({code:-1,msg:'场景不存在或已删除'});
                    return false;
                }
                if(!g)return false;

                scenes_id=JSON.parse(group.scenes_id);
                links_id=JSON.parse(group.links_id);

                var found=false;
                for(var i in links_id){
                    if(i==scene.id){
                        links_id=links_id[i];
                        found=true;
                        break;
                    }
                };
                if(!found){
                    links_id=[];
                }

                //增加访问量
                db.Scenes.update({
                    visited:scene.visited+1
                },{
                    where:{
                        key:req.query.scene_key
                    }
                }).then(function(up){

                    if(up===false){
                        return false;
                    }

                    result.scene_id=scene.id;
                    result.visited=scene.visited+1;
                    result.ry=scene.ry;

                    return db.Users.findOne({
                        where:{
                            id: scene.user_id
                        }
                    });

                }).then(function(user){

                    if(!user)return false;

                    result.user_info = user;
                    result.user_info.password = undefined;

                    db.Users.findOne({
                        where: {
                            id: user.father
                        }
                    }).then(function(father){
                        
                        if(father){
                            result.user_info.permission_support = father.permission_support;
                        }

                        if(!user)return false;

                        result.sceneKey = scene.key;
                        result.groupKey = group.key;
                        result.group_info = group;
                        result.extra = group.extra;

                        utils.getexpire(user.id).then(function(expire){

                            var isexpire = Date.parse(expire)>Date.now();
                            
                            if(isexpire){
                                result.sharead=user.itccontacts?user.itccontacts:father&&father.itccontacts?father.itccontacts:result.sharead;
                                result.prefix = scene.prefix?scene.prefix:user.prefix?user.prefix:result.prefix;
                                result.logo=user.logo?user.logo:result.logo;
                            }
                            result.address = group.city + group.region + group.community;
                            result.title = result.prefix+' '+group.city+' '+group.region+' '+group.community;

                            result.cover = req.query.cover=='true'?req.query.cover:'false';

                            if(result.mode!=='editor'){

                                if(req.query.type=='json'){
                                    res.json(result);
                                }else{
                                    if(isexpire){
                                        //判断用户的朋友圈小图标是哪种类型
                                        var key = scene.key;
                                        var sharetype = JSON.parse(user.sharekey)[0];   //类型 0 1 2
                                        switch(sharetype){
                                            case 0:  //未过期默认跟随场景
                                                var croppramas;
                                                if(group.width!=0){
                                                    group.width == 5000?croppramas = '2500x2500a1250a0':croppramas = '1248x1248a0a0';
                                                };
                                                result.shareiconKey = 'http://qncdn.sz-sti.com/images/scenes/'+key.split("_")[0]+'/allinone.jpg?imageMogr2/crop/!'+croppramas+'/thumbnail/!10p';
                                            break;
                                            case 1:
                                                result.shareiconKey = 'http://qncdn.sz-sti.com/images/shareicon/'+JSON.parse(user.sharekey)[1];
                                            break;
                                            case 2:
                                                result.shareiconKey = 'http://qncdn.sz-sti.com/images/tools/sharing_img.png';
                                            break;
                                        }
                                    }else{
                                        //过期用户强制默认相机图片
                                        result.shareiconKey = 'http://qncdn.sz-sti.com/images/tools/sharing_img.png';
                                    }
                                    if(group.width!=0||scene.type>=5||scene.type==-1){
                                        result.infowidth = group.width;
                                        res.render('panorama_ie',result);
                                    }else{
                                        nodegrass.get('http://qncdn.sz-sti.com/images/scenes/'+req.query.scene_key.split('_')[0]+'/allinone.jpg?imageInfo',function(data,status,headers){

                                            var data = JSON.parse(data);
                                            result.infowidth = data.width;

                                            db.Groups.update({
                                                width: data.width
                                            }, {
                                                where:{
                                                    id: result.group_info.id
                                                }
                                            });
                                            res.render('panorama_ie',result);
                                        });
                                    }
                                }
                            }else{
                                result.token=req.query.token?req.query.token:'';
                                result.sceneKey = req.query.scene_key;

                                utils.autologin(req, res, function(sessionuser){

                                    utils.getChildrenUsers(sessionuser).then(function(users){
                                        var flag=false;
                                        for(var i in users){
                                            if(users[i]==scene.user_id){
                                                flag=true;
                                            }
                                        }
                                        if(!flag){
                                            if (result.platform.indexOf('pc')!=-1) { 
                                                res.redirect('/login');
                                            }else{
                                                res.json({code:-41,msg:'hehe'});
                                            }
                                            return;
                                        }

                                        result.type = scenes[0].type;

                                        result.romaing = scenes;

                                        var main_scene = [];
                                        for(var i in result.romaing){
                                            if (result.romaing[i].key == req.query.key) {
                                                result.mainscene = main_scene = result.romaing.splice(i,1);
                                                result.romaing.unshift(main_scene[0]);
                                            };
                                        }
                                        
                                        result.mainscene = result.romaing[0];

                                        result.simple = req.query.simple;

                                        if(req.query.type=='json'){
                                            res.json(result);
                                        }else{

                                            if(result.group_info.width!=0||scene.type>=5||scene.type==-1){

                                                result.infowidth = result.group_info.width;

                                                if (result.platform.indexOf('pc')==-1) {
                                                    res.render("panorama",result);
                                                }else{
                                                    res.render('panorama_kr',result);
                                                }
                                            }else{
                                                nodegrass.get('http://qncdn.sz-sti.com/images/scenes/'+req.query.scene_key+'/allinone.jpg?imageInfo',function(data,status,headers){

                                                    var data = JSON.parse(data);
                                                    result.infowidth = data.width;

                                                    db.Groups.update({
                                                        width: data.width
                                                    }, {
                                                        where:{
                                                            id: result.group_info.id
                                                        }
                                                    });

                                                    if (result.platform.indexOf('pc')==-1) {
                                                        res.render("panorama",result);
                                                    }else{
                                                        res.render('panorama_kr',result);
                                                    }
                                                });
                                            }
                                        }
                                    });
                                });
                            }
                        });
                    });
                });
            });
        });
    });
});

router.get('/panoxml/:key',function(req,res){

    if(!req.params.key){
        res.redirect('/404');
        return;
    }

    db.Scenes.findOne({
        where:{
            key: req.params.key
        }
    }).then(function(s){

        if(!s){
            res.redirect('/404');
            return;
        }

        db.Groups.findOne({

            where:{
                id: s.group_id
            }

        }).then(function(group){

            if(!group){
                res.redirect('/404');
                return;
            }

            db.Users.findOne({
                where:{
                    id:s.user_id
                }
            }).then(function(owner){

                utils.getexpire(owner.id).then(function(expire){

                    var isexpire = Date.parse(expire)>Date.now();

                    db.Users.findOne({
                        where: {
                            id: owner.father
                        }
                    }).then(function(father){

                        //默认参数
                        var result = {
                            isexpire: isexpire,
                            telephone: '',
                            prefix: '',
                            bgmusic: 'http://qncdn.sz-sti.com/images/tools/785.mp3',
                            logo: 'http://qncdn.sz-sti.com/logo-2.png',
                            trademark: 'http://qncdn.sz-sti.com/logo_ie.png',
                            bottrademark: 'http://qncdn.sz-sti.com/images/tools/botimg.png',
                            company: 'RoboPano',
                            itcwebsite: 'www.robopano.com',
                            introduction: '',
                            maps: [],
                            type: s.type,
                            autoplay: group.autoplay,
                            preview: parseInt(req.query.preview),
                            rotate: req.query.rotate=='no'?'no':owner.isrotate==1?'no':'yes',
                            platform: utils.getPlatform(req),
                            width: req.query.width>2000?1248:req.query.width?parseInt(req.query.width):1024
                        }

                        if(isexpire){
                            result.company = father&&father.company?father.company:owner.company;
                            result.itcwebsite = father&&father.company?father.itcwebsite:owner.itcwebsite;
                            result.introduction = group.introduction;
                        }

                        var m_links_id, lid2info=[];

                        var maps_id=JSON.parse(group.maps_id);

                        db.Maps.findOne({
                            where:{
                                id:maps_id[0]
                            }
                        }).then(function(m){

                            if(m){
                                m_links_id = JSON.parse(m.links_id);

                                db.Links.findAll({
                                    where:{
                                        id:{
                                            $in: m_links_id
                                        }
                                    }
                                }).then(function(l){
                                    links=l;
                                    var ids=[];
                                    for(var i in links){
                                        ids.push(links[i].scene_id);
                                        lid2info[links[i].id+'']=links[i];
                                    }
                                    m.links_id=JSON.parse(m.links_id);
                                    m.dataValues.links={};
                                    for(var j in m.links_id){
                                        m.dataValues.links[m.links_id[j]+'']=lid2info[m.links_id[j]+''];
                                    }
                                    m.dataValues.a=l;
                                    if(isexpire)result.maps=[m];
                                });
                            }

                            var map = {
                                where:{
                                    id:{
                                        in:JSON.parse(group.scenes_id)
                                    },
                                    show:{
                                        gte:0
                                    }
                                }
                            };

                            map.order = s.jzmode?['jzmode','name']:['order'];

                            db.Scenes.findAll(map).then(function(romaing){

                                var cover_id = JSON.parse(group.scenes_id);
                                    cover_id = cover_id[0];
                                var links_id=JSON.parse(group.links_id);

                                if(req.query.preview=='1'){
                                    for(var sj in romaing){
                                        if (romaing[sj].key==s.key) {
                                            var arr = romaing.splice(sj,1);
                                            romaing.unshift(arr[0]);
                                        };
                                    }
                                }

                                var jz_arr = [];
                                var jz_s_obj = {};
                                for(var jzi in romaing){
                                    if(jz_arr.indexOf(romaing[jzi].jzmode)==-1&&romaing[jzi].jzmode){
                                        jz_arr.push(romaing[jzi].jzmode);
                                    }
                                    if(!jz_s_obj[romaing[jzi].jzmode]){
                                        jz_s_obj[romaing[jzi].jzmode]=romaing[jzi].id;
                                    }else{
                                        jz_s_obj[romaing[jzi].jzmode]+='|'+romaing[jzi].id;
                                    }
                                }

                                var jz = {
                                    arr: jz_arr.sort(),
                                    s_obj: jz_s_obj,
                                    is_jz: jz_arr.length>0,
                                    len: jz_arr.length,
                                    s_len: romaing.length/jz_arr.length
                                };

                                result.jz = jz;//

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
                                    var links_id=JSON.parse(group.links_id);

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

                                    var commentId=JSON.parse(group.comments_id);
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
                                            if(comments_object[romaing[r].id]&&isexpire){
                                                romaing[r].comments=comments_object[romaing[r].id];
                                            }else{
                                                romaing[r].comments=[];
                                            }
                                        }

                                        db.Comments.findAll({
                                            where:{
                                                type: 1,
                                                reply_id:group.id
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
                                            if(isexpire){
                                                for(var sic in romaing){
                                                    romaing[sic].imgcomments = imgcommentObj[romaing[sic].id]?imgcommentObj[romaing[sic].id]:[];
                                                }
                                            }

                                            if(req.query.cover == "true"){
                                                for(var sj in romaing){
                                                    if (romaing[sj].id==cover_id) {
                                                        var arr = romaing.splice(sj,1);
                                                        romaing.unshift(arr[0]);
                                                    };
                                                }
                                            }
                                            
                                            result.romaing = romaing;

                                            owner.password = undefined;

                                            db.Groups.findAll({
                                                limit: 10,
                                                where:{
                                                    user_id: s.user_id,
                                                    recommend: 1,
                                                    show: {
                                                        $gt: 0
                                                    }
                                                }
                                            }).then(function(lists){

                                                if(!lists)lists=[];

                                                var _scenes_id = [];
                                                if(lists.length>0){
                                                    for(var i in lists){
                                                        _scenes_id.push(JSON.parse(lists[i].scenes_id)[0]);
                                                    }
                                                }
                                                
                                                db.Scenes.findAll({
                                                    where:{
                                                        id:{
                                                            $in: _scenes_id
                                                        }
                                                    }
                                                }).then(function(_scenes){
                                                    if(!_scenes){
                                                        res.json({ code:-86,msg:'no such scenes_id' });
                                                        return;
                                                    }
                                                    for(var i in _scenes){
                                                        for(var j in lists){
                                                            if(JSON.parse(lists[j].scenes_id)[0]==_scenes[i].id){
                                                                lists[j].dataValues.sceneKey = _scenes[i].key.split('_')[0];
                                                            }
                                                        }
                                                    }

                                                    result.lists = lists;
                                                    result.owner = owner;

                                                    var advertisement = s.advertisement?s.advertisement:owner.advertisement;
                                                        advertisement = advertisement?advertisement:"RoboPano";

                                                    advertisement = advertisement.replace(/"/g,'').replace(/<div>/g,'');
                                                    advertisement = advertisement.split('</div>');

                                                    var text1 = advertisement.length>0?advertisement[0]:'';
                                                    var text2 = advertisement.length>1?advertisement[1]:'';
                                                    var text3 = advertisement.length>2?advertisement[2]:'';

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

                                                    if(isexpire){
                                                        result.bgmusic = owner.bgmusic?owner.bgmusic:result.bgmusic;

                                                        result.logo = owner.logo?owner.logo:result.logo;

                                                        result.telephone = romaing[0].telephone?romaing[0].telephone:owner.itcregion?owner.itcregion:father&&father.itcregion?father.itcregion:'';

                                                        result.bottrademark = romaing[0].bottrademark ? romaing[0].bottrademark : owner.itccontactstel?owner.itccontactstel : result.bottrademark;

                                                        result.trademark = s.trademark?s.trademark:owner.trademark?owner.trademark:result.trademark;
                                                    }


                                                    // res.set("Access-Control-Allow-Origin", "*");
                                                    // res.set("Access-Control-Allow-Headers", "X-Requested-With");
                                                    // res.set("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
                                                    // res.set("X-Powered-By",' 3.2.1');
                                                    res.set({'Content-Type': 'text/xml'});
                                                    res.render('panoxml',result);
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
    })
});

router.get('/isexist', function(req, res){
    var key = req.query.key;
    if(!key){
        res.json({code:-1,msg:'Invalid Key'});
        return;
    }
    db.Groups.findOne({
        where: {
            key: key,
            show: {
                $gte: 0
            },
            scenes_id: {
                $ne: '[]'
            }
        }
    }).then(function(group){
        if(group){
            res.json({code:0,msg:'exist'});
            return;
        }
        db.Scenes.findOne({
            where: {
                key: key,
                show: {
                    $gte: 0
                }
            }
        }).then(function(scene){
            if(!scene){
                res.json({code:-2,msg:'No Such Scene'});
                return;
            }
            res.json({code:0,msg:'exist'});
        });
    });
});

router.post('/set_view',function(req,res){


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


router.get('/panorama_webgl',function(req,res){
    var url = req.originalUrl.replace('/panorama_webgl', '');
    res.redirect(url);
});



router.get('/qrcode/:key', function (req, res) {
    var key = req.params.key;
    try {
        var img = qr.image('http://wx.sz-sti.com/scene?key='+key,{size:10,type:'png',margin:0});
        res.type('png');
        res.writeHead(200, {'Content-Type': 'image/png', "Access-Control-Allow-Origin": "*", "Access-Control-Allow-writeHead": "X-Requested-With", "Access-Control-Allow-Methods": "PUT,POST,GET,DELETE,OPTIONS", "X-Powered-By": ' 3.2.1'});
        img.pipe(res);
    } catch (e) {
        res.writeHead(414, {'Content-Type': 'text/html'});
        res.end('<h1>414 Request-URI Too Large</h1>');
    }
});



router.post('/like/:scene_key', function(req, res){
    var scene_key = req.params.scene_key;
    if(!scene_key){
        res.json({code:-1, msg:'scene\'s key is required!'});
        return
    }
    db.Scenes.findOne({
        where: {
            key: scene_key
        }
    }).then(function(scene){
        if(!scene){
            res.json({code:-2, msg:'no such scene'});
            return
        }

        
        db.Groups.findOne({
            where: {
                id: scene.group_id
            }
        }).then(function(group){
            if(!group){
                res.json({code:-3, msg:'no such group'});
                return
            }
            db.Groups.update({
                liked: ++group.liked
            }, {
                where: {
                    id: group.id
                }
            }).then(function(up){
                if(!up){
                    res.json({code:-4, msg:'db problem'});
                    return
                }
                res.json({code:0});
            });
        });
    });
});
router.get('/editor-panoxml', function(req, res) {
    if(!req.query.scene_key){
        res.json({code:-1,msg:'?'});
        return;
    }
    var result={};
    result.width=req.query.width?req.query.width:1024;
    result.imageHeight=req.query.imageHeight!=0?req.query.imageHeight:350;
    result.scene_key=req.query.scene_key;

    result.rx=req.query.rx?req.query.rx:0;
    result.ry=req.query.ry?req.query.ry:0;
    result.is_360=req.query.is_360;

    db.Scenes.findOne({//找到当前scene数据
        where:{
            key:req.query.scene_key,
            show:{
                gte:0
            }
        }
    }).then(function(s){
        if(!s){
            res.json({code:-2,msg:'?'});
            return;
        }
        result.scene=s;//输出当前scene

        var groupid = s.group_id;

        db.Groups.findOne({//根据当前scene找出所在组
            where:{
                id: groupid
            }
        }).then(function(g){
            if(!g){
                res.json({code:-3,msg:'?'});
                return;
            }
            result.group_info=g;//输出当前scene的群组信息

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
                            // for(var j in commentId){
                            //     if(commentId[j].indexOf(allcomments[i].id)!=-1){
                            //         if(comments_object[j]){
                            //             comments_object[j].push(allcomments[i]);
                            //         }else{
                            //             comments_object[j]=[allcomments[i]];
                            //         }
                            //     }
                            // }
                        }

                        for(var r in romaing){
                            if(comments_object[romaing[r].id]){
                                romaing[r].comments=comments_object[romaing[r].id];
                            }else{
                                romaing[r].comments=[];
                            }
                        }

                        for(var sj in romaing){
                            if (romaing[sj].key==req.query.scene_key) {
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

                                    result.owner=owner;

                                    result.permission_bgsnd=owner.permission_bgsnd;
                                    result.permission_introduction=owner.permission_introduction;

                                    
                                    result.permission_logo=owner.permission_logo;
                                    if(result.permission_logo==1){
                                        result.logo=owner.logo?owner.logo:result.logo;
                                    }

                                    var advertisement=s.advertisement?s.advertisement:"RoboPano";

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

                                    result.expire = expire;


                                    result.telephone = owner.telephone?owner.telephone:'';
                                    result.telephone = romaing[0].telephone?romaing[0].telephone:owner.telephone;


                                    result.title1=owner.permission_prefix&&owner.prefix?owner.prefix:'RoboPano';;//输出大标题
                                    result.title2=result.group_info.city+' '+result.group_info.region+' '+result.group_info.community+' '+s.name;//输出小标题
                                    result.title=result.title1+' '+result.group_info.city+' '+result.group_info.region+' '+result.group_info.community;

                                    
                                    var defaultTrademark='http://qncdn.sz-sti.com/logo_ie.png';
                                    result.trademark=owner.permission_trademark?(s.trademark
                                        ||owner.trademark
                                        ||defaultTrademark):defaultTrademark;
                                    result.platform=utils.getPlatform(req);

                                    if(result.platform.indexOf('app')!=-1&&req.query.simple=='1'){
                                        res.render('editor-panoxml2',result);
                                    }else{
                                        res.render('editor-panoxml',result);
                                    }
                                });
                            });
                        });
                    });
                });
            });
        });
    })
});

router.post('/delete_spot',function(req,res){

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


router.get('/lists/:userid',function(req, res){

    var userid = req.params.userid?parseInt(req.params.userid):0;

    db.Users.findOne({
        where: {
            id: userid
        }
    }).then(function(user){
        if(!user){
            res.json({code:-1,msg:'No such user'});
            return;
        }
        res.render('_lists',{user: user});
    });
});


router.get('/lists/scenes/:userid',function(req, res){
    
    var userid = req.params.userid?parseInt(req.params.userid):0;

    db.Groups.findAll({
        where:{
            user_id: userid,
            recommend: 1,
            show: {
                $gt: 0
            },
            scenes_id: {
                $ne: '[]'
            }
        }
    }).then(function(lists){
        if(!lists){
            res.json({code:-1,msg:'No such user'});
            return;
        };
        var scenes_id = [];
        for(var i in lists){
            console.log(lists[i].scenes_id);
            scenes_id.push(JSON.parse(lists[i].scenes_id)[0]);
        }
        db.Scenes.findAll({
            where:{
                id:{
                    $in: scenes_id
                },
                show: {
                    $gt: 0
                }
            }
        }).then(function(scenes){
            if(!scenes){
                res.json({code:-86,msg:'no such scenes_id'});
                return;
            }
            for(var i in scenes){
                for(var j in lists){
                    if(JSON.parse(lists[j].scenes_id)[0]==scenes[i].id){
                        lists[j].dataValues.sceneKey = scenes[i].key;
                        lists[j].dataValues.sceneType = scenes[i].type;
                        lists[j].dataValues.scenestyle = scenes[i].scenestyle;
                        lists[j].dataValues.thumbsrc = utils.getThumbSrc(lists[j].dataValues.sceneType,lists[j].dataValues.sceneKey,lists[j].dataValues.scenestyle);
                    }
                }
            }
            res.json({code:0,msg:'succeed',scenes:lists});
        })
    });
});

router.post('/add_spot',function(req,res){

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

router.post('/delete_comment',function(req,res){
    
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

router.post('/add_comment',function(req,res){
    
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






//新的全景link
router.get('/', function(req, res){

    var groupkey = req.query.groupkey?req.query.groupkey:req.query.groupkey;
    var scenekey = req.query.key?req.query.key:req.query.scenekey;
    var prokey = req.query.prokey;

    if(req.query.type == 'edit'&&req.query.token){
    	console.log('跳转了链接');
    	res.redirect('/scene/edit?type=edit&viewer=kr&key='+req.query.key+'&token='+req.query.token);
    	return;
    }

    //默认参数
    var result = {
        code:0,
        msg:'ok',
        page:'scene',
        track:req.query.track?req.query.track:0,
        hasLogin:req.session.user?true:false,
        platform:req.query.platform?req.query.platform:utils.getPlatform(req),
        sharead: 'ipano全景相机，房源拍照新趋势',
        logo: 'http://qncdn.sz-sti.com/logo-2.png',
        prefix: '',
        platform: utils.getPlatform(req),
        mode: req.query.type=='edit'?'editor':'viewer',
        preview: req.query.preview?req.query.preview:0,
        isMultipro: !!prokey,
        shareiconKey: 'http://qncdn.sz-sti.com/images/tools/sharing_img.png',
        simple: req.query.simple,
        liked: 0,
        visited: 0,
        prokey: prokey,
        scenekey: scenekey,
        telephone: '',
        cdndomain: config.getcdndomain(!!req.connection.encrypted),
        hideqr: req.query.qrcode == 'no'
    };

    if((!prokey&&!scenekey&&!groupkey)||(prokey&&scenekey)||(prokey&&groupkey)){
        res.send('It\' wrong');
        return;
    }

    init();

    function init(){

        //先判断是不是多项目页面
        if(!prokey){
            db.Scenes.findOne({
                where:{
                    key: scenekey
                }
            }).then(function(scene){

                if(!scene){
                    db.Groups.findOne({
                        where: {
                            key: groupkey,
                            show:{
                                gte:0
                            }
                        }
                    }).then(function(group){
                        if(!group){
                            res.send('该作品不存在或已经删除1');
                            return;
                        }
                        getGroupsData({
                            type: 2,
                            group: group
                        });
                    })
                }else{
                    getGroupsData({
                        type: 1,
                        scene: scene
                    });
                }
            });
        }else{
            db.MultiPro.findOne({
                where: {
                    key: prokey,
                    show: 1
                }
            }).then(function(multipro){
                if(!multipro){
                    res.send('该作品不存在或已经删除2');
                    return;
                }

                result.extra = multipro.extra;
                result.title = multipro.title;

                getGroupsData({
                    type: 3,
                    multipro: multipro
                });
            });
        }
    }

    //获取组信息
    function getGroupsData(source){

        var type = source.type;
        var groups_id;

        switch(type){
            case 3: 
                groups_id = JSON.parse(source.multipro.groups_id);
                break;
            case 2:
                groups_id = [source.group.id];
                break;
            case 1:

                groups_id = [source.scene.group_id];
                break;
            default:
                groups_id = [];
        }

        db.Groups.findAll({
            where: {
                id: {
                    $in: groups_id
                },
                show: {
                    $gt: 0
                },
                scenes_id:{
                    $ne: '[]'
                }
            }
        }).then(function(groups){

            if(!groups||groups.length == 0){
                res.send('该作品不存在或已经删除3');
                return;
            }

            getScenesData(groups);
        });
    }

    //获得全景信息
    function getScenesData(groups){

        //断掉指针，使得groups数据脱离的schema结构的依赖
        var groups = JSON.parse(JSON.stringify(groups));

        var scenes_id = [];

        for(var i in groups){
            groups[i].scenes_id = JSON.parse(groups[i].scenes_id);
            scenes_id = scenes_id.concat(groups[i].scenes_id);
            groups[i].scenes = [];
            result.liked += groups[i].liked;
        }

        db.Scenes.findAll({
            where: {
                id: {
                    $in: scenes_id
                },
                show: {
                    gte:0
                }
            }
        }).then(function(scenes){

            if(!scenes||scenes.length == 0){
                res.send('该作品不存在或已经删除4');
                return;
            }

            scenes = JSON.parse(JSON.stringify(scenes));

            for(var i in scenes){
                for(var j in groups){
                    if(groups[j].scenes_id.indexOf(scenes[i].id)!=-1){
                        groups[j].scenes.push(scenes[i]);
                    }
                }
            }


            if(!result.isMultipro){
                result.extra = groups[0].extra;
                result.scenekey = scenekey?scenekey:groups[0].scenes[0].key;
            }

            getUserInfo(groups);
        })
    }

    function getUserInfo(groups){

        var userid = groups[0].user_id;

        db.Users.findOne({
            where:{
                id: userid
            }
        }).then(function(user){
            if(user.father){
                var where_map = {
                    id: user.father
                }
            }else{
                var where_map = {
                    id: ''
                }
            }

            db.Users.findOne({
                where: where_map
            }).then(function(father){

                var expire = user.expiredate;

                if(Date.parse(expire)==0){

                    if(father){
                        expire = father.expiredate;
                    }
                }

                if(isNaN(Date.parse(expire))){
                    expire = '1970-01-01 00:00:00';
                }

                //正大房产的老账号特殊处理
                if(father&&father.id == 6153&&user.id < 6254){
                	expire = '2117-01-01 00:00:00';
                }

                var isexpire = Date.parse(expire) > Date.now();
                //默认参数第二部分
                result.isexpire = isexpire;
                result.user = user;


                result.address = groups[0].city + groups[0].region + groups[0].community;
                if(!result.isMultipro)result.title = result.user.prefix+' '+groups[0].city+' '+groups[0].region+' '+groups[0].community;
                result.cover = req.query.cover == 'true';
                result.sharetitle = !result.isMultipro && groups[0].title ? groups[0].title : result.title;

                if(isexpire){
                    result.sharead = user.itccontacts?user.itccontacts:father&&father.itccontacts?father.itccontacts:result.sharead;
                    result.prefix = groups[0].prefix?groups[0].prefix:user.prefix?user.prefix:result.prefix;
                    result.logo = user.logo?user.logo:result.logo;

                    result.telephone = groups[0].scenes[0].telephone?groups[0].scenes[0].telephone:result.user.itcregion?result.user.itcregion:father&&father.itcregion?father.itcregion:'';


                    //QJWL 定制功能
                    if(father&&father.id == '7825'){
                        result.user.permission_support = father.permission_support;
                        result.logo = father.logo?father.logo:user.logo;
                        result.title = "全景房源网推荐" + result.title;
                        result.sharetitle = "全景房源网推荐" + result.sharetitle;
                        // result.itcwebsite = father.itcwebsite;
                    }
                }
                if(father && father.id == '8577'){
                    result.user.permission_support = father.permission_support;
                    result.sharead = father.itccontacts ? father.itccontacts : result.sharead;
                    result.logo = father.log ? father.log : user.logo;
                    result.shareiconKey = father.shareiconKey ? father.shareiconKey : user.shareiconKey;
                }

                getListsData(groups)
            });
        });
    }


    function getListsData(groups){

        db.Groups.findAll({
            limit: 10,
            where:{
                user_id: groups[0].user_id,
                recommend: 1,
                show: {
                    $gt: 0
                },
                scenes_id: {
                    $ne: '[]'
                }
            }
        }).then(function(lists){


            if(!lists||lists.length == 0){
                result.lists = [];
                updateVisitedData(groups);
                return;
            }

            lists = JSON.parse(JSON.stringify(lists));

            var scenes_id = [];

            for(var i in lists){
                lists[i].scenes_id = JSON.parse(lists[i].scenes_id);
                scenes_id.push(lists[i].scenes_id[0]);
            }
            
            db.Scenes.findAll({
                attributes: ['id','key'],
                where:{
                    id:{
                        $in: scenes_id
                    }
                }
            }).then(function(scenes){

                if(!scenes||scenes.length == 0){
                    result.lists = [];
                    updateVisitedData(groups);
                    return;
                }

                for(var i in scenes){
                    for(var j in lists){
                        if(lists[j].scenes_id[0] == scenes[i].id){
                            lists[j].sceneKey = scenes[i].key.split('_')[0];
                            lists[j].sceneType = scenes[i].type;
                            lists[j].scenestyle = scenes[i].scenestyle;
                            lists[j].thumbsrc = utils.getThumbSrc(lists[j].sceneType,lists[j].sceneKey,lists[j].scenestyle);
                        }
                    }
                }

                result.lists = lists;
                updateVisitedData(groups);
            });
        });
    }

    function updateVisitedData(groups){

        var upgroupvisited = [];

        for(var i in groups){
            if(groups[i].visited == 0 && groups[i].scenes[0].visited != 0){
                var visited = 1;
                for(var j in groups[i].scenes){
                    visited += groups[i].scenes[j].visited;
                }
                upgroupvisited.push(db.Groups.update({
                    visited: visited
                },{
                    where: {
                        id: groups[i].id
                    }
                }))
            }
        }

        if(upgroupvisited.length > 0){
            when.all(upgroupvisited).then(function(up){
                getOtherData(groups);
            });
        }else{
            db.Groups.update({
                visited: groups[0].visited+1
            },{
                where: {
                    id: groups[0].id
                }
            }).then(function(up){
                getOtherData(groups);
            });
        }
    }

    function getOtherData(groups){

        //判断用户的朋友圈小图标是哪种类型
        console.log(result.user.sharekey);
        try{
            var sharetype = JSON.parse(result.user.sharekey)[0];
        }catch(e){
            var sharetype = [0];
        }
        //类型 0 1 2
        switch(sharetype){
            case 0:  //未过期默认跟随场景
                var croppramas;
                if(groups[0].width!=0){
                    groups[0].width == 5000?croppramas = '2500x2500a1250a0':croppramas = '1248x1248a0a0';
                };
                if(groups[0].scenes[0].type >= 5&&groups[0].scenes[0].type <= 7){
                    result.shareiconKey = 'http://120.76.27.228/pano/'+groups[0].scenes[0].key+'.tiles/thumb.jpg';
                }else if(groups[0].scenes[0].type == -1){
                    result.shareiconKey = 'http://120.76.27.228/pano/pano2T/'+groups[0].scenes[0].key+'/thumb.jpg';
                }else{
                    result.shareiconKey = 'http://qncdn.sz-sti.com/images/scenes/'+groups[0].scenes[0].key.split("_")[0]+'/allinone.jpg?imageMogr2/crop/!'+croppramas+'/thumbnail/!10p';
                }
            break;
            case 1:
                result.shareiconKey = 'http://qncdn.sz-sti.com/images/shareicon/'+JSON.parse(result.user.sharekey)[1];
            break;
            case 2:
                result.shareiconKey = 'http://qncdn.sz-sti.com/images/tools/sharing_img.png';
            break;
        }

        for(var i in groups){
            result.visited += groups[i].scenes[0]&&groups[i].scenes[0].visited?groups[i].scenes[0].visited:0;
        }

        result.groups = groups;

        //获取全景宽度
        if(groups[0].width!=0||groups[0].scenes[0].type>=5||groups[0].scenes[0].type==-1){

            result.width = groups[0].width;
            resresult();

        }else{
            request({
                url: 'http://qncdn.sz-sti.com/images/scenes/'+groups[0].scenes[0].key.split('_')[0]+'/allinone.jpg?imageInfo',
            }, function(error, response, body){

                result.width = JSON.parse(body).width;

                resresult();

                //更新group的width
                db.Groups.update({
                    width: result.width
                }, {
                    where:{
                        id: result.groups[0].id
                    }
                });

                console.log('发出了请求');
            });
        }
    }

    function resresult(){
        if(req.query.appid == 'qson-sqing')
            res.json(result);
        else
            res.render('newitem/scene',result);
    }
});


var Q = require('q');

router.get('/panoxml', function(req,res){

    //默认配置
    var result = {
        telephone: '',
        prefix: '',
        bgmusic: 'http://qncdn.sz-sti.com/images/tools/785.mp3',
        logo: 'http://qncdn.sz-sti.com/logo-2.png',
        trademark: 'http://qncdn.sz-sti.com/logo_ie.png',
        bottrademark: 'http://qncdn.sz-sti.com/images/tools/botimg1.png',
        company: 'RoboPano',
        itcwebsite: 'www.robopano.com',
        introduction: '',
        jz: {},
        preview: parseInt(req.query.preview),
        platform: utils.getPlatform(req),
        width: req.query.width>2000?1248:req.query.width?parseInt(req.query.width):1024,
        cdndomain: config.getcdndomain(!!req.connection.encrypted)
    }

    var prokey = req.query.prokey;
    var scenekey = req.query.key?req.query.key:req.query.scenekey;
    var groupkey = req.query.groupkey?req.query.groupkey:req.query.group_key;

    result.isMultipro = !!prokey;

    if((!prokey&&!scenekey)||(prokey&&scenekey)){
        res.send('It\' wrong');
        return;
    }

    init();

    function init(){
        //先判断是不是多项目页面
        if(!prokey){
            db.Scenes.findOne({
                where:{
                    key:scenekey
                }
            }).then(function(scene){

                if(scene){
                    getGroupsData({
                        type: 1,
                        scene: scene
                    });
                }else{
                    db.Groups.findone({
                        where: {
                            key: groupkey,
                            show:{
                                gte:0
                            }
                        }
                    }).then(function(group){
                        if(!group){
                            res.send('该作品不存在或已经删除1');
                            return;
                        }
                        getGroupsData({
                            type: 2,
                            group: group
                        });
                    })
                }
            });
        }else{
            db.MultiPro.findOne({
                where: {
                    key: prokey,
                    show: 1
                }
            }).then(function(multipro){
                if(!multipro){
                    res.send('该作品不存在或已经删除2');
                    return;
                }
                getGroupsData({
                    type: 3,
                    multipro: multipro
                });
            });
        }
    }

    //获取组信息
    function getGroupsData(source){

        var type = source.type;
        var groups_id;

        switch(type){
            case 3: 
                groups_id = JSON.parse(source.multipro.groups_id);
                break;
            case 2:
                groups_id = [source.group.id];
                break;
            case 1:
                groups_id = [source.scene.group_id];
                break;
            default:
                groups_id = [];
        }

        db.Groups.findAll({
            where: {
                id: {
                    $in: groups_id
                },
                show: {
                    $gt: 0
                }
            }
        }).then(function(groups){

            if(!groups||groups.length == 0){
                res.send('该作品不存在或已经删除3');
                return;
            }

            getScenesData(groups,source);
        });
    };

    //获得全景信息
    function getScenesData(groups,source){

        //断掉指针，是groups数据脱离的schema结构的依赖
        var groups = JSON.parse(JSON.stringify(groups));

        var scenes_id = [];

        for(var i in groups){
            groups[i].scenes_id = JSON.parse(groups[i].scenes_id);
            scenes_id = scenes_id.concat(groups[i].scenes_id);
            groups[i].scenes = [];
            // groups[i].name = groups[i].community + groups[i].building;
            groups[i].name = groups[i].community;
        }

        db.Scenes.findAll({
            where: {
                id: {
                    $in: scenes_id
                },
                show: {
                    gte:0
                }
            },
            order: source.type == 1&&source.scene.jzmode?['jzmode','name']:['order']
        }).then(function(scenes){

            if(!scenes||scenes.length == 0){
                res.send('该作品不存在或已经删除4');
                return;
            }

            scenes = JSON.parse(JSON.stringify(scenes));

            for(var i in scenes){
                scenes[i].links = [];
                scenes[i].comments = [];
                scenes[i].imgcomments = [];
                for(var j in groups){
                    if(groups[j].scenes_id.indexOf(scenes[i].id)!=-1){
                        groups[j].scenes.push(scenes[i]);
                    }
                }
                scenes[i].navthumb = utils.getNavThumbSrc(scenes[i].type,scenes[i].key,scenes[i].scenestyle);
            }

            getUserInfo(groups);
        })
    }

    function getUserInfo(groups){

        var userid = groups[0].user_id;

        db.Users.findOne({
            where:{
                id: userid
            }
        }).then(function(user){

            db.Users.findOne({
                where: {
                    id: user.father
                }
            }).then(function(father){

                var expire = user.expiredate;

                if(Date.parse(expire)==0){

                    if(father){
                        expire = father.expiredate;
                    }
                }
                if(isNaN(Date.parse(expire))){
                    expire = '1970-01-01 00:00:00';
                }

                
                //正大房产的老账号特殊处理
                if(father&&father.id == 6153&&user.id < 6254){
                	expire = '2117-01-01 00:00:00';
                }
                if(father&&father.id == '7825'){
                    result.itcwebsite = father.itcwebsite;
                }


                var isexpire = Date.parse(expire)>Date.now();
                //默认参数第二部分
                result.isexpire = isexpire;
                result.user = user;
                result.autoplay = groups[0].autoplay;
                result.rotate = req.query.rotate=='no'?'no':user.isrotate==1?'no':'yes';

                if(isexpire){
                    result.company = father&&father.company?father.company:user.company;
                    result.itcwebsite = father&&father.itcwebsite?father.itcwebsite:user.itcwebsite;
                    result.introduction = groups[0].introduction;
                    result.father = father?father:null;
                }

                
                // xiaochengzufang
                if(father && father.id == '8577'){
                    result.itcwebsite = father.itcwebsite ? father.itcwebsite : user.itcwebsite;
                    result.logo = father.logo ? father.logo : user.logo;
                    result.trademark = father.trademark ? father.trademark : user.trademark;
                    // result.bottrademark = father.bottrademark ? father.bottrademark : user.bottrademark;
                    result.bottrademark = father.itccontactstel ? father.itccontactstel : result.itccontactstel;
                    result.bgmusic = father.bgmusic ? father.bgmusic : user.bgmusic;
                    result.telephone = father.telephone ? father.telephone : user.telephone;
                    result.prefix = father.prefix ? father.prefix : user.prefix;
                }

                getMapData(groups);
            });
        });
    }

    function getMapData(groups){

        var maps_id = [];

        for(var i in groups){
            groups[i].maps_id = JSON.parse(groups[i].maps_id);
            maps_id = maps_id.concat(groups[i].maps_id);
            groups[i].maps = null;
        }

        if(maps_id.length==0){
            //如果没有户型图，直接下一步
            getLinksData(groups);
            return;
        }

        db.Maps.findAll({
            where: {
                id: {
                    $in: maps_id
                }
            }
        }).then(function(maps){

            if(!maps||maps.length==0){
                //如果没有户型图，直接下一步
                getLinksData(groups);
                return;
            }

            var m_links_id = [];
            for(var i in maps){
                maps[i].links_id = JSON.parse(maps[i].links_id);
                m_links_id = m_links_id.concat(maps[i].links_id);
            }

            //获取户型图上面的链接信息
            db.Links.findAll({
                where:{
                    id:{
                        $in: m_links_id
                    }
                }
            }).then(function(links){
                //再把maps数据分配到各个groups
                for(var i in groups){
                    for(var j in maps){
                        console.log('groups[i].maps_id[0]'+groups[i].maps_id[0]);
                        console.log(maps[j].id);
                        //如果map的id和groups里的maps_id的项相同，即该map为该groups
                        if(groups[i].maps_id[0] == maps[j].id){
                            groups[i].maps = maps[j];
                        }
                    }
                }

                if(!links||links.length == 0){
                    getLinksData(groups);
                    return;
                }

                //把links数据分配给各个map
                for(var i in maps){
                    for(var j in maps[i].links_id){
                        for(var k in links){
                            //如果id相同，即把id换成id对应的link
                            if(maps[i].links_id[j] == links[k].id){
                                maps[i].links_id[j] = links[k];
                            }
                        }
                    }
                }

                getLinksData(groups);
            });
        })
    }

    function getLinksData(groups){

        //获得全部跳转点数据
        var links_id = [];

        for(var i in groups){
            groups[i].links_id = JSON.parse(groups[i].links_id);
            for(var j in groups[i].links_id){
                links_id = links_id.concat(groups[i].links_id[j]);
            }
        }


        if(links_id.length == 0){
            getCommentData(groups);
            return;
        }

        db.Links.findAll({
            where: {
                id: {
                    $in: links_id
                }
            }
        }).then(function(links){

            if(!links||links.length == 0){
                getCommentData(groups);
                return;
            }

            //把跳转点数据分给scene
            for(var i in groups){
                for(var j in groups[i].links_id){
                    //如果这个link的id在这个groups的links_id对象的某个key的value数组里，则这个link属于id值等于这个key的scene的
                    for(var k in links){
                        if(groups[i].links_id[j].indexOf(links[k].id) != -1){
                            for(var e in groups[i].scenes){

                                if(groups[i].scenes[e].id == j){

                                    groups[i].scenes[e].links.push(links[k]);
                                }
                            }
                        }
                    }
                }
            }

            getCommentData(groups);
        });
    }

    function getCommentData(groups){

        //获得全部标记点数据
        var comments_id = [];

        for(var i in groups){
            groups[i].comments_id = JSON.parse(groups[i].comments_id);
            for(var j in groups[i].comments_id){
                comments_id = comments_id.concat(groups[i].comments_id[j]);
            }
        }

        if(comments_id.length == 0){
            getImgCommentData(groups);
            return;
        }

        db.Comments.findAll({
            where: {
                id: {
                    $in: comments_id
                }
            }
        }).then(function(comments){

            if(!comments||comments.length == 0){
                getImgCommentData(groups);
                return;
            }

            //把跳转点数据分给scene
            for(var i in groups){
                for(var j in groups[i].comments_id){
                    //如果这个link的id在这个groups的comments_id对象的某个key的value数组里，则这个link属于id值等于这个key的scene的
                    for(var k in comments){
                        if(groups[i].comments_id[j].indexOf(comments[k].id) != -1){
                            for(var e in groups[i].scenes){
                                if(groups[i].scenes[e].id == j){
                                    groups[i].scenes[e].comments.push(comments[k]);
                                }
                            }
                        }
                    }
                }
            }

            getImgCommentData(groups)
        });
    }

    function getImgCommentData(groups){


        //获得图片热点数据
        var reply_id = [];

        for(var i in groups){
            reply_id.push(groups[i].id);
        }
        console.log(reply_id);

        if(reply_id.length == 0){
            getJzData(groups);
            return;
        }

        db.Comments.findAll({
            where:{
                type: 1,
                reply_id: {
                    $in: reply_id
                }
            }
        }).then(function(imgcomments){

            if(!imgcomments||imgcomments.length == 0){
                getJzData(groups);
                return;
            }

            //如果不过期，把图片热点数据分配给各个scenes
            if(result.isexpire)
                for(var i in groups){
                    for(var j in groups[i].scenes){
                        for(var k in imgcomments){
                            if(groups[i].scenes[j].id == imgcomments[k].is_description)
                                groups[i].scenes[j].imgcomments.push(imgcomments[k]);
                        }
                    }
                }

            getJzData(groups);
        });
    }

    function getJzData(groups){

        //家居定制版数据
        var jz_arr = [];
        var jz_s_obj = {};
        var scenesLength = 0;

        for(var i in groups){
            scenesLength += groups[i].scenes.length;
            for(var j in groups[i].scenes){
                if(jz_arr.indexOf(groups[i].scenes[j].jzmode)==-1&&groups[i].scenes[j].jzmode){
                    jz_arr.push(groups[i].scenes[j].jzmode);
                }
                if(!jz_s_obj[groups[i].scenes[j].jzmode]){
                    jz_s_obj[groups[i].scenes[j].jzmode] = groups[i].scenes[j].id;
                }else{
                    jz_s_obj[groups[i].scenes[j].jzmode]+='|'+groups[i].scenes[j].id;
                }
            }
        }

        var mode = ['水电','泥工','木工吊顶','刮瓷油漆','主材安装','完工'];

        var jz_str_arr = JSON.parse(JSON.stringify(jz_arr.sort()));

        for(var i in jz_str_arr){
            jz_str_arr[i] = mode[i];
        }

        result.jz = {
            arr: jz_arr,
            str_arr: jz_str_arr,
            s_obj: jz_s_obj,
            is_jz: jz_arr.length>0,
            len: jz_arr.length,
            s_len: scenesLength/jz_arr.length
        };

        //重新分配jz场景的数据结构
        if(result.jz.is_jz){
            var jzgroups = [];
            for(var i in result.jz.str_arr){
                var jz_group = JSON.parse(JSON.stringify(groups[0]));
                jz_group.name = result.jz.str_arr[i];
                jz_group.jzmode = JSON.parse(result.jz.arr[i]);
                jzgroups.push(jz_group);
            }

            var runscenes = JSON.parse(JSON.stringify(jzgroups[0].scenes));
            for(var i in jzgroups){
                jzgroups[i].scenes = [];
                for(var j in runscenes){
                    if(runscenes[j].jzmode == jzgroups[i].jzmode)
                        jzgroups[i].scenes.push(runscenes[j]);
                }
            }

            result.isMultipro = true;
        }

        result.jz.is_jz?getOtherData(jzgroups):getOtherData(groups);
    }

    function getOtherData(groups){

        //有效期内账号特许
        if(result.isexpire){
            result.bgmusic = result.user.bgmusic?result.user.bgmusic:result.bgmusic;

            result.logo = result.user.logo?result.user.logo:result.logo;

            result.telephone = groups[0].scenes[0].telephone?groups[0].scenes[0].telephone:result.user.itcregion?result.user.itcregion:result.father&&result.father.itcregion?result.father.itcregion:'';

            result.bottrademark = groups[0].bottrademark?groups[0].bottrademark:result.user.itccontactstel?result.user.itccontactstel:result.bottrademark;

            result.trademark = groups[0].scenes[0].trademark?groups[0].scenes[0].trademark:result.user.trademark?result.user.trademark:result.trademark;
        }

        //其他兼容处理

        //1、预览模式的排序处理
        if(!!scenekey&&req.query.preview == '1'){
            for(var i in groups){
                for(var j in groups[i].scenes){
                    if(groups[i].scenes[j].key == scenekey)
                        groups[i].scenes.unshift(groups[i].scenes.splice(j,1)[0]);
                }
            }
        }

        //2、鼎尖的封面排序
        if(req.query.cover == "true"){
            for(var i in groups){
                for(var j in groups[i].scenes){
                    if(groups[i].scenes_id[0] == groups[i].scenes[j].id)
                        groups[i].scenes.unshift(groups[i].scenes.splice(j,1)[0]);
                }
            }
        }

        //珠海陈客的 定制功能
        if(result.father&&result.father.id == '7825'){
            result.user.permission_support = result.father.permission_support;
            result.logo = result.father.logo?result.father.logo:result.user.logo;
            result.itcwebsite = result.father.itcwebsite?result.father.itcwebsite:result.itcwebsite;
            result.trademark = result.father.trademark?result.father.trademark:result.trademark;
            result.bottrademark = result.father.bottrademark?result.father.bottrademark:result.bottrademark;
        }

        result.groups = groups;
        if(req.query.appid == 'qson-sqing'){
            res.json(result);
        }else{
            res.set({'Content-Type': 'text/xml'});
            res.render(result.user.id == 7949?'newitem/axml':'newitem/xml', result);
        }
    }
});





/----vilidate baidu-api-----/
router.get('/baiduapi/vilidatetoken', function(req, res){
    var param = qs.stringify({
        'grant_type': 'client_credentials',
        'client_id': 'e22RgYWcjWquQj09S9tj41gI',
        'client_secret': '2c8202b59b4d3b7074e73f70975dff85'
    });
    var client_id = 'e22RgYWcjWquQj09S9tj41gI';
    var client_secret = '2c8202b59b4d3b7074e73f70975dff85';
    // https.get({
    //     hostname: 'aip.baidubce.com',
    //     path: '/oauth/2.0/token?' + param,
    //     agent: false
    // }, function(data){
    //     console.log(data)
    //     res.json('data')
    // })

    request({
        url: 'https://openapi.baidu.com/oauth/2.0/token?grant_type=client_credentials&client_id=' + client_id + '&client_secret=' + client_secret,
    }, function(error, response, body){

        console.log(body);
        res.json(body)
    });
})






router.get('/:id',function(req,res){

    var id = req.params.id;
    var preview = req.query.preview?parseInt(req.query.preview):0;

    db.Groups.findOne({
        where: {
            id: id,
            show: {
                $gte: preview != 4?10:0
            }
        }
    }).then(function(group){

        if(!group){
            res.json({code:-1,msg:'No such groupid'});
            return;
        }
        var scenes_id = JSON.parse(group.scenes_id);

        db.Scenes.findAll({
            where: {
                id: {
                    $in: scenes_id
                },
                show: {
                    $gte: 0
                }
            }
        }).then(function(scenes){
            if(!scenes){
                res.json({code:-2,msg:'No such scene'});
                return;
            }
            var scenekey = scenes[0].key;
            res.redirect('http://'+req.headers.host+'/scene?key='+scenekey+(preview?('&preview='+preview):''));
        })
    })
});






module.exports = router;
