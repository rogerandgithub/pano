var express = require('express');
var router = express.Router();
var db= require('../model');
var xss= require('xss');
var utils= require('../utils');

var config= require('../config');

/* GET home page. */
router.get('/', function(req, res) {
	
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

                db.Groups.findAll({
                	where: {
                		user_id: r.user.id,
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
	                		r.cgs = JSON.stringify(cgs);
                			res.render('newitem/index',r);
                		});
                	}else{
                		r.cgs = JSON.stringify(cgroups);
                		res.render('newitem/index',r);
                	}
                })
            });
	    });
    }else{
        res.redirect('newitem/login');
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

module.exports = router;
