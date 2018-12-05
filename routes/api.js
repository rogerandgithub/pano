var express = require('express');
var router = express.Router();
var db= require('./model');
var utils= require('./utils');
var crypto = require('crypto');
var password = "muwenhu^_^";
var request = require('request');

function sha1(data) {
    return crypto.createHash("sha1").update(data).digest("hex");
}

router.get('/house', function(req, res){

    var houseinfo = {
        houses: [{
            key: '270726913f4fa85',
            signature: '',
            province: '广东',
            city: '深圳',
            region: '罗湖',
            business_circle: '太宁路街道',
            community: '泰安花园',
            building: 'B',
            room: '1102',
            createdAt: '2016-12-22',
            rooms_count: 2,
            halls_count: 1,
            bathrooms_count: 1,
            imgurl: 'http://wx.sz-sti.com/pano/382b5bfff2.tiles/mobile_f.jpg'
        },{
            key: 'e7e204ab45a18b5',
            signature: '',
            province: '广东',
            city: '深圳',
            region: '南山',
            business_circle: '桃源街道',
            community: '众冠花园',
            building: 'A',
            room: '302',
            createdAt: '2016-12-22',
            rooms_count: 3,
            halls_count: 2,
            bathrooms_count: 1,
            imgurl: 'http://wx.sz-sti.com/pano/5852cd7f7e.tiles/mobile_f.jpg'
        }]
    };

    res.json(houseinfo);
});

router.post('/callback',function(req, res){
    var key = req.body.key;
    var scenekey = req.body.scenekey;

    console.log('abc2a');console.log(key);console.log(scenekey);
    db.Scenes.findOne({
        where: {
            key: scenekey
        }
    }).then(function(scene){
        console.log('abc2a11');
        if(!scene){
            res.json({code:-22,msg:'failed'});
            return;
        }
        db.Groups.findOne({
            where: {
                id: scene.group_id
            }
        }).then(function(g){
            console.log('abc2a22');
            if(!g){
                res.json({code:-77,msg:'failed'});
                return;
            }
            db.Groups.update({
                housekey: 'abc:'+key
            },{
                where: {
                    id: g.id
                }
            }).then(function(up){
                console.log('abc2a33');
                if(!up){
                    res.json({code:-44,msg:'failed'});
                    return;
                }
                res.json({code:0,errmsg:'haha'});
            })
        })
    })
})

function checklistapi(obj){

    var houses = obj.houses;

    var keyflag = houses.length!=0;

    for(var j in houses){
        if(keyflag){
            var keyobj = [];
            for(var i in houses[j]){
                keyobj.push(i);
            }

            var keymast = ['key','signature','province','city','region','business_circle','community','building','room','createdAt','rooms_count','halls_count','bathrooms_count','imgurl'];

            for(var i in keymast){
                if(keyobj.indexOf(keymast[i])==-1&&keymast[i]!='signature')keyflag = false;
            }
            for(var i in keyobj){
                if(keymast.indexOf(keyobj[i])==-1)keyflag = false;
            }
        }
    }
    return keyflag;
}

router.post('/saveapi/listapi', function(req, res){

    utils.login(req, res, function(userid){

        var api = req.params.api;
        var url = req.body.url;

        var ipreg = /^(https|http)?:\/\/(\d+)\.(\d+)\.(\d+)\.(\d+)\/?([0-9a-z][0-9a-z-]{0,61})?$/;
        if(ipreg.test(url)||!/^(https|http)?:\/\//.test(url)){
            res.json({code:-1,msg:'域名或路径格式不正确，请参考注意事项'});
            return;
        };

        request.get({
            'url': url,
            'User-Agent': utils.getUA(req)
        }, function(error, response, body){
            if(error){
                res.status(302).json({code:-2,msg:'接口不可用'});
                return;
            }
            try{
                var data = JSON.parse(body);
            }catch(err){
                if(error){
                    res.status(302).json({code:-3,msg:'接口数据格式有误'});
                    return;
                }
            }

            if(!checklistapi(data)){
                res.status(302).json({code:-4,msg:'接口数据格式不符合规则'});
                return;
            }

            db.Users.update({
                listapi: url
            },{
                where: {
                    id: userid
                }
            }).then(function(up){
                up?res.json({code:0,msg:'OK'}):res.json({code:-5,msg:'updated failed'});
            });
        });
    });
});

router.post('/saveapi/callbackapi', function(req, res){

    utils.login(req, res, function(userid){

        var api = req.params.api;
        var url = req.body.url;

        var ipreg = /^(https|http)?:\/\/(\d+)\.(\d+)\.(\d+)\.(\d+)\/?([0-9a-z][0-9a-z-]{0,61})?$/;
        if(ipreg.test(url)||!/^(https|http)?:\/\//.test(url)){
            res.json({code:-1,msg:'域名或路径格式不正确，请参考注意事项'});
            return;
        };

        db.Users.update({
            callbackapi: url
        }, {
            where: {
                id: userid
            }
        }).then(function(up){
            if(!up){
                res.json({code:0,msg:'Ok'});
                return;
            }
            res.json({code:0,msg:'Ok'});
        })
    });
});


router.get('/getexpire', function(req, res){
    var nickname = req.query.nickname;
    if(!nickname){
        res.json({code:-97,msg:'I need the nickname'});
        return;
    }
    db.Users.findOne({
        where:{
            name: nickname
        }
    }).then(function(user){
        if(!user){
            res.json({code:-88,msg:'No such user'});
            return;
        }
        var expire = user.expiredate;
        //正大的鸡巴蛋子
        if(Date.parse(expire)==0||(user.id>6153&&user.id<6254||user.id==773)){
            db.Users.findOne({
                where:{
                    id:user.father
                }
            }).then(function(father){
                if(father){
                    expire = father.expiredate;
                }
                var todaytime = Date.parse((new Date(Date.now())).toLocaleDateString());
                var data = Date.parse(expire) - todaytime;
                    datas = parseInt(data/(24*60*60*1000));
                    if(datas<0)datas += 1;
                res.json({code:0,msg:'Get expire Successful',expire:new Date(expire).toLocaleDateString(),days:datas,time:parseInt(data/1000)});
            });
        }else{
            var expire = user.expiredate;
            var todaytime = Date.parse((new Date(Date.now())).toLocaleDateString());
            var data = Date.parse(expire) - todaytime;
                datas = Math.ceil(data/(24*60*60*1000));
                if(datas<0)datas += 1;
            res.json({code:0,msg:'Get expire Successful',expire:new Date(expire).toLocaleDateString(),days:datas,time:parseInt(data/1000)});
        }
    });
});

/* level100 */
router.get('/fatherauth', function(req, res){

    var appid = req.query.appid;
    var appsecret = req.query.appsecret;
    //验证appid和appsecret及其权限是不是100
    var queryPage = parseInt(req.query.page);
    var queryLimit = parseInt(req.query.limit);

    var is_page = !!(queryPage&&!isNaN(queryPage));
    queryPage = is_page?queryPage:1;
    is_page = 1;
    var is_limit = !!(queryLimit&&!isNaN(queryLimit));

    var page = queryPage>0?queryPage:1;
    var limit = is_limit?queryLimit:10;

    var disscenes = req.query.disscenes==1?1:0;

    if(!is_page&&is_limit)page = 1;
    if(is_page&&!is_limit)limit = 10;

    db.Apps.findOne({
        where:{
            appid: appid,
            appsecret: appsecret
        }
    }).then(function(app){

        if(!app){
            res.json({code:-1,msg:"Invalid Appid"});
            return;
        }
        if(app.level<100){
            res.json({code:-3,msg:"Invalid Authorize"});
            return;
        }

        var r={};
        var gkey2sid={};
        var children_id=req.query.children_id?req.query.children_id:'';

        if(children_id){
            children_id=children_id.split('|');
        }else{
            children_id=false;
        }
        
        console.log('-----22222222222-------------', children_id)
        console.log('------------------', app.user_id)
        utils.getChildrenUsers(app.user_id, children_id).then(function(users){
            console.log('------------------', users)
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
                }else if(order_map[req.query.order]){
                    order=order_map[req.query.order];
                }else if(i=='apartment_rooms'||
                         i=='area'||
                         i=='apartment_halls'||
                         i=='room'||
                         i=='building'||
                         i=='apartment_bathrooms'){
                    conditions[i]={
                        $eq:req.query[i]
                    };
                }else if(i=='face'||
                         i=='business_circle'||
                         i=='community'){
                    conditions[i]={
                        $like:'%'+req.query[i]+'%'
                    }
                }else if(i=='city'||i=='region'){
                    conditions[i]={
                        $like:'%'+(req.query[i]?req.query[i].replace('市', '').replace('区', ''):req.query[i])+'%'
                    };
                    console.log(conditions[i]);
                }
            }

            var sqlMap = {
                attributes:['id','city','business_circle','region','community','building','apartment_bathrooms','apartment_halls','apartment_rooms','room','face','floor','total_floor','key','area','createdAt','updatedAt','scenes_id'],
                where:conditions,
                order:order?order:'createdAt DESC'
            };

            if(is_page||is_limit){
                sqlMap.limit = limit;
                sqlMap.offset = (page-1)*limit;
            };

            db.Groups.findAndCountAll(sqlMap).then(function(result){

                r.count=result.count;

                if(is_page||is_limit)r.is_more = r.count>page*limit?true:false;

                r.platform=utils.getPlatform(req);

                result=result.rows;

                r.romaing=result;

                var ids=[];
                for(var i in result){
                    var temp=JSON.parse(result[i].scenes_id);
                    ids=ids.concat(temp);
                    gkey2sid[result[i].key]=temp[0];
                }


                db.Scenes.findAll({
                    where:{
                        id:{
                            in:ids
                        }
                    }
                }).then(function(data){
                    var id2key={};
                    var id2scene={};

                    for(var i in data){
                        id2key[data[i].id]=data[i].key;
                        if(disscenes == 0){
                            for(var j in r.romaing){
                                var sid=JSON.parse(r.romaing[j].scenes_id);
                                if(sid.indexOf(data[i].id)!=-1){
                                    if(r.romaing[j].dataValues.scenes){
                                        r.romaing[j].dataValues.scenes.push(data[i]);
                                    }else{
                                        r.romaing[j].dataValues.scenes=[data[i]];
                                    }
                                }
                            }
                        }
                    }

                        console.log(gkey2sid);
                    for(var i in r.romaing){
                        if(disscenes == 0)
                            r.romaing[i].scenes=id2scene[gkey2sid[r.romaing[i].id]];
                        r.romaing[i].dataValues.id=r.romaing[i].key;
                        r.romaing[i].key=id2key[gkey2sid[r.romaing[i].key]];
                        console.log(r.romaing[i].key)
                    }
                    res.json(r);
                });
            });
        });
    })
});


router.post('/delgroup/:id',function(req,res){
    
    var groupkey=req.params.id?req.params.id:'';
    var show;
    var deletepsw = utils.hex_sha1('muwenhu'+req.body.deletepsw);


    var appid = req.body.appid;
    var appsecret = req.body.appsecret;

    db.Apps.findOne({
        where:{
            appid: appid,
            appsecret: appsecret
        }
    }).then(function(app){

        if(!app){
            res.json({code:-1,msg:"Invalid Appid"});
            return;
        }
        if(app.level<100){
            res.json({code:-2,msg:"Invalid Authorize"});
            return;
        }

        utils.getChildrenUsers(app.user_id).then(function(users){

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
                    res.json({code:-3,msg:'No Such Group'});
                    return;
                }
                db.Users.findOne({
                    where:{
                        id:group.user_id
                    }
                }).then(function(permission){

                    if(permission.deletepsw!=deletepsw){
                        res.json({code:-4,msg:'Invalid Deletepassword'});
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
                            show: -99
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

router.post('/delscene/:id',function(req,res){

    var id = req.params.id;
    var deletepsw = utils.hex_sha1('muwenhu'+req.body.deletepsw);

    var appid = req.body.appid;
    var appsecret = req.body.appsecret;

    var map = isNaN(id)?{key:id}:{id:id};

    db.Apps.findOne({
        where:{
            appid: appid,
            appsecret: appsecret
        }
    }).then(function(app){

        if(!app){
            res.json({code:-1,msg:"Invalid Appid"});
            return;
        }
        if(app.level<100){
            res.json({code:-2,msg:"Invalid Authorize"});
            return;
        }

        utils.getChildrenUsers(app.user_id).then(function(users){

            var show;
            var scene_id;
            var scene_type;

            map.user_id = { $in: users };

            db.Scenes.findOne({
                where:map
            }).then(function(scene){

                if(!scene){
                    res.json({code:-4, msg:'No Such Scene'});
                    return;
                }

	            db.Users.findOne({
	                where:{
	                    id:scene.user_id
	                }
	            }).then(function(permission){

	                if(permission.deletepsw!=deletepsw){
	                    res.json({code:-3,msg:'Invalid Deletepassword',bodypaw:deletepsw,psw:permission.deletepsw,permission:permission });
	                    return;
	                }
                    show=scene.show;
                    scene_id=scene.id;
                    scene_type=scene.type;
                    var groupids=[scene.group_id];
                    //删除漫游相关链接
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

                        return require('when').all(querys);
                    }).then(function(result){
                        db.Scenes.update({
                            show: -1
                        },{
                            where:{
                                id: id
                            }
                        }).then(function(result){
                            res.json({code:0,msg:'ok'});
                        });
                    });
                });
            });
        });
    });
});

router.get('/authorize', function(req, res) {
    if(!req.session.user){
        res.json({code:-2,msg:'您还没登录'});
        return;
    }
	var query = {};
	var appid = 'wx17e4a435798f90e2';
	var redirect_uri = req.query.redirect_uri;

    // req.query.response_type = 'code';
    if(!req.session.user){
    	res.render('api_login', {redirect_uri:redirect_uri});
    }else{
		/* 生成code,code与appid和重定向uri一一对应 */
        var now = (new Date()).getTime()+'';
		var code = sha1(req.session.user + appid + query.redirect_uri + password + now);

        db.Binds.findOne({
            where:{
                user_id:req.session.user,
                app_id:appid
            }
        }).then(function(result){

            if(!result){
                db.Binds.create({
                    user_id:req.session.user,
                    app_id:appid,
                    code:code,
                    time:now,
                    redirect_uri:redirect_uri
                });
            }else{
                db.Binds.update({
                    code:code,
                    time:now,
                    redirect_uri:redirect_uri
                },{
                    where:{
                        user_id:req.session.user,
                        app_id:appid
                    }
                });
            }

            res.render('api_confirm', {
                    code:code,
                    redirect_uri:redirect_uri
                });
        });
    }
});

router.post('/authorize/api_login',function(req,res){
    if(!req.session.user){
        res.json({code:-2,msg:'您还没登录'});
        return;
    }
    var username=req.body.username;
    var password=req.body.password;
	var appid = 'wx17e4a435798f90e2';
	var redirect_uri = req.query.redirect_uri;
    db.Users.findOne({
        where:{
            name:username,
            password:password
        }
    }).then(function(result){
        if(result){
            req.session.user=result.id;
            res.json({msg:'ok',code:0});
        }else{
            res.json({msg:'密码错误或用户不存在',code:-1});
        }
    });
});

//生成令牌，和授权码
router.get('/oauth2/access_token', function(req,res){
    if(!req.session.user){
        res.json({code:-2,msg:'您还没登录'});
        return;
    }
    var code = req.query.code;
    var redirect_uri = req.query.redirect_uri;
    var appid = req.query.appid;
    var appsecret = req.query.appsecret;
    var scope = req.query.scope;

    // var user_id = req.session.user;

    var expires_in = 7200;
    //验证是否登录
    //验证code正确性
    //验证APPID和appsecret
    //生成令牌，令牌与code和userID一一对应
    var refresh_token = sha1( code + appid + req.session.user + password + redirect_uri);
    var openid = sha1( code + appid + req.session.user + password + redirect_uri);
    var access_token = sha1(refresh_token+password);

    // if(!utils.isNum(binddata.app_id)){
    //     res.json({code:-99,msg:'heheda1'});
    //     return;
    // }


    db.Binds.findOne({
        where:{
            app_id:appid,
            // user_id:user_id
            // ,
            code:code
        }
    }).then(function(bind){
        if (!bind) {
            res.json({code:-1,msg:"Invalid appid"});
            return;
        };

        db.Binds.update({
            access_token:refresh_token,
            openid:openid
        },{
            where:{
                user_id:req.session.user,
                app_id:appid
            }
        }).then(function(result){
            req.session[access_token] = refresh_token;
            res.json({
                expires_in:expires_in,
                refresh_token:refresh_token,
                openid:openid,
                access_token:access_token,
                scope:"base_scope"
            });
        });
    })
});

//更新授权码
router.get('/oauth2/refresh_token', function(req,res){
    if(!req.session.user){
        res.json({code:-2,msg:'您还没登录'});
        return;
    }
    var refresh_token = req.query.refresh_token;
    var openid = req.query.openid;

});

//生成令牌，和授权码
router.get('/sns/user_scenesinfo', function(req,res){
    if(!req.session.user){
        res.json({code:-2,msg:'您还没登录'});
        return;
    }
});



router.post('/setphone/:id', function(req, res){

    var telephone = req.body.telephone;
    var groupkey = req.params.id;

    if(!utils.isTelephone(telephone)){
        res.json({code:-1,msg:'Illegal telephone'});
        return;
    }
    if(!groupkey){
        res.json({code:-2,msg:'Invalid Id'});
        return;
    }

    var appid = req.body.appid;
    var appsecret = req.body.appsecret;

    db.Apps.findOne({
        where:{
            appid: appid,
            appsecret: appsecret
        }
    }).then(function(app){

        if(!app){
            res.json({code:-3,msg:"Invalid Appid"});
            return;
        }
        if(app.level<100){
            res.json({code:-4,msg:"Invalid Authorize"});
            return;
        }

        utils.getChildrenUsers(app.user_id).then(function(users){

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
                    res.json({code:-5,msg:'No Such Group'});
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
});

module.exports = router;