var config = require('./config');
var nodegrass = require('nodegrass');
var deadline = 0;
var access_token= 0;
var ticket_deadline= 0;
var jsapi_ticket= 0;

var gettoken = module.exports.checktoken=function (next){
    if(deadline-new Date().valueOf()<60*5*1000){
        nodegrass.get("https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid="+config.AppID+"&secret="+config.AppSecret,function(data,status,headers){
            var data=JSON.parse(data);
            deadline=data.expires_in*1000+new Date().valueOf();
            access_token=data.access_token;
            console.log("刷新token "+access_token);
            module.exports.deadline=deadline;
            module.exports.access_token=access_token;
            next(access_token);
        },'utf-8').on('error', function(e) {
            console.log("Got error: " + e.message);
            res.json({code:-1,msg:'unknown'});
        });
    }else{
        //console.log((deadline-new Date().valueOf())/1000+'s 刷新token');
        module.exports.deadline=deadline;
        module.exports.access_token=access_token;
        next(access_token);
    }
};


module.exports.checkticket=function(next){
    if(ticket_deadline-new Date().valueOf()<60*5*1000){
        gettoken(function(token){
            nodegrass.get("https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token="+access_token+"&type=jsapi",function(data,status,headers){
                var data=JSON.parse(data);
                console.log(data);
                ticket_deadline=data.expires_in*1000+new Date().valueOf();
                jsapi_ticket=data.ticket;
                console.log("刷新ticket "+jsapi_ticket);
                exports.ticket_deadline=ticket_deadline;
                exports.jsapi_ticket=jsapi_ticket;
                next(jsapi_ticket);
            },'utf-8').on('error', function(e) {
                console.log("Got error: " + e.message);
                res.json({code:-1,msg:'unknown'});
            });
        });
        
    }else{
        //console.log((ticket_deadline-new Date().valueOf())/1000+'s 刷新ticket');
        exports.ticket_deadline=ticket_deadline;
        exports.jsapi_ticket=jsapi_ticket;
        next(jsapi_ticket);
    }
};
