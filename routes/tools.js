var express = require('express');
var router = express.Router();
var config= require('./config');
var db= require('./model');
var when = require('when');
var utils= require('./utils');


router.get('/player', function(req, res){
    
    res.render('player',{});
});

//统计房源数量
router.post('/count_all',function(req,res){
    var where;
    try{
        where=JSON.parse(req.body.where);
    }catch(e){
        res.json({msg:'解析错误',code:-2});
        return;
    }
    var groupby=req.body.groupby;

    if(!where||!where.city||!(groupby=='region'||groupby=='business_circle'||groupby=='community')){
        res.json({msg:'错误',code:-3});
        return;
    }
    for(var i in where){
        if(i!='region'&&i!='business_circle'&&i!='community'&&i!='city'){
            res.json({msg:'错误',code:-4});
            return;
        }
    }
    if(groupby=='community'&&!where.business_circle&&!where.region){
        res.json({msg:'错误',code:-5});
        return;
    }

    where.show={gte:10};
    where.scenes_id={ne:'[]'};
    utils.getChildrenUsers(req.session.user).then(function(users){
        where.user_id={
            in:users
        }

        var attrs=[groupby];
        if(groupby=='community'){
            attrs.push('lat');
            attrs.push('lng');
        }
        var condition={
            attributes:attrs,
            where:where,
            group:groupby
        };

        db.Groups.count(condition).then(function(r){
            res.json({msg:'ok',code:0,result:r});
        });
    });
});

router.get('/exports',function(req,res){
    if(!req.query.starttime||!req.query.endtime){
        res.render('exports',{});
        return;
    }

    var gid2info={};
    var groups,scenes;

    //if(new Date().valueOf()-new Date(req.query.starttime).valueOf()>60*1000*60*24*8||new Date().valueOf()-new Date(req.query.endtime).valueOf()>60*1000*60*24*8){
    if(new Date(req.query.endtime).valueOf()-new Date(req.query.starttime).valueOf()>60*1000*60*24*30){
        res.json({code:-1,msg:'只能导出周期为一个月内的数据,若要导出历史数据请把开始时间结束时间同时调前'});
        return;
    }
    utils.getChildrenUsers(req.session.user).then(function(users){
        db.Groups.findAll({
            where:{
                scenes_id:{
                    ne:'[]'
                },
                show:{
                    gte:10
                },
                user_id:{
                    in:users
                },
                createdAt:{
                    gte:req.query.starttime,
                    lte:req.query.endtime
                }
            }
        }).then(function(g){
            groups=g;
            var sids=[];
            for(var i in groups){
                sids.push(JSON.parse(groups[i].scenes_id)[0]);
                gid2info[groups[i].id+'']={
                    building:groups[i].building,
                    room:groups[i].room,
                    group_key:groups[i].key
                }
            }
            return db.Scenes.findAll({
                where:{
                    id:{
                        in:sids
                    }
                }
            });
        }).then(function(scenes){
            for(var i in scenes){
                var gid=JSON.parse(scenes[i].groups_id)[0];
                if(gid2info[gid+'']){
                    gid2info[gid+''].key=scenes[i].key;
                    gid2info[gid+''].introduction=scenes[i].introduction;
                    gid2info[gid+''].name=scenes[i].name;
                    gid2info[gid+''].time=scenes[i].createdAt;
                    gid2info[gid+''].user=scenes[i].user_id;
                    gid2info[gid+''].visited=scenes[i].visited;
                    gid2info[gid+''].url='http://wx.sz-sti.com/scene?key='+scenes[i].key+'&hideheader=1';
                }else{
                    delete(gid2info[gid+'']);
                }
            }

            var exports="<table><tbody><tr><td>楼号</td><td>房号</td><td>group_key</td><td>key</td><td>简介</td><td>地点</td><td>时间</td><td>账号</td><td>浏览量</td><td>地址</td></tr>";
            for(var i in gid2info){
                exports+='<tr>';
                for(var j in gid2info[i]){
                    exports+='<td>'+gid2info[i][j]+'</td>';
                }
                exports+='</tr>';
            }
            exports+='</tbody></table>';
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.write('<head><meta charset="utf-8"/></head>');
            res.write(exports);
            res.end();
        });
    });
});

router.get('/check_firmware',function(req,res){
    res.json({
        version:'1.0',
        download_url:'http://qncdn.sz-sti.com/app/scanner360_V1.0.ipk',
        file_length:'5880'
    });
});
module.exports= router;
