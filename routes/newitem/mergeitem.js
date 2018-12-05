var express = require('express');
var router = express.Router();
var db= require('../model');
var xss= require('xss');
var utils= require('../utils');
var config= require('../config');
var nodegrass = require('nodegrass');
var when = require('when');



/* GET home page. */
router.get('/', function(req, res) {
    var r = {};

    utils.autologin(req, res, function(userid){
        utils.getexpire(userid).then(function(expire){
            db.Users.findOne({
                where:{
                    id: userid
                }
            }).then(function(user){
                r.user = user;
                r.expire = expire;
                res.render('newitem/merge', r);
            })
        });
    });
});

router.get('/json',function(req, res){

    utils.autologin(req, res, function(userid){

        var r = {};
        var userinfoarr = {};

        db.MultiPro.findAll({
            where: {
                user_id: userid,
                show: 1,
                groups_id: {
                    $ne: '[]'
                }
            },
            order: 'createdAt DESC'
        }).then(function(MultiPros){

            r.lists = JSON.parse(JSON.stringify(MultiPros));

            var groups_id = [];

            for(var i in r.lists){
                r.lists[i].groups = [];
                r.lists[i].groups_id = JSON.parse(r.lists[i].groups_id);
                groups_id = groups_id.concat(r.lists[i].groups_id);
            }; 

            db.Groups.findAll({
                where: {
                    id: {
                        $in: groups_id
                    }
                }
            }).then(function(groups){

                if(!groups||groups.length == 0){
                    res.json({code:-97,msg:'failed'});
                    return;
                };

                var groups = JSON.parse(JSON.stringify(groups));

                var scenes_id = [];
                for(var i in groups){
                    groups[i].scenes_id = JSON.parse(groups[i].scenes_id);
                    scenes_id = scenes_id.concat(groups[i].scenes_id);
                };

                db.Scenes.findAll({
                    attributes: ['id','key','type','scenestyle'],
                    where: {
                        id: {
                            $in: scenes_id
                        },
                        show: {
                            $gt: 0
                        }
                    }
                }).then(function(scenes){

                    if(!scenes){
                        res.json({code:-90,msg:'failed'});
                        return;
                    };

                    for(var i in groups){
                        groups[i].scenes = [];
                        for(var j in scenes){
                            groups[i].thumbsrc = utils.getThumbSrc(scenes[i].type,scenes[i].key,scenes[i].scenestyle);
                            if(groups[i].scenes_id.indexOf(scenes[j].id) != -1){
                                groups[i].scenes.push(scenes[j]);
                            }
                        }
                    }

                    for(var i in r.lists){
                        for(var j in groups){
                            if(r.lists[i].groups_id.indexOf(groups[j].id+'') != -1){
                                r.lists[i].groups.push(groups[j]);
                            }
                        }
                    }

                    res.json(r);
                });
            });
        });
    });
});

router.post('/delmerge',function(req, res){
    var id = req.body.id;
    var deletepsw = utils.hex_sha1('muwenhu'+req.body.deletepsw);
    db.MultiPro.findOne({
        where: {
            id: id
        }
    }).then(function(mul){
        if(!mul){
            res.json({code:-77,msg:'No such merge'});
            return;
        }
        utils.autologin(req, res, function(userid){
            db.Users.findOne({
                where: {
                    id: userid
                }
            }).then(function(user){
                if(!user){
                    res.json({code:-65,msg:'No such user'});
                    return;
                }
                if(user.deletepsw == deletepsw){
                    db.MultiPro.update({
                        show: 0
                    },{
                        where: {
                            id: id
                        }
                    }).then(function(u){
                        if(!u){
                            res.json({code:-33,msg:'Delete failed'});
                            return;
                        }
                        res.json({code:0,msg:'Delete success'})
                    })
                }else{
                    res.json({code:-1,msg:'Password erro'});
                }
            })
        })
    })
});

router.post('/delgroup',function(req, res){
    var groupid = req.body.groupid;
    var mergeid = req.body.mergeid;

    db.MultiPro.findOne({
        where: {
            id: mergeid
        }
    }).then(function(mul){
        if(!mul){
            res.json({code:-33,msg:'failed'});
            return;
        }
        var groups_id = JSON.parse(mul.groups_id);
        var index = groups_id.indexOf(groupid);
        groups_id.splice(index,1);
        db.MultiPro.update({
            groups_id: JSON.stringify(groups_id),
            show: groups_id.length?1:0
        },{
            where: {
                id: mergeid
            }
        }).then(function(up){
            if(!up){
                res.json({code:-77,msg:'Delete failed'});
                return;
            }
            res.json({code:0,msg:'Delete success'});
        })
    })
});

router.get('/getmerge/:mergeid',function(req, res){
    var mergeid = req.params.mergeid;
    db.MultiPro.findOne({
        where: {
            id: mergeid
        }
    }).then(function(mul){
        if(!mul){
            res.json({code:-55,msg:'failed'});
            return;
        }
        var groups_id = JSON.parse(mul.groups_id);
        db.Groups.findAll({
            where: {
                id: {
                    $in: groups_id
                },
                show: {
                    $gt: 0
                }
            },
            attributes: ['id','key','user_id','city','region','community','building','room','floor','total_floor','face','area']
        }).then(function(groups){
            if(!groups){
                res.json({code:-36,msg:'No such groups'});
                return;
            }
            res.json({code:0,msg:'success',merges:groups});
        })
    })
})

module.exports = router;
