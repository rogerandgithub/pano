var express = require('express');
var router = express.Router();
var db= require('./model');
var xss= require('xss');
var utils= require('./utils');
var fs = require("fs");
var config= require('./config');

router.get('/test', function(req,res){
    utils.savefile2();
})


router.get('/',function(req,res){

    var is_admin = 0; 
    
    var r={
        platform:utils.getPlatform(req),
        page:'management',
        title:'子账号管理',
        is_admin:req.session.user==1,
        pagenum:req.query.page?parseInt(req.query.page)-1:0,
        order:req.query.order
    }

    if(req.session.user!=1){
        if(!req.session.user){
            res.redirect('/login');
            return;
        }
        db.Users.findOne({
            where: {
                id: req.session.user
            }
        }).then(function(user){
            r.permission_hidetitle = user.permission_hidetitle;
            res.render('management',r);
        });
    }else{

        fs.readFile("usersdata.js","utf8",function (err,data){

            if(err)console.log(err) ;

            var itemnum = 20;
            var father_num = {};
            var userdata, is_more;
            var page = req.query.offset?req.query.offset-1:0;
            var order = req.query.order;
            var data = JSON.parse(data);
            var r = data.users;
            var name = req.query.name;
            var fliterArr = ['uploads', 'day_up', 'week_up', 'expiredate'];
            var groupnum = 0;

            for(var i in data.users){
                groupnum += data.users[i].uploads;
            }

            if(name){

                db.Users.findAll({

                    attributes: ['id'],
                    where: {
                        name: {
                            $like: '%'+name+'%'
                        }
                    }

                }).then(function(users){

                    if(!users)users = [];

                    var id_arr = [];
                    for(var i in users){
                        id_arr.push(users[i].id);
                    }

                    // console.log(id_arr);

                    var newr = [];
                    for(var i in r){
                        if(id_arr.indexOf(r[i].id)!=-1){
                            newr.push(r[i]);
                        }
                    }

                    r = newr;
                    handle();

                });

            }else{ 

                if (order&&fliterArr.indexOf(order)!=-1) {

                    r.sort(function(a,b){
                        return b[order]-a[order];
                    });

                }else if(order=='father'){

                    var newr = [];
                    r.map(function(user){
                        
                        if(user.level>1){
                            newr.push(user);
                        }
                    });
                    r = newr;

                }else{

                    r.sort(function(a,b){
                        return b.uploads-a.uploads;
                    });

                }
                handle();
            }
            


            //分页
            function handle(){
                page *= itemnum;
                console.log(itemnum);
                r.length>page?is_more = 1:is_more = 0;
                var result={
                    count:r.length,
                    groupnum: groupnum,
                    pagenums:Math.ceil(r.length/itemnum),
                    is_more_page:is_more,
                    users:r.slice(page, page+itemnum),
                    lasttime:data.lasttime
                }

                req.session.father_num = father_num;
                if(req.query.type=="json"){
                    res.json(result);
                }else{
                    res.render('data',result);
                }
            }
        });

        return;
    }
});

router.get('/chart', function(req, res){
    if(req.session.user == 1){
        db.Scenes.findAll({
            where:{
                user_id:{
                    gt:1
                },
                show:{
                    $gte:1
                }
            }
        }).then(function(Scenes){
            var date = new Date();
            var today = date.getFullYear()+'-'+(date.getMonth() < 10 ? '0' + (date.getMonth()+1):(date.getMonth()+1)) + "-" + (date.getDate() < 10 ? '0' + date.getDate():date.getDate()) ;
            var r = {};

            r.today = today;

            var day_scene_data=[0,0,0,0,0,0,0,0,0,0];
            var updateday, days;

            for(var i in Scenes){
                updateday = new Date(Date.parse(Scenes[i].createdAt));
                updateday = updateday.getFullYear()+'-'+(updateday.getMonth() < 10 ? '0' + (updateday.getMonth()+1):(updateday.getMonth()+1)) + "-" + (updateday.getDate() < 10 ? '0' + updateday.getDate():updateday.getDate()) +" 00:00:00";
                updateday = Date.parse(updateday);
                days = parseInt((Date.parse(today) - updateday)/(24*3600*1000));
                if(days<11){
                    day_scene_data[days-1]++;
                }
            }
            day_scene_data.reverse();

            r.day_scene_data = day_scene_data;

            db.Groups.findAll({
                where:{
                    user_id:{
                        gt:1
                    },
                show:{
                    $gte:1
                }
                }
            }).then(function(Groups){
                
                var day_group_data=[0,0,0,0,0,0,0,0,0,0];
                var updateday, days;

                for(var i in Groups){
                    updateday = new Date(Date.parse(Groups[i].createdAt));
                    updateday = updateday.getFullYear()+'-'+(updateday.getMonth() < 10 ? '0' + (updateday.getMonth()+1):(updateday.getMonth()+1)) + "-" + (updateday.getDate() < 10 ? '0' + updateday.getDate():updateday.getDate()) +" 00:00:00";
                    updateday = Date.parse(updateday);
                    days = parseInt((Date.parse(today+" 00:00:00") - updateday)/(24*3600*1000));
                    if(days<11){
                        day_group_data[days-1]++;
                    }
                }
                day_group_data.reverse();

                r.day_group_data = day_group_data;

                res.render('analysis',r);
                // res.json(r);
            });
        });
    }else{
        res.redirect('/');
    }
});
router.get('/children',function(req,res){
    var itemnum = 30;
    var father_num = {};
    utils.getChildrenUsers(req.session.user).then(function(users){
        var u=[], userdata, is_more_page;
        var page = req.query.page?req.query.page:0;
        var order = req.query.order;
        for(i in users){
            if(users[i]!=req.session.user){
                u.push(users[i]);
            }
        }
        db.Users.findAll({
            attributes:['name','permission_delete','permission_logo','id','updatedAt','wechat_info','level','logo','trademark','prefix', 'father'],
            where:{
                id:{
                    in:u
                }
            }
        }).then(function(r){

            if(r===false){  
                return false;
            } 

            db.Groups.findAll({
                attributes:['id','user_id','updatedAt'],
                where:{
                    user_id:{
                        in:u
                    }
                },
                order:['updatedAt']
            }).then(function(romaings){
                for(var j in r){
                    r[j].permission_logo = 0;
                    r[j].logo = 0;
                    r[j].trademark = 0;
                    r[j].wechat_info = null;
                }
                //不知为何不能给对象赋予值，只能修改值，可能是对对象做原生设定了。偷懒，直接多加字段
                //用permission_logo代表全部上传数量，logo代表七天内的，trademark代表一天内的
                for(var i = 0, len = romaings.length; i < len; i++){
                    for(var j in r){
                        if (romaings[i].user_id == r[j].id) {
                            r[j].permission_logo++;
                            r[j].wechat_info = romaings[i].updatedAt;

                            var date = new Date(romaings[i].updatedAt);
                            date = date.getTime();
                            var now = Date.now();
                            if ( now - date < 604800000 ) {
                                r[j].logo++;
                                if ( now - date < 86400000) {
                                    r[j].trademark++;
                                };
                            };
                        };
                    }
                }

                //重新计算母账户的上传数量
                for (var i in r) {
                    if(r[i].level>1){
                        for (var j in r) {
                            if(r[j].father == r[i].id){
                                r[i].permission_logo += r[j].permission_logo;
                                r[i].logo += r[j].logo;
                                r[i].trademark += r[j].trademark;
                                if(father_num[r[i].id]){
                                    father_num[r[i].id].all += r[j].permission_logo;
                                    father_num[r[i].id].seven += r[j].logo;
                                    father_num[r[i].id].one += r[j].trademark;
                                }else{
                                    father_num[r[i].id] = {};
                                    father_num[r[i].id].all = r[i].permission_logo;
                                    father_num[r[i].id].seven = r[i].logo;
                                    father_num[r[i].id].one = r[i].trademark;
                                }
                            }
                        };
                    }
                };

                if (order) {
                    r.sort(function(a,b){
                        var flag = 0;
                        if(order == 'all') flag = b.permission_logo-a.permission_logo;
                        if(order == 'seven') flag = b.logo-a.logo;
                        if(order == 'one') flag = b.trademark-a.trademark;
                        if(order == 'time'){
                            a.permission_logo > 0?a.lasttime = a.wechat_info:a.updatedAt;
                            b.permission_logo > 0?b.lasttime = b.wechat_info:b.updatedAt;
                            flag = new Date(b.lasttime)-new Date(a.lasttime);
                        };
                        return flag;
                    });
                };

                //分页
                r.length>itemnum?is_more_page = 1:is_more_page = 0;
                page *= itemnum;
                var result={
                    count:r.length,
                    pagenums:Math.ceil(r.length/itemnum),
                    is_more_page:is_more_page,
                    list:r.slice(page,page+itemnum),
                    order:order
                }

                db.Users.findOne({
                    where:{
                        id:req.session.user
                    }
                }).then(function(user){
                    req.session.father_num = father_num;
                    result.is_father = !!(user.level>1);
                    res.json(result);
                });
            })
        })
    })
});


router.get('/child',function(req,res){
    var father_num = req.session.father_num;
    if (req.session.user!=1) {return false;};
    db.Users.findOne({
        attributes:['id','name','permission_delete','id','updatedAt','wechat_info','level','logo','trademark','prefix'],
        where:{
            name:req.query.name
        }
    }).then(function(r){

        if(!r){  
            res.json({code:-1,msg:"没有找到相关账户信息"});
        }

        if (father_num[r.id]) {
            r.level=father_num[r.id].all;
            r.logo=father_num[r.id].seven;
            r.trademark=father_num[r.id].one;
            res.json(r);
        }else{
            db.Groups.findAll({
                attributes:['id','user_id','updatedAt'],
                where:{
                    user_id:r.id
                },
                order:['updatedAt']
            }).then(function(romaings){
                r.level = 0;
                r.logo = 0;
                r.trademark = 0;
                r.wechat_info = null;
                for(var i = 0, len = romaings.length; i < len; i++){
                    if (romaings[i].user_id == r.id) {
                        r.level++;
                        r.wechat_info = romaings[i].updatedAt;
                        
                        var date = new Date(romaings[i].updatedAt);
                        date = date.getTime();
                        var now = Date.now();
                        if ( now - date < 604800000 ) {
                            r.logo++;
                            if ( now - date < 86400000) {
                                r.trademark++;
                            };
                        };
                    };
                }
                res.json(r);
            })
        }
    })
});

router.get('/tour.js', function(req, res){
    // res.json({});
    var name = req.query.n;
    var url = req.query.u;

    fs.readFile('./public/js/sti-tour.js', 'utf-8', function(err,data){
        if(err){
            console.log(err);
            return;
        }
        if(name){
            data = data.replace('关于速腾聚创', name);
            if(url){
                data = data.replace('http://www.sz-sti.com', 'http://'+url);
            }
        }
        res.set('Content-Type', 'application/javascript;charset=UTF-8');
        res.send(data);
    });
});

router.get('/article', function(req, res){

    var article_id = ['1','2','3','4'];
    var id = req.query.id;

    if(!req.query.id||article_id.indexOf(id)==-1){
        res.json({code:-91,msg:'No such article'});
        return;
    }
    res.render('article'+id, {});

})


router.post('/set_permission_delete',function(req,res){
    var name=req.body.username;
    var permission=req.body.permission;
    db.Users.update({
        permission_delete:permission
    },{
        where:{
            name:name
        }
    }).then(function(u){
        res.json({
            msg:'ok',
            code:0
        });
    });
});

router.post('/deletechild',function(req,res){

    if(!req.session.user){
        res.json({code:-98,msg:'登录已失效，请重新登录'});
        return;
    }

    var userid=parseInt(req.body.userid);


    db.Users.findOne({
        where:{
            id:userid
        }
    }).then(function(child){
        if(!child){
            res.json({code:-1,msg:'没有该子账户'});
            return;
        }
        db.Users.findOne({
            where:{
                id:req.session.user
            }
        }).then(function(father){
            var children = JSON.parse(father.children);
            var index = children.indexOf(userid);
            if(index==-1){
                res.json({code:-1,msg:"您没有权限改动该账号"});
                return;
            }

            children.splice(index, 1);

            db.Users.update({
                children: JSON.stringify(children)
            },{
                where:{
                    id:req.session.user
                }
            }).then(function(user){
                if(child.itcmstertel=='inherit'){
                    db.Users.destroy({
                        where:{
                            id:userid
                        }
                    }).then(function(u){
                        res.json({
                            msg:'ok',
                            code:0
                        });
                    });
                }else{
                    res.json({
                        msg:'ok',
                        code:0
                    });
                }
            });

            
        })
    });

    
    
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
                }).then(function(u){
                    res.json({msg:'ok',code:0});
                });
            })
        })
    })
});

router.post('/amendaccount',function(req,res){

    if(!req.session.user){
        res.json({code:-2,msg:'您还没登录'});
        return;
    }

    db.Users.findOne({
        where:{
            id:req.session.user
        }
    }).then(function(suser){
        if(JSON.parse(suser.children).indexOf(req.body.accounId)==-1&&suser.level<10){
            res.json({code:-1,msg:'您没有权限改动该账号'});
            return;
        }
        db.Users.findOne({
            where:{
                name:req.body.new_account
            }
        }).then(function(user){
            if(user){
                res.json({msg:"该用户名已经存在",code:-1});
                return;
            }else{

                db.Users.update({
                    name:req.body.new_account
                },{
                    where:{
                        id:req.body.accounId
                    }
                }).then(function(r){
                    res.json({code:0,msg:'ok'});
                });
            }
        });
    });

    
});

router.post('/changechildcode',function(req,res){

    var mather_password=req.body.mather_password?req.body.mather_password:null,
        child_id=req.body.child_id?req.body.child_id:null,
        child_newcode=req.body.child_newcode?req.body.child_newcode:null,
        child_newcode_repeat=req.body.child_newcode_repeat?req.body.child_newcode_repeat:null;

    if(!mather_password||!child_id||!child_newcode||!child_newcode_repeat){
        res.json({code:-2,msg:'新密码不能为空'});
        return;
    }
    if (child_newcode_repeat != child_newcode) {
        res.json({msg:'两次输入密码不一致',code:-2});
        return;
    }
    db.Users.findOne({
        where:{
            id:req.session.user,
            password:mather_password
        }
    }).then(function(result){

        if(!result){
            res.json({msg:'母账户密码输入错误',code:-1});
            return;
        }

        if(result.children.indexOf(child_id)==-1){
            res.json({msg:'您没有权限改动该账号',code:-3});
            return;
        }

        db.Users.update({
            password:child_newcode
        },{
            where:{
                id:child_id,
                father:req.session.user
            }
        }).then(function(u){
            res.json({msg:'ok',code:0});
        });
    });
});

module.exports = router;
