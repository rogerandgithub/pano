var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var nodemailer = require('nodemailer');

var _ = require("underscore");
var wechat = require('./routes/wechat');
var routes = require('./routes/index');
var upload = require('./routes/upload');
var login = require('./routes/login');
var settings = require('./routes/settings');
var works = require('./routes/works');
var maps = require('./routes/maps');
var config = require('./routes/config');
var romaing = require('./routes/romaing');
var master = require('./routes/master');
var tools = require('./routes/tools');
var logo = require('./routes/logo');
var scene= require('./routes/scene');
var resetpwd= require('./routes/resetpwd');
var management= require('./routes/management');
var downloads= require('./routes/downloads');
var download= require('./routes/download');
var olds= require('./routes/olds');
var trademarks = require('./routes/trademarks');
var api = require('./routes/api');
var upload12 = require('./routes/upload12');
// var statistics = require('./routes/statistics');
var supermaster = require('./routes/supermaster');
var web = require('./routes/web');
var mobile = require('./routes/mobile');

var uploads = require('./routes/new/uploads');

var lastitem = require('./routes/newitem/newitem');
var indexitem = require('./routes/newitem/indexitem');
var panoitem = require('./routes/newitem/panoitem');
var mergeitem = require('./routes/newitem/mergeitem');
var scenesitem = require('./routes/newitem/scenesitem');
var tokenitem = require('./routes/newitem/tokenitem');
var setitem = require('./routes/newitem/setitem');
var useritem = require('./routes/newitem/useritem');
var missionitem = require('./routes/newitem/missionitem');
var submititem = require('./routes/newitem/submititem');
var uploadsitem = require('./routes/newitem/uploaditem');
var appitem = require('./routes/newitem/appitem');

var app = express();
// app.listen(80);

app.all('*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
    res.header("X-Powered-By",' 3.2.1')
    // res.header("Content-Type", "application/json;charset=utf-8");
    next();
});




var session = require('express-session');
var RedisStore = require('connect-redis')(session);
var compression= require('compression');
// login

var schedule = require("node-schedule");
var fs = require("fs");
var request = require("request");
var utils = require('./routes/utils');
//mission

// view engine setup 第一次从服务器提交
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

var response = express.response,
    _render = response.render;
    
response.render = function (view, options, callback) {
    options = options || {};
    _.extend(options, {
            cdnImagesPath:config.cdnImagesPath,
            cdnHttpsDomain: config.cdnHttpsDomain,
            cdnJsPath:config.cdnJsPath,
            cdnCssPath:config.cdnCssPath,
            libVersion:config.libVersion,
            version:config.version,
            serverDate:new Date().valueOf()
    });
    _render.call(this, view, options, callback);
};

app.use(logger('dev'));
app.use(compression());
// app.use(bodyParser.json());
app.use(bodyParser({limit : "10000kb"}));  
// app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));



app.use(session({
    resave: false,
    saveUninitialized: true,
    store: new RedisStore({
        port: "6379",
        host: "127.0.0.1",
        pass:'duanzhouwangsuteng^_^'
    }),
    rolling: true,
    secret: 'suteng_login',
    cookie: {
        maxAge: 60 * 1000 * 60 * 7
    }
}));//session setup

if(config.serverName!='LOCAL'){
    // app.use(require('./routes/wechattoken').checktoken);
    // app.use(require('./routes/wechattoken').checkticket);
    // app.use('/wechat', wechat);
}
// app.use(require('./routes/auth').loginFilter);
app.use('/login',login);
app.use('/api',api);
app.use('/wechat', wechat);
app.use('/romaing',romaing);
app.use('/master',master);
app.use('/settings',settings);
app.use('/', olds);
app.use('/', routes);
app.use('/scene', scene);
app.use('/resetpwd', resetpwd);
app.use('/downloads', downloads);
app.use('/download', download);
app.use('/tools', tools);
app.use('/logo', logo);
app.use('/upload', upload);
app.use('/works', works);
app.use('/maps', maps);
app.use('/management', management);
app.use('/trademarks', trademarks);
app.use('/upload12', upload12);
// app.use('/statistics', statistics);
app.use('/supermaster', supermaster);
app.use('/uploads', uploads);

app.use('/newitem', lastitem);
app.use('/indexitem', indexitem);
app.use('/panoitem', panoitem);
app.use('/mergeitem', mergeitem);
app.use('/tokenitem', tokenitem);
app.use('/setitem', setitem);
app.use('/scenesitem', scenesitem);
app.use('/useritem', useritem);
app.use('/missionitem', missionitem);
app.use('/submititem', submititem);
app.use('/uploadsitem', uploadsitem);
app.use('/appitem', appitem);
app.use('/web', web);
app.use('/mobile', mobile);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// will print stacktrace
app.use(function(err, req, res, next) {
    if(err.status == 404){
        if(req.headers["x-requested-with"] != "XMLHttpRequest"){
            res.status(404).render('404');
        }
        // else{
        //     res.status(404).json(err);
        // }
    // }else{
    //     res.status(500).json({
    //         message: err.message,
    //         error: err
    //     });
    }
});

app.on('error',function(e){
    console.log('----------------------', e);
});

fs.exists('usersdata.js', function(exists){
    if(!exists){
        utils.savefile();
    }
});

// var rule = new schedule.RecurrenceRule();
// rule.dayOfWeek = [0, new schedule.Range(1, 6)];
// rule.hour = 3;
// rule.minute = 0;
// var j = schedule.scheduleJob(rule, function(){
//     utils.savefile();
// });


// schedule.scheduleJob('* * 23 * * *', function(){
//     start_upload();
// });


// start upload


// function start_upload(){
//     request({
//         url: '/tokenitem/start_upload'
//     },function(data, status, headers){
//         var transporter = nodemailer.createTransport({
//             service: 'qq',
//             auth: {
//                 user: '735377408@qq.com', //这里填自己的 qq号
//                 pass: 'mulgasetnmrcbfdi' //授权码,通过QQ邮箱获取
//             }
//         });
//         var mailOptions = {
//             from: '735377408@qq.com', // 发送者  asdfghj
//             to: ['735377408@qq.com'], // 接受者,可以同时发送多个,以逗号隔开
//             subject: 'start upliad',
//             text: 'uploading...' // 文本  
//         };
//         transporter.sendMail(mailOptions, function(err, info) {
//             if (err) throw err;
//         });
//     });
// }

Date.prototype.Format = function (fmt) {
    var o = {
        "M+": this.getMonth() + 1,
        "d+": this.getDate(),
        "h+": this.getHours(),
        "m+": this.getMinutes(),
        "s+": this.getSeconds(),
        "q+": Math.floor((this.getMonth() + 3) / 3),
        "S": this.getMilliseconds()
    };

    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
        if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
}

utils.redis.set('upNum', 0);

// var fundebug = require("fundebug-nodejs");
// fundebug.apikey="43b0988d9b5e801bbe7b5a219644b957b3c776534f7098ca88b2c7776e8cc475";
// app.use(fundebug.ExpressErrorHandler);

module.exports = app;