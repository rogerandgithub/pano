/**
    该插件用于页面的统计
    插件作者：muwenhu
    创作时间：2016-03-22
*/
;(function(){

	var statistics = {
		config:{
			addViewUrl: '/statistics/addView', 
			cookieDays: 0,//0为一年，单位为天数
		},
		//统计浏览量方法
		addView:    function(page_id, module, is_scene){
			$.ajax({
				url: 'http://chaxun.1616.net/s.php?type=ip&output=json', 
				type: 'GET',
				dataType:"jsonp",
				success: function(res){
						console.log(res);
						// $.ajax({
						// 	url: 'http://api.map.baidu.com/location/ip?ak=Nxg5PYmKxSCSLSRqbcMsVR2ShjAX1kOi', 
						// 	type: 'GET',
						// 	dataType:"jsonp",
						// 	success: function(bdres){
								// console.log(bdres);
								var data = {
									page_id: page_id,
									time:    parseInt(Date.now()/1000),
									userid:  statistics.getCookie('cookieid'),
									preurl:  document.referrer.split('?')[0],
									viewurl: document.location.href,
									module:  module||'location',
									ip: res.Ip,
									isp: res.Isp
								};
								if(is_scene)data.svisited=1;
								$.post(statistics.config.addViewUrl, data, function(response){
									console.log(response.msg);
								});
							// }
						// });

				},
				error: function(res){
					console.warm(res);
				}
			});
		},
		setCookie:  function(name, value){
			var Days = statistics.config?statistics.config:365;
			var exp = new Date();
			exp.setTime(exp.getTime() + Days*24*60*60*1000);
			document.cookie = name + "="+ escape (value) + ";expires=" + exp.toGMTString();
		},
		getCookie:  function(name){
			var arr = document.cookie.split(';');
			var value;
			for(var i = 0; i<arr.length; i++){
				var val = arr[i].split('=')[0].replace(/(^\s*)/g,"");
				if(val==name){
					value = arr[i].split('=')[1];
				}
			}
			if(!value && name=='cookieid'){
				var userid = Date.now()+parseInt(Math.random()*100);
				statistics.setCookie('cookieid', userid);
				value = userid;
			}
			return value;
		},
		startTime: parseInt(Date.now()/1000)
	};

	//将对象暴露到全局
	window.statistics = statistics;
})();
