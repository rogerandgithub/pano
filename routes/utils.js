var db = require('./model');
var redis = require('redis');
var client = redis.createClient(6379, 'localhost');
client.auth('duanzhouwangsuteng^_^');
var fs = require("fs");
var when = require('when');
var request = require('request');
var config = require('./config');


exports.md5 = function (data) {
    var Buffer = require("buffer").Buffer;
    var buf = new Buffer(data);
    var str = buf.toString("binary");
    var crypto = require("crypto");
    return crypto.createHash("md5").update(str).digest("hex");
}

exports.client = client;

exports.distance3D = function(a,b,c,d,e,f){
    return Math.pow((a-d)*(a-d)+(b-e)*(b-e)+(c-f)*(c-f),0.5);
};

exports.updatefile = function(){
    fs.readFile()
};

exports.updatelog = function(req, log){

    request({
        url: 'http://apis.baidu.com/showapi_open_bus/ip/ip?ip='+log.ip,
        headers: {
            apikey: '5143027707684af3ebd3707303c62616'
        }
    },function(error, response, data){

        try{
            var data = JSON.parse(data);
            log.region = data.showapi_res_body.region;
            log.city = data.showapi_res_body.city;
        }catch(err){
            log.region = '未查到';
            log.city = '未查到';
        }


        db.Action_log.create(log).then(function(nlog){
            console.log('Action_log updated succeed');
        });
    });
};

exports.getexpire = function(userid){

    return db.Users.findOne({
        where:{
            id: userid
        }
    }).then(function(user){

        var expire = user.expiredate;
        if(Date.parse(expire)==0){

            return db.Users.findOne({
                where:{
                    id:user.father
                }
            }).then(function(father){
                if(father){
                    expire = father.expiredate;
                }
                return expire;
            });
        }else{
            return expire;
        }
    });
};

exports.getsharable = function(username){

    return db.Users.findOne({
        where: {
            name: username
        }
    }).then(function(user){

        if(!user){
            return [];
        }

        var sharable = JSON.parse(user.children);

        return db.Users.findOne({
            where: {
                id: user.father
            }
        }).then(function(father){

            if(father&&father.agent != 1){
                var brother = JSON.parse(father.children);
                brother.splice(brother.indexOf(user.id), 1);
                sharable = sharable.concat(brother);
                sharable.push(father.id);
            }

            return db.Users.findAll({
                attributes: ['id', 'name'],
                where: {
                    id: {
                        $in: sharable
                    }
                }
            })
        })
    });
};


exports.getuserdetail = function(userid){

    return db.Users.findOne({
        attributes: ['id', 'name', 'children', 'createdAt', 'itcmstertel'],
        where:{
            id: userid
        }
    }).then(function(user){

        var children_arr = JSON.parse(user.children);
        return db.Users.findAll({
            attributes: ['id', 'name', 'children', 'createdAt', 'itcmstertel'],
            where:{
                id: children_arr
            }
        }).then(function(new_children){

            var childarr = [];
            var querys=[];

            for(var ui in new_children){
                childarr.push(new_children[ui]);
                if(new_children[ui].children != '[]')
                    querys.push(db.Users.findAll({
                        attributes: ['id', 'name', 'children', 'createdAt', 'itcmstertel'],
                        where: {
                            id: {
                                $in: JSON.parse(new_children[ui].children)
                            }
                        }
                    }))
            }

            if(querys.length>0){
                return when.all(querys).then(function(result){
                    for(var ri in result){
                        for(var i in result[ri]){
                            childarr.push(result[ri][i]);
                        }
                    }

                    user.dataValues.childarr = childarr;
                    return user;
                });
            }else{
                user.dataValues.childarr = childarr;
                return user;
            }
        });
    });
};

exports.getuserinfo = function(userid){

    return db.Users.findOne({
        attributes: ['id', 'name', 'children', 'listapi', 'callbackapi','avatar','realname'],
        where:{
            id: userid
        }
    }).then(function(user){

        var children_arr = JSON.parse(user.children);
        return db.Users.findAll({
            attributes: ['id', 'name', 'children'],
            where:{
                id: children_arr
            }
        }).then(function(new_children){

            var children_name = [];
            var querys=[];

            for(var ui in new_children){
                if(children_name.indexOf(new_children[ui].name)==-1)
                    children_name.push(new_children[ui].name);
                if(new_children[ui].children != '[]')
                    querys.push(db.Users.findAll({
                        attributes: ['id', 'name', 'children'],
                        where: {
                            id: {
                                $in: JSON.parse(new_children[ui].children)
                            }
                        }
                    }))
            }

            if(querys.length>0){
                return when.all(querys).then(function(result){
                    for(var ri in result){
                        for(var i in result[ri]){
                            if(children_name.indexOf(result[ri][i].name)==-1)
                                children_name.push(result[ri][i].name);
                        }
                    }

                    user.dataValues.children_name = children_name;
                    return user;
                });
            }else{
                user.dataValues.children_name = children_name;
                return user;
            }
        });
    });
};

exports.savefile = function(func){

    var itemnum = 20;

    db.Users.findAll({

        attributes: ['id', 'nickname', 'name', 'createdAt', 'updatedAt', 'level', 'expiredate', 'children', 'father'],
        where:{
            id: {
                $gt:1
            },
            password: {
                $ne:'wechat'
            }
        }

    }).then(function(r){

        if(r===false){return false;} 
        var u=[];
        for(var i in r){
            u.push(r[i].id);
        }

        db.Groups.findAll({
            where:{
                $and:[
                    {user_id:{$in:u}},
                    {user_id:{$gt:1}}
                ]
                
            }
        }).then(function(romaings){

            for(var j in r){

                if(r[j].dataValues.uploads==undefined)r[j].dataValues.uploads=0;
                if(r[j].dataValues.week_up==undefined)r[j].dataValues.week_up=0;
                if(r[j].dataValues.day_up==undefined)r[j].dataValues.day_up=0;

                for(var i in romaings){

                    if (romaings[i].user_id == r[j].id) {

                        r[j].dataValues.uploads?r[j].dataValues.uploads++:r[j].dataValues.uploads=1;
                        r[j].dataValues.createdAt = romaings[i].createdAt;

                        var date = new Date(romaings[i].createdAt);
                        date = date.getTime();
                        var now = Date.now();
                        var todaytime = now - Date.parse((new Date(Date.now())).toLocaleDateString());
                        if ( now - date - todaytime < 7*24*60*60*1000 ) {
                            r[j].dataValues.week_up++;
                            if ( now - date - todaytime < 24*60*60*1000 ) {
                                r[j].dataValues.day_up++;
                            };
                        };
                    };
                }
            }

            //重新计算母账户的上传数量
            for (var i in r) {
                if(r[i].level>1){
                    for (var j in r) {
                        if(r[j].father == r[i].id){
                            r[i].dataValues.uploads += r[j].dataValues.uploads;
                            r[i].dataValues.week_up += r[j].dataValues.week_up;
                            r[i].dataValues.day_up += r[j].dataValues.day_up;
                        }
                    };
                }
            };

            r.sort(function(a,b){
                return b.dataValues.uploads-a.dataValues.uploads;
            });

            //分页
            var result={
                count:r.length,
                pagenums:Math.ceil(r.length/itemnum),
                users:r,
                lasttime:new Date().toLocaleDateString()
            }

            fs.writeFile('usersdata.js', JSON.stringify(result), function(err){
                if(err)console.log(err);
                console.log('File Saved!');
                if(func){
                    func();
                }
            });
        })
    });   
};

exports.getUA = function getUA(req){

    var r = '';
    exports.getPlatform(req).indexOf('pc') == -1?r+='mobile-':r+='pc-';

    var ua=req.headers['user-agent'];
    if(!ua){
        return r+'server';
    }
    if(req.query&&req.query.platform&&(req.query.platform=='android-app'||req.query.platform=='ios-app'||req.query.platform=='iPhone-app'||req.query.platform=='iPad-app')){
        return r+req.query.platform;
    }

    if(ua.indexOf('UC')>=0){
        r+='UC';
    }else if(ua.indexOf('360')>=0||(exports.getPlatform(req).indexOf('pc-ie')!=-1&&exports.getPlatform(req).indexOf('Chrome')!=-1)){
        r+='360';
    }else if(ua.indexOf('MetaSr')>=0){
        r+='sougou';
    }else if(ua.indexOf('Maxthon')>=0){
        r+='Aoyou';
    }else if(ua.indexOf('MicroMessenger')>=0){
        r+='Wechat';
    }else if(ua.indexOf('MQQBrowser')>=0){
        r+='mQQ';
    }else if(ua.indexOf('Tencent')>=0){
        r+='Tencent';
    }else if(ua.indexOf('Firefox')>=0){
        r+='Firefox';
    }else if(ua.indexOf('Opera')>=0){
        r+='Opera';
    }else if(ua.indexOf('Chrome')>=0){
        r+='Chrome';
    }else if(ua.indexOf('MSIE')>=0||ua.indexOf('Trident')>=0){
        r+='IE';
    }else if(ua.indexOf('Safari')>=0){
        r+='Safari';
    }else{
        r+='other';
    }

    return r;
};

exports.getPlatform = function getPlatform(req){
    var ua=req.headers['user-agent'];
    if(!ua){
        return 'pc-server';
    }
    var r='';
    if(req.query&&req.query.platform&&(req.query.platform=='android-app'||req.query.platform=='ios-app'||req.query.platform=='iPhone-app'||req.query.platform=='iPad-app'||req.query.platform=='pc-ie')){
        return req.query.platform;
    }

    if(ua.indexOf('iPhone')>=0){
        r+='iPhone';
    }else if(ua.indexOf('iPad')>=0){
        r+='iPad';
    }else if(ua.indexOf('Android')>=0){
        r+='android';
    }else {
        r+='pc';
        if(ua.indexOf('MSIE')>=0||ua.indexOf('Trident')>=0){
            r+='-ie'
        }else if(ua.indexOf('Firefox')>=0){
            r+='-firefox';
        }else if(ua.indexOf('Opera')>=0){
            r+='-opera';
        }else if(ua.indexOf('Chrome')>=0){
            var _version=ua.substr(ua.indexOf('Chrome'),9);
            var version='';
            for(var i in _version){
                if(_version[i]>=0&&_version[i]<10){
                    version+=_version[i]+'';
                }
            }
            if(parseInt(version)<32){
                r+='-ie';
            }else{
                r+='-webkit';
            }
        }

        var t=ua.split(')')[0];
        if(t.indexOf('(')>-1){
            t=t.split('(')[1];
        }
        r+='<<'+t+'>>';
    }

    if(req.session&&req.session.user&&req.session.user_type=='wechat'){
        r+='-wechat';
    }
    if(ua.indexOf('Android')>=0&&ua.indexOf('MQQBrowser')>=0){
        r+='-x5';
    }

    if(ua.indexOf('Android')>=0){
        var t=ua.split(')')[0];
        if(t.indexOf('(')>-1){
            t=t.split('(')[1];
        }
        r+='<<'+t+'>>';
    }


    return r;
};

exports.redis = client;

exports.autologin = function(req, res, callback, token1){

    console.log(!!(token1||req.query.token||req.body.token));

    if(token1||req.query.token||req.body.token){

        var token = token1?token1:(req.query.token?req.query.token:req.body.token);

        client.get(token, function(err, val){
            if(err||isNaN(val)||val==0||val==null){
                getsession(req, res, callback);
                return;
            }
            db.Users.findOne({
                where: {
                    id: val
                }
            }).then(function(user){

                var passwd = exports.hex_sha1(exports.md5(user.password+user.id) + '_suteng_qson');
                var passwd1 = exports.hex_sha1(exports.md5(user.password) + '_suteng_qson');

                if(token == passwd){
                    callback(val);
                }else{
                    getsession(req, res, callback);
                    return;
                }
                return;
            });
        });

    }else{
        getsession(req, res, callback);
    }

    function getsession(req, res, callback){

        if(!req.session.user){
                
            var userid = req.cookies.sti_userid;

            if(!userid){
                
                if(exports.getPlatform(req).indexOf('pc')!=-1) {
                    res.redirect('/newitem/login');
                }else{
                    if(req.query.is_new==1){
                        if(req.query.lang=='en'){
                            res.json({msg:'You had logout', code:-98});
                        }else{
                            res.json({msg:'登录过期', code: -98});
                        }
                    }else{
                        return (function(){
                            return false;
                        })();
                    }
                }

            }else{

                client.get(userid, function(err, val){

                    if(!val){
                        if(exports.getPlatform(req).indexOf('pc')!=-1) {
                            res.redirect('/newitem/login');
                        }else{
                            if(req.query.is_new==1){
                                if(req.query.lang=='en'){
                                    res.json({msg:'You had logout',code:-98});
                                }else{
                                    res.json({msg:'登录过期',code:-98});
                                }
                            }else{
                                if(token1||req.query.token||req.body.token){
                                    res.json({msg:'登录过期',code:-98});
                                }else{
                                    return (function(){
                                        return false;
                                    })();
                                }
                            }
                        }
                    }else{
                        db.Users.findOne({
                            where:{
                                id:val
                            }
                        }).then(function(result){
                            if(!result){  
                                if(req.query.lang=='en'){
                                    res.json({msg:'wrong userinfo',code:-98});
                                }else{
                                    res.json({msg:'用户信息有误',code:-98});
                                }
                                return;
                            }
                            req.session.user_type='app';
                            req.session.user=result.id;
                            callback(result.id);
                        });
                    }

                });
            }

        }else{
            callback(req.session.user);
        }
    }
};


exports.login = function(req, res, callback){

    var str = "You don't seem to be logged in.";

    if(!req.session.user){
            
        var userid = req.cookies.sti_userid;

        if(!userid){
            if(req.headers["x-requested-with"] != "XMLHttpRequest") {
                req.session.redirect_url = req.originalUrl;
                res.redirect('/newitem/login');
            }else{
                res.json({code: -98, msg: str});
            }
        }else{

            client.get(userid, function(err, val){

                if(!val){
                    if(req.headers["x-requested-with"] != "XMLHttpRequest") {
                        req.session.redirect_url = req.originalUrl;
                        res.redirect('/newitem/login');
                    }else{
                        res.json({code: -98, msg: str});
                    }
                }else{
                    db.Users.findOne({
                        where:{
                            id:val
                        }
                    }).then(function(result){
                        if(!result){  
                            res.json({msg:'Incorrect user info.',code:-98});
                            return;
                        }
                        req.session.user_type='app';
                        req.session.user=result.id;
                        callback(result.id);
                    });
                }
            });
        }
    }else{
        callback(req.session.user);
    }
};

exports.getThumbSrc = function(type,key,scenestyle){
    var thumbsrc = '';
    if(type == '7'){
        thumbsrc = config.cdnPath + '/normal_thumbs_1.jpg';
    }else if(type == '-1'){
        thumbsrc = config.domainImagesPath + '/pano/pano2T/' + key.split('_')[0] + '/thumb.jpg';
    }else if(type == '18' || type == '19'){
        thumbsrc = config.cdnPath + '/pano/' + key.split('_')[0] + '.jpg?imageMogr2/thumbnail/!40p';
    }else{
        if(key && key.split('_')[0].length == 10){
            thumbsrc = config.cdnPath + '/pano/' + key.split('_')[0] + '.tiles/mobile_f.jpg?imageMogr2/thumbnail/!40p';
        }else{
            thumbsrc = config.cdnPath + '/images/scenes/' + (key?key.split('_')[0]:'') + '/allinone.jpg?imageMogr2/crop/!'+(scenestyle == 3 || scenestyle == 4?'1024x1024a1500a700':'1024x1024a0a0') + '/thumbnail/!40p';
        } 
    }
    return thumbsrc;
}

exports.getNavThumbSrc = function(type,key,scenestyle){
    var thumbsrc = '';
    if(type == '7'){
        thumbsrc = config.cdnPath + '/images/tools/2501.jpg';
    }else if(type == '6'||type == '9'){
        thumbsrc = config.cdnPath + '/pano/'+key.split('_')[0]+'.tiles/mobile_f.jpg?imageMogr2/thumbnail/!20p';
    }else if(type == '5'){
        thumbsrc = config.cdnPath + '/pano/'+key.split('_')[0]+'.tiles/mobile_f.jpg';
    }else if(type == '-1'){
        thumbsrc = config.domainImagesPath + '/pano/pano2T/' + key.split('_')[0] + '/thumb.jpg';
    }else if(type == '18' || type == '19'){
        thumbsrc = config.cdnPath + '/pano/' + key.split('_')[0] + '.jpg?imageMogr2/thumbnail/!20p';
    }else{
        var thumb = (scenestyle==3||scenestyle==4)?'1024x1024a1500a700':'1024x1024a0a0';
        thumbsrc = config.cdnPath + '/images/scenes/'+key.split('_')[0]+'/allinone.jpg?imageMogr2/gravity/NorthWest/crop/!1024x1024a0a'+((scenestyle==3||scenestyle==4)?'700':'0')+'/thumbnail/!40p';
    }

    return thumbsrc;
}

exports.getShareIcon = function(key, width, type, sharekey){

    var croppramas,shareiconKey,sharekey = JSON.parse(sharekey);

    var shareicon_default;
    // if(width!=0){
        width == 5000?croppramas = '2500x2500a1250a0':croppramas = '1248x1248a0a0';
    // };
    // console.log('111111111111111------'+width);
    // console.log('111111111111111------'+croppramas);
    if(type == 5){
        shareicon_default = config.domainImagesPath + '/pano/'+key.split("_")[0]+'.tiles/pano_s.jpg';
    }else if(type == 6){
        shareicon_default = config.cdnPath + '/pano/'+key.split("_")[0]+'.tiles/pano_s.jpg?imageMogr2/crop/!450x450a300a0/thumbnail/!220';
    }else if(type == 18 || type == 19){
        shareicon_default = config.cdnPath + '/pano/'+key.split("_")[0]+'.jpg?imageMogr2/crop/!450x450a300a0/thumbnail/!220';
    }else if(type == 7){
        shareicon_default = config.cdnPath + '/images/sence/sharing_img.png';
    }else if(type == -1){
        shareicon_default = config.domainImagesPath + '/pano/pano2T/'+key.split("_")[0]+'/thumb.jpg';
    }else{
        shareicon_default = config.cdnPath + '/images/scenes/'+key.split("_")[0]+'/allinone.jpg?imageMogr2/crop/!'+croppramas+'/thumbnail/!10p';
    }


    //类型 0 1 2
    switch(sharekey[0]){
        case 0:  //未过期默认跟随场景
	        shareiconKey = shareicon_default;
        break;
        case 1:
            shareiconKey = sharekey[1]?config.cdnPath + '/images/shareicon/'+sharekey[1]:shareicon_default;
        break;
        case 2:
            shareiconKey = config.cdnPath + '/images/sence/sharing_img.png';
        break;
    }

    return shareiconKey;
}

exports.getChildrenUsers = function(u,childarr){
    if (u==1) {
        return db.Users.findAll({
            attributes:['id','name'],
            where:{
                id:{
                    gt:1
                }
            }
        }).then(function(result){
            var users=[];
            for (var i = 0, len = result.length; i < len; i++) {
                if (result[i].name.length!=28) {
                    if(childarr){
                        if(childarr.indexOf(result[i].name)!=-1){
                            users.push(result[i].id);
                        }
                    }else{
                        users.push(result[i].id);
                    }
                };
            };
            return users;
        })
    }else{
        return db.Users.find({
            where:{
                id: u
            }
        }).then(function(result){

            var users=[];
            if(result.level >= 10 && result.children){
                users=JSON.parse(result.children);
            }


            return db.Users.findAll({
                where: {
                    id: {
                        $in: users
                    }
                }
            }).then(function(newusers){

                var childobj = {};
                for (var i = newusers.length - 1; i >= 0; i--) {
                    if(newusers[i].children != '[]'){
                        users = users.concat(JSON.parse(newusers[i].children));
                        childobj[newusers[i].id] = JSON.parse(newusers[i].children);
                    }
                };

                if(Object.prototype.toString.call(u) === '[object Array]'){
                    users = users.concat(u);
                }else{
                    users.push(u);
                }
                
                if(childarr){
                    return db.Users.findAll({
                        where:{
                            id:{
                                in:users
                            }
                        }
                    }).then(function(users){
                        if(!users){
                            return [];
                        }else{
                            var newarr = [];
                            for(var i in users){
                                for(var j in childarr){
                                    if(users[i].name==childarr[j]){
                                        newarr.push(users[i].id);
                                    }
                                }
                            }
                            for(var z in newarr){
                                if(childobj[newarr[z]]){
                                    newarr = newarr.concat(childobj[newarr[z]]);
                                }
                            }
                            return newarr;
                        }
                        // return [15895];
                    });
                }else{
                    return users;
                }
            });
        });
    };
}

exports.getClientIp=function(req) {
    var unknown='6.6.6.6';
        return req.headers['x-forwarded-for'] ||
        (req.connection?req.connection.remoteAddress:unknown) ||
        (req.socket?req.socket.remoteAddress:unknown) ||
        (req.connection.socket?req.connection.socket.remoteAddress:unknown)||unknown;
};

exports.unicode2Chr=function(str) { 
 if ('' != str) { 
  var st, t, i 
  st = ''; 
  for (i = 1; i <= str.length/4; i ++){ 
   t = str.slice(4*i-4, 4*i-2); 
   t = str.slice(4*i-2, 4*i).concat(t); 
   st = st.concat('%u').concat(t); 
  } 
  st = unescape(st); 
  return(st); 
 } 
 else 
  return(''); 
} 
//字符转换为unicode 
exports.chr2Unicode=function(str) { 
 if ('' != str) { 
  var st, t, i; 
  st = ''; 
  for (i = 1; i <= str.length; i ++){ 
   t = str.charCodeAt(i - 1).toString(16); 
   if (t.length < 4) 
   while(t.length <4) 
    t = '0'.concat(t); 
   t = t.slice(2, 4).concat(t.slice(0, 2)) 
   st = st.concat(t); 
  } 
  return(st.toUpperCase()); 
 } 
 else { 
   return(''); 
 } 
} 

exports.isNum=function(a){
    return a>0||a<=0?true:false;
}

exports.isTelephone=function(a){
    var reg=/^[0-9,-]*$/;
    return reg.test(a);
}

exports.urlencode =function(str) {  
    str = (str + '').toString();   

    return encodeURIComponent(str).replace(/!/g, '%21').replace(/'/g, '%27').replace(/\(/g, '%28').  
    replace(/\)/g, '%29').replace(/\*/g, '%2A').replace(/%20/g, '+');  
} 

exports.isArray=function(matrixStr,size){
    var matrix;
    try{
        matrix=JSON.parse(matrixStr);
    }catch(e){
        console.log(e);
        return false;
    }

    if(size){
        if(matrix.length!=size){
            console.log('length error');
            return false;
        }
    }
    for(var i in matrix){
        if(!exports.isNum(matrix[i])){
            console.log('type error');
            return false;
        }
    }
    return true;
}

/*   
 *   A   JavaScript   implementation   of   the   Secure   Hash   Algorithm,   SHA-1,   as   defined   
 *   in   FIPS   PUB   180-1   
 *   Version   2.1-BETA   Copyright   Paul   Johnston   2000   -   2002.   
 *   Other   contributors:   Greg   Holt,   Andrew   Kepert,   Ydnar,   Lostinet   
 *   Distributed   under   the   BSD   License   
 *   See   http://pajhome.org.uk/crypt/md5   for   details.   
 */
/*   
 *   Configurable   variables.   You   may   need   to   tweak   these   to   be   compatible   with   
 *   the   server-side,   but   the   defaults   work   in   most   cases.   
 */
var hexcase = 0; /*   hex   output   format.   0   -   lowercase;   1   -   uppercase                 */
var b64pad = ""; /*   base-64   pad   character.   "="   for   strict   RFC   compliance       */
var chrsz = 8; /*   bits   per   input   character.   8   -   ASCII;   16   -   Unicode             */

/*   
 *   These   are   the   functions   you'll   usually   want   to   call   
 *   They   take   string   arguments   and   return   either   hex   or   base-64   encoded   strings   
 */
function hex_sha1(s) {
    return binb2hex(core_sha1(str2binb(s), s.length * chrsz));
}

function b64_sha1(s) {
    return binb2b64(core_sha1(str2binb(s), s.length * chrsz));
}

function str_sha1(s) {
    return binb2str(core_sha1(str2binb(s), s.length * chrsz));
}

function hex_hmac_sha1(key, data) {
    return binb2hex(core_hmac_sha1(key, data));
}

function b64_hmac_sha1(key, data) {
    return binb2b64(core_hmac_sha1(key, data));
}

function str_hmac_sha1(key, data) {
    return binb2str(core_hmac_sha1(key, data));
}

/*   
 *   Perform   a   simple   self-test   to   see   if   the   VM   is   working   
 */
function sha1_vm_test() {
    return hex_sha1("abc") == "a9993e364706816aba3e25717850c26c9cd0d89d";
}

/*   
 *   Calculate   the   SHA-1   of   an   array   of   big-endian   words,   and   a   bit   length   
 */
function core_sha1(x, len) {
    /*   append   padding   */
    x[len >> 5] |= 0x80 << (24 - len % 32);
    x[((len + 64 >> 9) << 4) + 15] = len;

    var w = Array(80);
    var a = 1732584193;
    var b = -271733879;
    var c = -1732584194;
    var d = 271733878;
    var e = -1009589776;

    for (var i = 0; i < x.length; i += 16) {
        var olda = a;
        var oldb = b;
        var oldc = c;
        var oldd = d;
        var olde = e;

        for (var j = 0; j < 80; j++) {
            if (j < 16) w[j] = x[i + j];
            else w[j] = rol(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1);
            var t = safe_add(safe_add(rol(a, 5), sha1_ft(j, b, c, d)), safe_add(safe_add(e, w[j]), sha1_kt(j)));
            e = d;
            d = c;
            c = rol(b, 30);
            b = a;
            a = t;
        }

        a = safe_add(a, olda);
        b = safe_add(b, oldb);
        c = safe_add(c, oldc);
        d = safe_add(d, oldd);
        e = safe_add(e, olde);
    }
    return Array(a, b, c, d, e);

}

/*   
 *   Perform   the   appropriate   triplet   combination   function   for   the   current   
 *   iteration   
 */
function sha1_ft(t, b, c, d) {
    if (t < 20) return (b & c) | ((~b) & d);
    if (t < 40) return b ^ c ^ d;
    if (t < 60) return (b & c) | (b & d) | (c & d);
    return b ^ c ^ d;
}

/*   
 *   Determine   the   appropriate   additive   constant   for   the   current   iteration   
 */
function sha1_kt(t) {
    return (t < 20) ? 1518500249 : (t < 40) ? 1859775393 : (t < 60) ? -1894007588 : -899497514;
}

/*   
 *   Calculate   the   HMAC-SHA1   of   a   key   and   some   data   
 */
function core_hmac_sha1(key, data) {
    var bkey = str2binb(key);
    if (bkey.length > 16) bkey = core_sha1(bkey, key.length * chrsz);

    var ipad = Array(16),
        opad = Array(16);
    for (var i = 0; i < 16; i++) {
        ipad[i] = bkey[i] ^ 0x36363636;
        opad[i] = bkey[i] ^ 0x5C5C5C5C;
    }

    var hash = core_sha1(ipad.concat(str2binb(data)), 512 + data.length * chrsz);
    return core_sha1(opad.concat(hash), 512 + 160);
}

/*   
 *   Add   integers,   wrapping   at   2^32.   This   uses   16-bit   operations   internally   
 *   to   work   around   bugs   in   some   JS   interpreters.   
 */
function safe_add(x, y) {
    var lsw = (x & 0xFFFF) + (y & 0xFFFF);
    var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xFFFF);
}

/*   
 *   Bitwise   rotate   a   32-bit   number   to   the   left.   
 */
function rol(num, cnt) {
    return (num << cnt) | (num >>> (32 - cnt));
}

/*   
 *   Convert   an   8-bit   or   16-bit   string   to   an   array   of   big-endian   words   
 *   In   8-bit   function,   characters   >255   have   their   hi-byte   silently   ignored.   
 */
function str2binb(str) {
    var bin = Array();
    var mask = (1 << chrsz) - 1;
    for (var i = 0; i < str.length * chrsz; i += chrsz)
    bin[i >> 5] |= (str.charCodeAt(i / chrsz) & mask) << (24 - i % 32);
    return bin;
}

/*   
 *   Convert   an   array   of   big-endian   words   to   a   string   
 */
function binb2str(bin) {
    var str = "";
    var mask = (1 << chrsz) - 1;
    for (var i = 0; i < bin.length * 32; i += chrsz)
    str += String.fromCharCode((bin[i >> 5] >>> (24 - i % 32)) & mask);
    return str;
}

/*   
 *   Convert   an   array   of   big-endian   words   to   a   hex   string.   
 */
function binb2hex(binarray) {
    var hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
    var str = "";
    for (var i = 0; i < binarray.length * 4; i++) {
        str += hex_tab.charAt((binarray[i >> 2] >> ((3 - i % 4) * 8 + 4)) & 0xF) + hex_tab.charAt((binarray[i >> 2] >> ((3 - i % 4) * 8)) & 0xF);
    }
    return str;
}

/*   
 *   Convert   an   array   of   big-endian   words   to   a   base-64   string   
 */
function binb2b64(binarray) {
    var tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    var str = "";
    for (var i = 0; i < binarray.length * 4; i += 3) {
        var triplet = (((binarray[i >> 2] >> 8 * (3 - i % 4)) & 0xFF) << 16) | (((binarray[i + 1 >> 2] >> 8 * (3 - (i + 1) % 4)) & 0xFF) << 8) | ((binarray[i + 2 >> 2] >> 8 * (3 - (i + 2) % 4)) & 0xFF);
        for (var j = 0; j < 4; j++) {
            if (i * 8 + j * 6 > binarray.length * 32) str += b64pad;
            else str += tab.charAt((triplet >> 6 * (3 - j)) & 0x3F);
        }
    }
    return str;
}

exports.hex_sha1=hex_sha1;
