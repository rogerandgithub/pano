var express = require('express');
var router = express.Router();
var config= require('../config');
var db= require('../model');
var utils= require('../utils');

router.get('/', function(req, res) {

	utils.login(req, res, function(userid){

		db.Users.findOne({
			where:{
				id: userid
			}
		}).then(function(user){
            db.Groups.findAll({
                where: {
                    user_id: userid,
                    show: {
                        $gte: 10
                    },
                    scenes_id:{
                        ne:"[]"
                    }
                }
            }).then(function(groups){

                var r = {};
                r.user = user;
                r.sceneCount = groups.length;
                r.is_default_psw = user.password == 'c9864ec14551d5f6a7ad1f5ac12b4fb89f4a4b80';
                r.is_default_delpsw = user.deletepsw == '158a832ce0bbdc238181c6d16125b485a518cdb8';
                r.permission_hidetitle = user.permission_hidetitle;
                r.permission_api = user.permission_api;
                utils.getexpire(userid).then(function(expire){

                    utils.getuserinfo(userid).then(function(user){

                        var groupid = req.query.id?req.query.id:false;
                        r.expire = expire;

                        if(groupid){
                            db.Groups.findOne({
                                where:{
                                    id: groupid
                                }
                            }).then(function(group){
                                if(!group){
                                    groupid = false;
                                }
                                r.platform = utils.getPlatform(req);
                                r.group = groupid?group:null;
                                r.userid = userid;
                                r.locked = Date.parse(expire)<Date.now()&&groups.length>=200;
                                
                                res.render('newitem/user', result);
                            });
                        }else{
                            r.platform = utils.getPlatform(req);
                            r.group = null;
                            r.userid = userid;
                            r.locked = Date.parse(expire)<Date.now()&&groups.length>=200;
                            
                            res.render('newitem/user', r);
                        }
                    });
                });
            });
		});
	})
});

router.post('/addchildaccount',function(req,res){

    var father = req.session.user;
    var username = req.body.login_account;
    var password = req.body.login_password;

    if(!father){
        res.json({code:-98,msg:'登录已失效'});
        return;
    }
    if(!username||!password){
        res.json({code:-2,msg:'新用户资料不能为空'});
        return;
    }

    db.Users.findOne({
        where:{
            name:username
        }
    }).then(function(user){

        if(user){
            res.json({msg:"该用户名已经存在",code:-1});
            return;
        }

        db.Users.findOne({
            where:{
                id:father
            }
        }).then(function(f){
            var children=JSON.parse(f.children);
            db.Users.create({
                name:username,
                password:utils.hex_sha1(password + 'letian'),
                level:1,
                father:f.id,
                company:f.company,
                permission_logo:f.permission_logo,
                permission_prefix:f.permission_prefix,
                permission_hidetitle:f.permission_hidetitle,
                permission_trademark:f.permission_trademark,
                logo:f.logo,
                itcmstertel:'inherit',
                expiredate:new Date(0),
                nickname:username,
                trademark:f.trademark,
                prefix:f.prefix
            }).then(function(u){
                children.push(u.id);
                db.Users.update({
                    children:JSON.stringify(children)
                },{
                    where:{
                        id:f.id
                    }
                }).then(function(us){
                    res.json({msg:'ok',code:0,child:u});
                });
            })
        })
    })
});


router.get('/detail', function(req, res){

    utils.login(req, res, function(userid){

        utils.getexpire(userid).then(function(expire){

            utils.getuserdetail(userid).then(function(user){

                var r = {code:0,user:user};
                r.user.expire = expire;
                res.json(r);

            });
        });
    });
});

router.get('/info', function(req, res){

    utils.login(req, res, function(userid){

        utils.getexpire(userid).then(function(expire){

            utils.getuserinfo(userid).then(function(user){

                var r = {code:0,user:user};
                r.user.expire = expire;

                db.MultiPro.findAll({
                    where: {
                       user_id:  userid,
                       show: 1
                    }
                }).then(function(mul){
                    if(!mul){
                        mul = [];
                    }else{
                        r.user.dataValues.multipro = mul;
                    }
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
                                r.cgs = cgs;
                                res.json(r);
                            });
                        }else{
                            r.cgs = cgroups;
                            res.json(r);
                        }
                    })
                })
            });
        });
    });
});

router.get('/logs', function(req, res){

	utils.login(req, res, function(userid){


		utils.getChildrenUsers(userid).then(function(users){
			
			db.Action_log.findAll({
				where: {
					user_id: userid
				},
				order: 'id ASC'
			}).then(function(logs){
                if(!logs)logs=[];
				res.json(logs);
			});
		});
	});
});

module.exports= router;
