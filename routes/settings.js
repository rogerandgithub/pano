var express = require('express');
var router = express.Router();
var db= require('./model');
var xss= require('xss');
var utils= require('./utils');
var nodegrass = require('nodegrass');
var config= require('./config');


router.post('/global_phone',function(req,res){

    utils.autologin(req, res, function(sessionuser){

        var phone=req.body.phone?req.body.phone:'';
        db.Users.findOne({
            where:{
                id:sessionuser
            }
        }).then(function(u){
            utils.getChildrenUsers(sessionuser).then(function(users){
                db.Users.update({
                    itcregion:phone
                },{
                    where:{
                        id:{
                            in:users
                        }
                    }
                }).then(function(up){
                    res.json({code:0,msg:'ok'});
                });
            });
        });
    });
});

router.post('/delete_trademarks', function(req, res){

    utils.autologin(req, res, function(sessionuser){

        if(req.body.type=='global'){
            db.Users.update({
                itccontactstel:''
            },{
                where:{
                    id:sessionuser
                }
            }).then(function(u){
                res.json({msg:'删除成功',code:0});
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
                db.Groups.update({
                    trademark:''
                },{
                    where:{
                        id:group.id
                    }
                }).then(function(up){
                    res.json({code:0,msg:'ok'});
                });
            });
        });
    });
});

router.post('/delete_bottrademarks', function(req, res){

    utils.autologin(req, res, function(sessionuser){
    
        if(req.body.type=='global'){
            db.Users.update({
                itccontactstel:''
            },{
                where:{
                    id:sessionuser
                }
            }).then(function(u){
                res.json({msg:'删除成功',code:0});
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
                db.Groups.update({
                    bottrademark:''
                },{
                    where:{
                        id:group.id
                    }
                }).then(function(up){
                    res.json({code:0,msg:'ok'});
                });
            });
        });
    });
});

router.post('/delete_bgmusic', function(req, res){
    utils.autologin(req, res, function(sessionuser){
        db.Users.update({
            bgmusic:''
        },{
            where:{
                id:sessionuser
            }
        }).then(function(user){
            res.json({code:0,msg:'全局背景音乐删除成功'});
        });
    });
});

router.get('/',function(req,res){
    if(!req.session.user){
        res.redirect('/login');
        return;
    }
    var r={
        platform:utils.getPlatform(req),
        page:'settings',
        title:'账号设置'
    }
    db.Users.findOne({
        where:{
            id:req.session.user
        }
    }).then(function(u){

        r.user = {
            id:req.session.user,
            nickname:u.nickname,
            expiredate:u.expiredate
        };

        r.permission_trademark=u.permission_trademark;
        r.permission_prefix=u.permission_prefix;
        r.permission_introduction=u.permission_introduction;
        r.permission_bgsnd=u.permission_bgsnd;
        r.bgmusic=u.bgmusic;

        r.advertisement=u.advertisement;
        r.trademark=u.trademark;
        r.logo=u.logo;
        r.nickname=u.nickname;
        r.prefix=u.prefix;
        r.itccontactstel=u.itccontactstel;


        utils.getChildrenUsers(2827).then(function(all_logo_user){

            all_logo_user.indexOf(u.id)==-1?r.permission_logo=u.permission_logo:r.permission_logo=1;


            var children_arr = JSON.parse(u.children);
            r.is_father = children_arr.length>0||u.id==1;


            utils.getexpire(u.id).then(function(expire){

                r.user.expiredate = expire;

                db.Users.findAll({
                    where:{
                        id: {
                            in:children_arr
                        }
                    }
                }).then(function(new_children){

                    var children_name = [];
                    for(var ui in new_children){
                        if(children_name.indexOf(new_children[ui].name)==-1){
                            children_name.push(new_children[ui].name);
                        }
                    }
                    children_name.push(u.name);
                    r.children_name = children_name;

                    // 是否绑定
                    if(req.query.type=='json'){
                        res.json(r);
                    }else{
                        res.render('settings',r);
                    }
                });
            });
        });
    });
});

router.get('/account', function(req, res){
    if(!req.session.user){
        res.redirect('/login');
        return;
    }
    var r={
        platform:utils.getPlatform(req),
        page:'settings',
        title:'账号设置'
    }
    db.Users.findOne({
        where:{
            id:req.session.user
        }
    }).then(function(u){
        r.user = {
            id:req.session.user,
            nickname:u.nickname
        };

        r.permission_trademark = u.permission_trademark;
        r.permission_logo = u.permission_logo;
        r.permission_prefix = u.permission_prefix;
        r.permission_introduction = u.permission_introduction;
        r.permission_bgsnd = u.permission_bgsnd;

        r.advertisement = u.advertisement;
        r.trademark = u.trademark;
        r.logo = u.logo;
        r.nickname = u.nickname;
        r.prefix = u.prefix;
        r.itccontacts = u.itccontacts;
        r.user = u;

        r.user.deletepsw = null;
        r.user.password = null;


        var children_arr = JSON.parse(u.children);
        r.is_father = children_arr.length>0||u.id==1;



        utils.getexpire(u.id).then(function(expire){
            
            r.user.expiredate = expire;

            db.Users.findAll({
                where:{
                    id: {
                        in:children_arr
                    }
                }
            }).then(function(new_children){

                var children_name = [];
                for(var ui in new_children){
                    if(children_name.indexOf(new_children[ui].name)==-1){
                        children_name.push(new_children[ui].name);
                    }
                }
                children_name.push(u.name);
                r.children_name = children_name;

                // 是否绑定
                if(req.query.type=='json'){
                    res.json(r);
                }else{
                    res.render('account',r);
                }
            });
        });
    });
});


router.post('/setplant', function(req, res){
    utils.autologin(req, res, function(sessionuser){
        var state = req.body.state;
        var groupkey = req.body.groupkey;
        db.Groups.update({
            plant_status:state
        },{
            where:{
                key:groupkey
            }
        }).then(function(group){
            if(!group){
                res.json({code:-2,msg:'key值无效'});
                return;
            }
            res.json({code:0,msg:'设置成功',plant_status:state});
        });
    });
});

router.post('/deletepsw', function(req, res){

    var old_password = req.body.old_password;
    var new_password = req.body.new_password;
    var re_password = req.body.re_password;

    if(!req.session.user){
        res.json({code:-98,msg:'登录已失效'});
        return;
    }
    if(!old_password||!new_password||!re_password){
        res.json({code:-1,msg:'密码不能为空'});
        return;
    }
    if(new_password!=re_password){
        res.json({code:-21,msg:'两次密码不同'});
        return;
    }

    old_password = utils.hex_sha1('muwenhu'+old_password);

    db.Users.findOne({
        where: {
            id:req.session.user,
            deletepsw:old_password
        }
    }).then(function(user){
        if(!user){
            res.json({code:-31,msg:'原密码输入不正确'});
            return;
        }
        db.Users.update({
            deletepsw: utils.hex_sha1('muwenhu'+new_password)
        },{
            where:{
                id:user.id
            }
        }).then(function(new_user){
            if(!new_user){
                res.json({code:-31,msg:'修改失败，请稍后再试或联系业务员'});
                return;
            }
            res.json({code:0,msg:'修改成功，请记住新密码'});
        });
    });
});

router.post('/setinfo', function(req,res) {

    utils.autologin(req, res, function(sessionuser){

        db.Users.findOne({
            where:{
                id: sessionuser
            }
        }).then(function(user){
            // if(user.permission_logo==0){
            //     res.json({code:-91,msg:'您没有该权限  '});
            //     return;
            // }

            var data = {
                company: req.body.itcname,
                telephone: req.body.itcphone,
                itcwebsite: req.body.itcwebsite
            }

            db.Users.update(data,
                {
                    where:{
                        id: sessionuser
                    }
                }
                ).then(function(user){
                if(!user)return false;
                res.json({code:0,msg:'修改成功'});
            });
        });
    });
});

router.get('/bind',function(req,res){

    utils.autologin(req, res, function(sessionuser){

        var code = req.query.code;
        var token_url = 'http://wx.sz-sti.com/api/oauth2/access_token?code='+code+'&redirect_uri=localhost:3000/settings&appid=wx17e4a435798f90e2'; 
        nodegrass.get(token_url,function(data,status,headers){
            var data = JSON.parse(data);
            var access_token = data.access_token;

            var result;
            if(access_token){
                result = {code:0,access_token:access_token};
            }else{
                result = {code:-1,msg:"Fail getting access_token"};
            }
            // res.render('tips',result);
            res.json(data);
        });
    });
});

router.post('/change_nickname',function(req,res){

    utils.autologin(req, res, function(sessionuser){
        db.Users.update({
            nickname:req.body.nickname
        },{
            where:{
                id:sessionuser
            }
        }).then(function(r){
            res.json({code:0,msg:'ok'});
        });
    });
});

router.post('/change_name',function(req,res){

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


router.post('/change_introduction_status',function(req,res){

    utils.autologin(req, res, function(sessionuser){

        db.Users.findOne({
            where:{
                id:sessionuser
            }
        }).then(function(u){
            var permission_introduction=u.permission_introduction?0:1;
            db.Users.update({
                permission_introduction:permission_introduction
            },{
                where:{
                    id:sessionuser
                }
            }).then(function(r){
                res.json({code:0,msg:'ok'});
            });
        });
    });
});

router.post('/change_bgsnd_status',function(req,res){

    utils.autologin(req, res, function(sessionuser){
        db.Users.findOne({
            where:{
                id:sessionuser
            }
        }).then(function(u){
            var permission_bgsnd=u.permission_bgsnd?0:1;
            db.Users.update({
                permission_bgsnd:permission_bgsnd
            },{
                where:{
                    id:sessionuser
                }
            }).then(function(r){
                res.json({code:0,msg:'ok'});
            });
        });
    });
});

router.post('/global_prefix',function(req,res){

    utils.autologin(req, res, function(sessionuser){

        var prefix=req.body.prefix?req.body.prefix:'';
        db.Users.findOne({
            where:{
                id:sessionuser
            }
        }).then(function(u){
            // if(!u.permission_prefix){
            //     res.json({code:-1,msg:'permission denied'});
            //     return;
            // }
            utils.getChildrenUsers(sessionuser).then(function(users){
                db.Users.update({
                    prefix:prefix
                },{
                    where:{
                        id:{
                            in:users
                        }
                    }
                }).then(function(up){
                    res.json({code:0,msg:'ok'});
                });
            });
        });
    });
});

router.post('/global_sharead',function(req,res){

    utils.autologin(req, res, function(sessionuser){

        var itccontacts=req.body.sharead?req.body.sharead:'';
        db.Users.findOne({
            where:{
                id:req.session.user
            }
        }).then(function(u){
            utils.getChildrenUsers(req.session.user).then(function(users){
                db.Users.update({
                    itccontacts:itccontacts
                },{
                    where:{
                        id:{
                            in:users
                        }
                    }
                }).then(function(up){
                    res.json({code:0,msg:'ok'});
                });
            });
        });
    });
});

router.post('/global_advertisement',function(req,res){

    utils.autologin(req, res, function(sessionuser){

        var ad=req.body.advertisement?req.body.advertisement:'';
        var sp=ad.split('</div>');
        var telephone='';
        if(sp.length>1){
            if(utils.isTelephone(sp[1].substr(5))){
                telephone=sp[1].substr(5);
            }
        }
        utils.getChildrenUsers(sessionuser).then(function(users){
            db.Users.update({
                advertisement:ad,
                telephone:telephone
            },{
                where:{
                    id:{
                        in:users
                    }
                }
            }).then(function(r){
                res.json({code:0,msg:'ok'});
            });
        });
    });
});

router.post('/change_password',function(req,res){

    utils.autologin(req, res, function(sessionuser){

        db.Users.findOne({
            where:{
                password:req.body.old_password,
                id:sessionuser
            }
        }).then(function(u){
            if(!u){
                if(req.query.lang=='en'){
                    res.json({msg:'wrong origan password',code:-1});
                }else{
                    res.json({msg:'原密码错误',code:-1});
                }
                return;
            }
            db.Users.update({
                password:req.body.new_password
            },{
                where:{
                    id:sessionuser
                }
            }).then(function(r){
                res.json({code:0,msg:'ok'});
            });
        });
    });
});
module.exports = router;
