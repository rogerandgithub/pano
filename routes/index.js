var express = require('express');
var router = express.Router();
var db= require('./model');
var xss= require('xss');
var utils= require('./utils');

var config= require('./config');

router.get('/new/download', function(req, res){
    var r = {};
    request({
        url: 'http://suteng.oss-cn-shenzhen.aliyuncs.com/config?v='+Date.now(),
    }, function(error, response, body){
        // res.send(body);
        if(error||!body){
            res.json({code:-404, error: 'error'});
            return;
        }
        body = JSON.parse(body);
        r.platform = utils.getPlatform(req);
        r.body = body;
        res.render('newitem/download',r);
    });
});


router.get('/help', function(req, res){
	res.render('help', {});
});

router.get('/multi/:key', function(req, res){

    var key = req.params.key;

    db.MultiPro.findOne({
        where: {
            key: key
        }
    }).then(function(multipro){
        if(!multipro){
            res.redirect('/404');
            return;
        }
        res.redirect('/scene?prokey='+multipro.key);
    });
});

router.get('/feedback', function(req, res){
	res.render('feedback', {});
});

router.get('/test/render', function(req, res){
    var ejs = req.query.ejs;
    if(!ejs){
        res.json({});
    }
    res.render(ejs, {});
});

router.post('/app/signin', function(req, res){

    var username=req.body.username;
    var password=req.body.password;

    db.Users.findOne({
        where:{
            name:username,
            password:password
        }
    }).then(function(user){
    	if(!user){
            res.json({msg:'账号或密码错误',code:-1});
            return;
    	}
        var flagarr = [579, 750, 2956], flag = false;
        if(flagarr.indexOf(user.id)!=-1)flag = true;

    	//create user signin token
        var token = utils.hex_sha1(utils.md5(user.password+user.id) + '_suteng_qson');
	    utils.redis.set(token, user.id);
        var itcmstertel;

        if(user.itcmstertel=="inherit"){

            db.Users.findOne({

                id:user.father

            }).then(function(father){
                if(father&&father.itcmstertel){
                    itcmstertel = father.itcmstertel;
                }else{
                    itcmstertel = '';
                }
                itcmstertel = '';
                (user.listapi && user.callbackapi)?res.json({code:0,token:token,flag:flag,listapi: user.listapi,deviceid:itcmstertel}):res.json({code:0,token:token,flag:flag,listapi: '',deviceid:itcmstertel})
            })

        }else{
            user.itcmstertel = '';
            (user.listapi && user.callbackapi)?res.json({code:0,token:token,flag:flag,listapi: user.listapi,deviceid:user.itcmstertel}):res.json({code:0,token:token,flag:flag,listapi: '',deviceid:user.itcmstertel})
        }
    });
});

router.get('/app/signout', function(req, res){

    var token=req.query.token;
    if(!token){
    	res.json({code:-1,msg:'Invalid token'});
    	return;
    }
    utils.redis.set(token, 0);
    res.json({code:0,msg:'ok'});
});

var request = require('request');

router.get('/version', function(req, res){
    var r = {};
    request({
        url: 'http://suteng.oss-cn-shenzhen.aliyuncs.com/config?v='+Date.now(),
    }, function(error, response, body){
        if(error||!body){
            res.json({code:-404, error: err});
            return;
        }
        body = JSON.parse(body);
        r.version = body['device-version'];
        res.json(r);
    });
});

/* GET home page. */
router.get('/', function(req, res) {

    // if(req.headers.host.indexOf('robosense.cn')!=-1){
    //     res.redirect('http://www.robosense.cn');
    //     return;
    // }
    // if(req.headers.host.indexOf('robosense.ai')!=-1){
    //     res.redirect('http://www.robosense.ai');
    //     return;
    // }
    // if(req.headers.host.indexOf('www.sz-sti')!=-1){
    //     res.redirect(301,'http://www.robosense.cn');
    //     return;
    // }
    console.log(3333)
    if(req.query.token){
        utils.redis.get(req.query.token, function(err, val){
            if(err||isNaN(val)||val==0){
                res.redirect('/newitem/login');
                return;
            }
            db.Users.findOne({
                where:{
                    id:val
                }
            }).then(function(u){

                var r={};
                r.user=u;

                utils.getexpire(r.user.id).then(function(expire){

                    r.user.expiredate = expire;

                    if(req.query.type=="json"){
                        res.json(r);
                    }else{
                        res.render('index',r);
                    }
                });
            });
        });
        return;
    }
	
    if(req.session.user&&req.session.user_type!='wechat'){
    	db.Users.findOne({
	        where:{
	            id:req.session.user
	        }
	    }).then(function(u){

	    	var r={};
	        r.user=u;

	        utils.getexpire(r.user.id).then(function(expire){

                r.user.expiredate = expire;

                if(req.query.type=="json"){
		        	res.json(r);
		        }else{
			    	// res.render('index',r);
                    res.redirect('/panoitem');
		        }
            });
	    });
    }else{
        res.redirect('/newitem/login');
    }
});

router.get('/index', function(req, res){

    utils.autologin(req, res, function(sessionuser){
		db.Users.findOne({
			where:{
				id: sessionuser
			}
		}).then(function(user){

			var children_arr = JSON.parse(user.children);
			var r = {};
	        r.is_father=!!(children_arr.length>0||sessionuser==1);
	        r.user = user;

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
		        children_name.push(user.nickname);
		        r.children_name = children_name;


		        res.render('nav', r);
		    });
		});
	});     
});

router.get('/ports', function(req, res) {
	db.Users.findOne({
        where:{
            id:req.session.user
        }
    }).then(function(u){
    	var r={};
        r.user=u;
        if(req.query.type=="json"){
        	res.json(r);
        }else{
	    	res.render('ports',r);
        }
    });
});

router.get('/mobilerecruit', function(req, res){
    res.render('index/mobilerecruit');
});

router.get('/new/download', function(req, res){
    var r = {};
    request({
        url: 'http://suteng.oss-cn-shenzhen.aliyuncs.com/config?v='+Date.now(),
    }, function(error, response, body){
        // res.send(body);
        if(error||!body){
            res.json({code:-404, error: err});
            return;
        }
        body = JSON.parse(body);
        r.platform = utils.getPlatform(req);
        r.body = body;
        res.render('new/download',r);
    });
});


var when = require('when');
//更改数据库的nickname
router.get('/rundb1', function(req, res){

    db.Users.findAll({
        attributes: ['name', 'nickname'],
        where: {
            $or: [{
                nickname: null
            }, {
                nickname: 's'
            }]
        }
    }).then(function(users){

        var sqlarr = [];

        for(var i in users){

            var nickname = users[i].name;

            sqlarr.push(db.Users.update({
                nickname: nickname
            }, {
                where: {
                    name: nickname
                }
            }));
            console.log('更新了账号'+nickname+'的昵称'+users[i].nickname);
        }
        when.all(sqlarr).then(function(ups){});
        res.json({code:0,msg:'update succeed'});
    });
});

router.get('/testpasswd', function(req, res){
    var password = req.query.pw;
    res.send(utils.hex_sha1(password + 'letian'));
});



router.get('/data', function(req, res){

    db.Groups.findAll({
        where: {
            user_id: 579,
            scenes_id:{
                $ne:"[]"
            }
        },
        limit: 20
    }).then(function(groups){

        var scenes_id = [];
            console.log(JSON.stringify(groups[0]));
        for(var i in groups){
            scenes_id = scenes_id.concat(JSON.parse(groups[i].scenes_id));
        }
        db.Scenes.findAll({
            where: {
                id: {
                    $in: scenes_id
                }
            }
        }).then(function(scenes){
            
            var id2scene = {};
            for(var i in scenes){
                id2scene[scenes[i].id] = scenes[i];
            }
            for(var i in groups){
                var sceneid = JSON.parse(groups[i].scenes_id)[0];
                groups[i].dataValues.scenekey = id2scene[sceneid].key;
            }
            res.json({code:0,romaings:groups});
        });
    });
});

// var images = require('images');
var path = require('path');

router.get('/thumb', function(req, res){
    var key = req.query.key;
    var inputpath = path.join(__dirname, '../public/pano/'+key+'.jpg');
    var outputpath = path.join(__dirname, '../public/pano/'+key+'.tiles/panothumb.jpg');
    var i = images(inputpath).size(1000).save(outputpath, {quality: 100});
    res.json({code:0,msg:i});
});


router.get('/pillar/:id', function(req, res){
    var id = req.params.id;
    if(id!=2){
        res.redirect('/pillar/2');
        return;
    }
    var lang = req.query.lang;
    if(lang!='en' && lang!='cn'){
        lang = 'cn';
    };
    res.render('index/pillar',{lang:lang});
});

router.get('/pillar/:id/scenario/:kid', function(req, res){   
    var lang = req.query.lang;
    if(lang!='en' && lang!='cn'){
        lang = 'cn';
    };
    res.render('index/pillar',{lang:lang});
});



var queuefun = require('queue-fun');
var Queue = queuefun.Queue(); 



router.get('/runscenegroupsid', function(req, res){

    db.Scenes.findAll({
        attributes: ['id','groups_id'],
        where: {
            group_id: 0
        }
    }).then(function(scenes){

        var queue = new Queue(2,{
            event_err: function(err){},  //失败
            event_succ: function(){}
        });

        queue.allArray(scenes, runscenegroupsid, {'event_succ':console.log}).then(function(){
            console.log('遍历完成');
        });
        queue.start();

        res.send('正在修改');
    });
});

function runscenegroupsid(obj){

    var q = queuefun.Q;
    var deferred = q.defer();
    var id = obj.id;
    if(isNaN(obj.groups_id)){
        var groups_id = JSON.parse(obj.groups_id)[0];
    }else{
        var groups_id = obj.groups_id;
    }
    

    if(!groups_id){
        deferred.resolve();
        return;
    }

    db.Scenes.update({
        group_id: groups_id
    },{
        where: {
            id: id
        }
    }).then(function(up){

        deferred.resolve();
        return;
    });
    return deferred.promise;
}


router.get('/rungroupvisited', function(req, res){

    db.Groups.findAll({
        attributes: ['id','scenes_id'],
        show: {
            $gt: 0
        },
        scenes_id: {
            $ne: '[]'
        }
    }).then(function(groups){

        console.log('groups.length'+groups.length)

        var queue = new Queue(1,{
            event_err: function(err){},  //失败
            event_succ: function(){}
        });

        queue.allArray(groups, turnvisited, {'event_succ':console.log}).then(function(){
            console.log('遍历完成');
        });
        queue.start();

        res.send('正在修改');
    });
});


function turnvisited(obj){

    var q = queuefun.Q;
    var deferred = q.defer();
    var id = obj.id;
    var scenes_id = JSON.parse(obj.scenes_id);

    console.log('scenes_id'+scenes_id);

    db.Scenes.findAll({
        where: {
            show: {
                $gt: 0
            },
            id: {
                $in: scenes_id
            }
        }
    }).then(function(scenes){

        if(!scenes||scenes.length==0){
            deferred.resolve();
            return;
        }


        var visited = 0;

        for(var i in scenes){
            visited += scenes[i].visited;
        }

        console.log('哈哈的卡还是道路卡手机端'+visited);

        db.Groups.update({
            visited: visited
        },{
            where: {
                id: id
            }
        }).then(function(up){
            if(!up){
                deferred.reject(new Error('更新数据库失败'));
            }else{
                deferred.resolve();
            }
        });
    });
    return deferred.promise;
}

module.exports = router;
