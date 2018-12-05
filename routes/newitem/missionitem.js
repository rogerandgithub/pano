var express = require('express');
var router = express.Router();
var config= require('../config');
var db= require('../model');
var utils= require('../utils');
var session = require('express-session');
var request = require('request');


router.get('/login',function(req,res){

    req.session.userid = undefined;
    var r = {};

    res.render('new/mission-login', r);

});

router.post('/',function(req,res){
    var data = req.body;
    var start_mission = req.body.start_mission;
    data['user_id'] = req.session.user;
    console.log(data);
    console.log(start_mission);
    db.Missions.create(data).then(function(mission){
        res.json({code:0,msg:'Success',mission:mission})  
    });
});

router.get('/',function(req,res){

    if(!req.session.user){
        res.redirect('/mission/login');
        return;
    }

    res.render('new/submit', {});
});

router.get('/data',function(req,res){

    if(!req.session.user){
        res.redirect('/mission/login');
        return;
    }
    db.Users.findOne({
        attributes: ['name','level'],
        where: {
            id: req.session.user
        }
    }).then(function(user){

        db.Missions.findAll({
            where: {
                user_id: {
                    $ne: 0
                }
            },
            order: 'createdAt DESC'
        }).then(function(lists){

            if(!lists)lists = [];
            res.json({
                user: user,
                lists: lists
            });

        });
    })

});

router.post('/update',function(req,res){
    if(!req.session.user){
        res.redirect('/mission/login');
        return;
    }
    var require = req.body.require;
    var id = req.body.id;
    db.Missions.update({
        require:require
    },{
        where:{
            id:id
        }
    }).then(function(result){
        if(!result){
            res.json({code:-96,msg:'update failed!'});
            return;
        }
        res.json({code:1,msg:'更新成功'});
        return;
    })
});

router.post('/delete',function(req,res){

    if(!req.session.user){
        res.redirect('/mission/login');
        return;
    }
    var id = req.body.id;
    db.Missions.destroy({
        where:{
            id:id
        }
    }).then(function(result){
        if(!result){
            res.json({code:-98,msg:'Delete Failed'});
            return;
        }
        res.json({code:1,msg:'删除成功'});
        console.log(result);
        return;
    })

});

router.post('/updatedata',function(req,res){

    if(!req.session.user){
        res.json({code:-98,msg:'you'});
        return;
    }
    var status = req.body.status;
    var id = req.body.id;
    console.log(status);
    if(status==1){
        var start_mission = req.body.start_mission;
        var data = {
            status:status,
            start_mission:start_mission
        }
    }else{
        var data = {
            status:status
        }
    }
    console.log(start_mission);
    db.Missions.update(data,{
        where:{
            id:id
        }
    }).then(function(result){
        if(!result){
            res.json({code:-98,msg:'Failed'});
            return;
        }
        res.json({code:1,msg:'更新成功'});
        return;
    });

});

module.exports= router;
