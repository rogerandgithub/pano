var express = require('express');
var router = express.Router();
var db= require('./model');
var xss= require('xss');
var utils= require('./utils');

var fs = require("fs");
var config= require('./config');

router.get('/',function(req,res){
    var r={
        platform:utils.getPlatform(req),
        page:'master',
        title:'账号管理'
    }
    db.Users.findOne({
        where:{
            id:req.session.user
        }
    }).then(function(u){
        if(u.level<100){
            res.json({code:-2,msg:'?'});
            return;
        }
        res.render('master',r);
    });
});

router.post('/users',function(req,res){
    var cur_page=parseInt(req.body.cur_page)?parseInt(req.body.cur_page):1;
    var limit=10;
    db.Users.findOne({
        where:{
            id:req.session.user
        }
    }).then(function(u){
        if(u.level<100){
            res.json({code:-2,msg:'?'});
            return;
        }
        db.Users.findAndCountAll({
            where:{
                level:{
                    gte:1,
                    lt:u.level
                }
            },
            offset:(cur_page-1)*limit,
            limit:limit,
            order:'name DESC'
        }).then(function(r){
            var count=r.count;
            var users=r.rows;
            res.json({code:0,msg:'ok',users:users,count:count,cur_page:cur_page,total_page:parseInt(((count?count:1)-1)/limit)+1});
        });
    });
});

router.post('/newuser',function(req,res){
    var username=req.body.username;
    var password=req.body.password;
    var father=req.body.father;

    var newuser={
        name:username,
        password:password,
        level:1
    }
    if(req.body.permission_trademark==1){
        newuser.permission_trademark=1;
    }
    if(req.body.permission_prefix==1){
        newuser.permission_prefix=1;
    }
    if(!username){
        res.json({msg:'请输入用户名及密码',code:-1});
        return;
    }
    if(username.length<3||username.length>18){
        res.json({msg:'请输入3位～18位字符作为用户名',code:-1});
        return;
    }
    db.Users.findOne({
        where:{
            id:req.session.user
        }
    }).then(function(u){
        if(u.level<100){
            res.json({code:-2,msg:'?'});
            return;
        }
        db.Users.findOne({
            where:{
                name:username
            }
        }).then(function(user){
            if(user){
                res.json({msg:'该用户已经存在',code:-3});
                console.log("error");
                return;
            }
            if(father){
                db.Users.findOne({
                    where:{
                        name:father
                    }
                }).then(function(f){
                    if(!f){
                        res.json({msg:'父账号不存在',code:-3});
                        return;
                    }
                    if(f.level<10){
                        res.json({msg:'父账号权限不足',code:-3});
                        return;
                    }
                    var children=JSON.parse(f.children);
                    newuser.father=f.id;
                    newuser.company=f.company;
                    newuser.permission_logo=f.permission_logo;
                    newuser.permission_prefix=f.permission_prefix;
                    newuser.permission_hidetitle=f.permission_hidetitle;
                    newuser.permission_trademark=f.permission_trademark;
                    newuser.logo=f.logo;
                    newuser.nickname=newuser.name;
                    newuser.trademark=f.trademark;
                    newuser.prefix=f.prefix;
                    db.Users.create(newuser).then(function(u){
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
                    });
                });
            }else{
                db.Users.create(newuser).then(function(u){
                    res.json({msg:'ok',code:0});
                });
            }
        });
    });
});

router.post('/set',function(req,res){
    var user_id=req.body.user_id;
    var ups={};
    for(var i in req.body){
        if(i=='nickname'||
           i=='company'||
           i=='prefix'||
           i=='logo'||
           i=='trademark'||
           i=='permission_trademark'||
           i=='permission_logo'||
           i=='permission_prefix'||
           i=='permission_hidetitle'
           ){
               ups[i]=req.body[i];
        }
    }
    db.Users.findOne({
        where:{
            id:req.session.user
        }
    }).then(function(u){
        if(u.level<100){
            res.json({code:-2,msg:'?'});
            return;
        }

        db.Users.update(
        ups
        ,{
            where:{
                level:{
                    gte:1
                },
                id:user_id
            }
        }).then(function(up){

            //更新userdate.js
            fs.readFile("usersdata.js","utf8",function (err,data){

                if(err)console.log(err) ;
                data = JSON.parse(data);
                for(var i in data.users){
                    if(data.users[i].id == user_id){
                       
                        for(var j in req.body){
                            data.users[i][j] = req.body[j];
                            console.log(data.users[i]);
                        }
                   }
                }

                fs.writeFile('usersdata.js', JSON.stringify(data), function(err){

                    if(err)console.log(err);

                    res.json({code:0,msg:'ok'});
                });

            });
        });
    });
});

router.get('/updatefile', function(req, res){

    utils.savefile(function(){
         res.json({code:0,msg:'已更新文件'});
    });

});

module.exports = router;
