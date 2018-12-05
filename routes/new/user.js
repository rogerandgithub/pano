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

			var r = {};
			r.is_default_psw = user.password == 'c9864ec14551d5f6a7ad1f5ac12b4fb89f4a4b80';

		    res.render('new/user', r);
		});
	})
});

router.get('/info', function(req, res){

    utils.login(req, res, function(userid){

        utils.getexpire(userid).then(function(expire){

            utils.getuserinfo(userid).then(function(user){

                var r = {code:0,user:user};
                r.user.expire = expire;
                res.json(r);

            });
        });
    });
});

router.get('/logs', function(req, res){

	utils.login(req, res, function(userid){

		utils.getChildrenUsers(userid).then(function(users){
			
			db.Action_log.findAll({
				where: {
					user_id: {
						$in: users
					}
				},
				order: 'id ASC'
			}).then(function(logs){
				res.json(logs);
			});
		});
	});
});

module.exports= router;
