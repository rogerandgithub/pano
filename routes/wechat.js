var config = require('./config');
var express = require('express');
var router = express.Router();
var nodegrass = require('nodegrass');
var token = require('./wechattoken');
var utils = require("./utils");

router.post('/jsapi',function(req,res){
    token.checkticket(function(jsapi_ticket){
        console.log(req.body.url)
        if(!req.body.url){
            res.json({code: -9, msg: 'error'});
            return;
        }
        console.log(22222222222222222)
        var date=parseInt(new Date().valueOf()/1000);
        var noncestr='suteng';
        var signature=utils.hex_sha1(
            'jsapi_ticket='+token.jsapi_ticket+
            '&noncestr='+noncestr+
            '&timestamp='+date+
            '&url='+req.body.url);
        res.json({
            timestamp: date,
            noncestr: noncestr,
            signature: signature
        });
    });
});

module.exports= router;
