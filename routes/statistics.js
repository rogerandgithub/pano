var express = require('express');
var router  = express.Router();
var db      = require('./model');
var utils   = require('./utils');
var request = require('request');


router.post('/addView', function(req, res){

	var page_id = req.body.page_id||'';

	var data = {
		user_id: req.body.userid||req.cookies.stiid,
		preurl:  req.headers.referer,
		viewurl: req.body.viewurl,
		module:  req.body.module||'global',
		ip:      req.body.ip,
		isp:     req.body.isp||''
	}

	var ipapiurl = 'http://apis.baidu.com/apistore/iplookupservice/iplookup?ip='+data.ip;
	
	request.get({
		url: ipapiurl,
		headers: {
			apikey:'5143027707684af3ebd3707303c62616'
		}
	}, function(err, response, body){
		if(err){
			res.json({code:-51,msg:'获取IP信息时发生了错误', errmsg:err});
			return;
		}

		var ipdata = JSON.parse(body);
		if (ipdata.errNum==0) {
			data.isp = JSON.stringify(ipdata.retData)||data.isp;
		};

		var condition={};
		if(data.ip){
			condition.ip = data.ip
		}else{
			condition.user_id = data.user_id;
		}

		db.Datas.findOne({
			where:condition
		}).then(function(old_data){

			if(!old_data){
				var viewObj = {};
				viewObj[page_id] = {};

				db.Scenes.findOne({
					where:{
						id: page_id
					}
				}).then(function(scene){

					if(req.body.svisited){
						scene&&scene.visited?viewObj[page_id].svisited=scene.visited+1:viewObj[page_id].svisited=1;
					}
					
					viewObj[page_id][data.module]=1;

					data.viewdata=JSON.stringify(viewObj);

					db.Datas.create(data).then(function(new_data){
						res.json({code:0,msg:'创建数据成功！'});
						return;
					});
				});

			}else{
				var viewObj = JSON.parse(old_data.viewdata);

				if(!viewObj[page_id])viewObj[page_id]={};

				// viewObj[page_id].global++;
				// if(data.module!='global'){
					viewObj[page_id][data.module]?
					viewObj[page_id][data.module]++:
					viewObj[page_id][data.module]=1;
				// }

				if(req.body.svisited){
					viewObj[page_id].svisited?viewObj[page_id].svisited+=1:viewObj[page_id].svisited=1;
				}

				db.Datas.update({
					viewdata: JSON.stringify(viewObj)
				},{
					where:{
						id: old_data.id
					}
				}).then(function(new_data){
					res.json({code:0,msg:'数据更新成功'});
					return;
				});
			}
		});
	});
});

module.exports = router;