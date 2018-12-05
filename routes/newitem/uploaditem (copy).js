var express = require('express');
var router = express.Router();
var config= require('../config');
var db= require('../model');
var utils= require('../utils');
var session = require('express-session');
var request = require('request');
var qiniu= require('qiniu');
var path = require('path');

qiniu.conf.ACCESS_KEY = "ek6zXNw1Zvl9LAeIXPfzf_EAQZ1sXz0DcXZ0WKsL";
qiniu.conf.SECRET_KEY = "pUBR4t4LZOtXisXKm8O2Tj-tQnCxySmOwSJsXYDx";



router.get('/',function(req,res){

    utils.login(req, res, function(userid){

        utils.getexpire(userid).then(function(expire){

            db.Users.findOne({
                where: {
                    id: userid
                }
            }).then(function(user){

                db.Groups.findAll({
                    where: {
                        user_id: userid,
                        show: {
                            $gte: 10
                        },
                        scenes_id:{
                            ne:"[]"
                        }
                    }
                }).then(function(groups){

                    var groupid = req.query.id?req.query.id:false;

                    if(groupid){
                        db.Groups.findOne({
                            where:{
                                id: groupid
                            }
                        }).then(function(group){
                            if(!group){
                                groupid = false;
                            }
                            
                            var result = {
                                user: user,
                                platform: utils.getPlatform(req),
                                group: groupid?group:null,
                                userid: userid,
                                locked: Date.parse(expire)<Date.now()&&groups.length>=200
                            }
                            res.render('newitem/upload', result);
                        });
                    }else{
                        var result = {
                            user: user,
                            platform: utils.getPlatform(req),
                            group: null,
                            userid: userid,
                            locked: Date.parse(expire)<Date.now()&&groups.length>=200
                        }
                        res.render('newitem/upload', result);
                    }
                });
            })
        });
    });
});


function getuploadarr(key){

    return [
        key+".tiles/mobile_b.jpg",
        key+".tiles/mobile_d.jpg",
        key+".tiles/mobile_f.jpg",
        key+".tiles/mobile_l.jpg",
        key+".tiles/mobile_r.jpg",
        key+".tiles/mobile_u.jpg",
        key+".tiles/preview.jpg",

        key+".tiles/mres_b/l1/1/l1_b_1_1.jpg",
        key+".tiles/mres_b/l1/1/l1_b_1_2.jpg",
        key+".tiles/mres_b/l1/2/l1_b_2_1.jpg",
        key+".tiles/mres_b/l1/2/l1_b_2_2.jpg",

        key+".tiles/mres_b/l2/1/l2_b_1_1.jpg",
        key+".tiles/mres_b/l2/1/l2_b_1_2.jpg",
        key+".tiles/mres_b/l2/1/l2_b_1_3.jpg",
        key+".tiles/mres_b/l2/1/l2_b_1_4.jpg",

        key+".tiles/mres_b/l2/2/l2_b_2_1.jpg",
        key+".tiles/mres_b/l2/2/l2_b_2_2.jpg",
        key+".tiles/mres_b/l2/2/l2_b_2_3.jpg",
        key+".tiles/mres_b/l2/2/l2_b_2_4.jpg",

        key+".tiles/mres_b/l2/3/l2_b_3_1.jpg",
        key+".tiles/mres_b/l2/3/l2_b_3_2.jpg",
        key+".tiles/mres_b/l2/3/l2_b_3_3.jpg",
        key+".tiles/mres_b/l2/3/l2_b_3_4.jpg",

        key+".tiles/mres_b/l2/4/l2_b_4_1.jpg",
        key+".tiles/mres_b/l2/4/l2_b_4_2.jpg",
        key+".tiles/mres_b/l2/4/l2_b_4_3.jpg",
        key+".tiles/mres_b/l2/4/l2_b_4_4.jpg",




        key+".tiles/mres_d/l1/1/l1_d_1_1.jpg",
        key+".tiles/mres_d/l1/1/l1_d_1_2.jpg",
        key+".tiles/mres_d/l1/2/l1_d_2_1.jpg",
        key+".tiles/mres_d/l1/2/l1_d_2_2.jpg",

        key+".tiles/mres_d/l2/1/l2_d_1_1.jpg",
        key+".tiles/mres_d/l2/1/l2_d_1_2.jpg",
        key+".tiles/mres_d/l2/1/l2_d_1_3.jpg",
        key+".tiles/mres_d/l2/1/l2_d_1_4.jpg",

        key+".tiles/mres_d/l2/2/l2_d_2_1.jpg",
        key+".tiles/mres_d/l2/2/l2_d_2_2.jpg",
        key+".tiles/mres_d/l2/2/l2_d_2_3.jpg",
        key+".tiles/mres_d/l2/2/l2_d_2_4.jpg",

        key+".tiles/mres_d/l2/3/l2_d_3_1.jpg",
        key+".tiles/mres_d/l2/3/l2_d_3_2.jpg",
        key+".tiles/mres_d/l2/3/l2_d_3_3.jpg",
        key+".tiles/mres_d/l2/3/l2_d_3_4.jpg",

        key+".tiles/mres_d/l2/4/l2_d_4_1.jpg",
        key+".tiles/mres_d/l2/4/l2_d_4_2.jpg",
        key+".tiles/mres_d/l2/4/l2_d_4_3.jpg",
        key+".tiles/mres_d/l2/4/l2_d_4_4.jpg",




        key+".tiles/mres_f/l1/1/l1_f_1_1.jpg",
        key+".tiles/mres_f/l1/1/l1_f_1_2.jpg",
        key+".tiles/mres_f/l1/2/l1_f_2_1.jpg",
        key+".tiles/mres_f/l1/2/l1_f_2_2.jpg",

        key+".tiles/mres_f/l2/1/l2_f_1_1.jpg",
        key+".tiles/mres_f/l2/1/l2_f_1_2.jpg",
        key+".tiles/mres_f/l2/1/l2_f_1_3.jpg",
        key+".tiles/mres_f/l2/1/l2_f_1_4.jpg",

        key+".tiles/mres_f/l2/2/l2_f_2_1.jpg",
        key+".tiles/mres_f/l2/2/l2_f_2_2.jpg",
        key+".tiles/mres_f/l2/2/l2_f_2_3.jpg",
        key+".tiles/mres_f/l2/2/l2_f_2_4.jpg",

        key+".tiles/mres_f/l2/3/l2_f_3_1.jpg",
        key+".tiles/mres_f/l2/3/l2_f_3_2.jpg",
        key+".tiles/mres_f/l2/3/l2_f_3_3.jpg",
        key+".tiles/mres_f/l2/3/l2_f_3_4.jpg",

        key+".tiles/mres_f/l2/4/l2_f_4_1.jpg",
        key+".tiles/mres_f/l2/4/l2_f_4_2.jpg",
        key+".tiles/mres_f/l2/4/l2_f_4_3.jpg",
        key+".tiles/mres_f/l2/4/l2_f_4_4.jpg",




        key+".tiles/mres_l/l1/1/l1_l_1_1.jpg",
        key+".tiles/mres_l/l1/1/l1_l_1_2.jpg",
        key+".tiles/mres_l/l1/2/l1_l_2_1.jpg",
        key+".tiles/mres_l/l1/2/l1_l_2_2.jpg",

        key+".tiles/mres_l/l2/1/l2_l_1_1.jpg",
        key+".tiles/mres_l/l2/1/l2_l_1_2.jpg",
        key+".tiles/mres_l/l2/1/l2_l_1_3.jpg",
        key+".tiles/mres_l/l2/1/l2_l_1_4.jpg",

        key+".tiles/mres_l/l2/2/l2_l_2_1.jpg",
        key+".tiles/mres_l/l2/2/l2_l_2_2.jpg",
        key+".tiles/mres_l/l2/2/l2_l_2_3.jpg",
        key+".tiles/mres_l/l2/2/l2_l_2_4.jpg",

        key+".tiles/mres_l/l2/3/l2_l_3_1.jpg",
        key+".tiles/mres_l/l2/3/l2_l_3_2.jpg",
        key+".tiles/mres_l/l2/3/l2_l_3_3.jpg",
        key+".tiles/mres_l/l2/3/l2_l_3_4.jpg",

        key+".tiles/mres_l/l2/4/l2_l_4_1.jpg",
        key+".tiles/mres_l/l2/4/l2_l_4_2.jpg",
        key+".tiles/mres_l/l2/4/l2_l_4_3.jpg",
        key+".tiles/mres_l/l2/4/l2_l_4_4.jpg",





        key+".tiles/mres_r/l1/1/l1_r_1_1.jpg",
        key+".tiles/mres_r/l1/1/l1_r_1_2.jpg",
        key+".tiles/mres_r/l1/2/l1_r_2_1.jpg",
        key+".tiles/mres_r/l1/2/l1_r_2_2.jpg",

        key+".tiles/mres_r/l2/1/l2_r_1_1.jpg",
        key+".tiles/mres_r/l2/1/l2_r_1_2.jpg",
        key+".tiles/mres_r/l2/1/l2_r_1_3.jpg",
        key+".tiles/mres_r/l2/1/l2_r_1_4.jpg",

        key+".tiles/mres_r/l2/2/l2_r_2_1.jpg",
        key+".tiles/mres_r/l2/2/l2_r_2_2.jpg",
        key+".tiles/mres_r/l2/2/l2_r_2_3.jpg",
        key+".tiles/mres_r/l2/2/l2_r_2_4.jpg",

        key+".tiles/mres_r/l2/3/l2_r_3_1.jpg",
        key+".tiles/mres_r/l2/3/l2_r_3_2.jpg",
        key+".tiles/mres_r/l2/3/l2_r_3_3.jpg",
        key+".tiles/mres_r/l2/3/l2_r_3_4.jpg",

        key+".tiles/mres_r/l2/4/l2_r_4_1.jpg",
        key+".tiles/mres_r/l2/4/l2_r_4_2.jpg",
        key+".tiles/mres_r/l2/4/l2_r_4_3.jpg",
        key+".tiles/mres_r/l2/4/l2_r_4_4.jpg",



        key+".tiles/mres_u/l1/1/l1_u_1_1.jpg",
        key+".tiles/mres_u/l1/1/l1_u_1_2.jpg",
        key+".tiles/mres_u/l1/2/l1_u_2_1.jpg",
        key+".tiles/mres_u/l1/2/l1_u_2_2.jpg",

        key+".tiles/mres_u/l2/1/l2_u_1_1.jpg",
        key+".tiles/mres_u/l2/1/l2_u_1_2.jpg",
        key+".tiles/mres_u/l2/1/l2_u_1_3.jpg",
        key+".tiles/mres_u/l2/1/l2_u_1_4.jpg",

        key+".tiles/mres_u/l2/2/l2_u_2_1.jpg",
        key+".tiles/mres_u/l2/2/l2_u_2_2.jpg",
        key+".tiles/mres_u/l2/2/l2_u_2_3.jpg",
        key+".tiles/mres_u/l2/2/l2_u_2_4.jpg",

        key+".tiles/mres_u/l2/3/l2_u_3_1.jpg",
        key+".tiles/mres_u/l2/3/l2_u_3_2.jpg",
        key+".tiles/mres_u/l2/3/l2_u_3_3.jpg",
        key+".tiles/mres_u/l2/3/l2_u_3_4.jpg",

        key+".tiles/mres_u/l2/4/l2_u_4_1.jpg",
        key+".tiles/mres_u/l2/4/l2_u_4_2.jpg",
        key+".tiles/mres_u/l2/4/l2_u_4_3.jpg",
        key+".tiles/mres_u/l2/4/l2_u_4_4.jpg",
        key+".tiles/pano_s.jpg"
    ];
}

var exec = require('child_process').exec;
var fs = require('fs');
var path = require('path');
var formidable = require('formidable');


var queuefun = require('queue-fun');
var Queue = queuefun.Queue(); 


router.post('/', function(req, res){

    var formParse = new formidable.IncomingForm();  
    formParse.uploadDir = path.join(__dirname, '../../public/pano/temp/');
    formParse.multiples = false;//设置为多文件上传  
    formParse.keepExtensions = true;//是否包含文件后缀  

    formParse.parse(req, function(error,fields,files) {

        var groupid = fields.groups_id&&!isNaN(fields.groups_id)?parseInt(fields.groups_id):false;
        
        if(!groupid&&(!fields.city||!fields.region||!fields.community||!fields.building||!fields.room||!fields.business_circle)){
            res.json({code:-2,msg:'房源信息不完整'});
            return;
        }

        var token = fields.token?fields.token:null;

        utils.autologin(req, res, function(userid){

            if (error) {
                console.log("error" + error.message);
                return;
            }

            var fileName = files.file.name;
            var key = utils.md5(new Date().valueOf()+''+userid).substr(0,10);
            var fileurl = path.join(__dirname, '../../public/pano/'+key+'.jpg');

            try{
                fs.renameSync(files.file.path, fileurl);
            }catch(err){
                res.json({code:-1,msg:'上传失败，请重试'});
                return;
            }
            

            var data={
                type: 7,
                show: 11,
                key: key,
                order: -1,
                scenestyle: 5,
                user_id: userid,
                name: fields.name?fields.name:'',
                deviceid: fields.deviceid?fields.deviceid:'',
                cfov: fields.cfov==undefined?null:fields.cfov,
                jzmode: fields.jzmode?parseInt(fields.jzmode):'',
                introduction: fields.introduction?fields.introduction:'',
                width: '0'
            }


            var uuid = fields.uuid?fields.uuid:parseInt(Math.random()*10000000)+'';
            var group_key = utils.md5(uuid+'qson').substr(0,10);

            db.Scenes.create(data).then(function(scene){

                if(!scene){
                    res.json({code:-3,msg:'创建失败'});
                    fs.unlinkSync(fileurl);
                    return;
                }

                var groupmap;
                groupid&&groupid!=0?groupmap = { id: groupid }:groupmap = { key: group_key };

                db.Groups.findOne({
                    where: groupmap
                }).then(function(group){

                    if(!group){

                        //如果没有，生成一个新的group
                        var group_data = {
                            key: group_key,
                            user_id: userid,
                            show: 11,
                            links_id: "{}",
                            comments_id: "{}",
                            maps_id:"[]",
                            scenes_id:"["+scene.id+"]",

                            city: fields.city,
                            region: fields.region,
                            community: fields.community,

                            building: fields.building,
                            room: fields.room,
                            price: fields.price,

                            housekey: fields.key, //房源的唯一标识号

                            floor:fields.floor?fields.floor:0,

                            apartment_halls: fields.apartment_halls?fields.apartment_halls:0,
                            apartment_rooms: fields.apartment_rooms?fields.apartment_rooms:0,
                            apartment_bathrooms: fields.apartment_bathrooms?fields.apartment_bathrooms:0,
                            area: fields.area?fields.area:0,
                            total_floor: fields.total_floor?fields.total_floor:0,
                            floor: fields.floor?fields.floor:0,
                            business_circle: fields.business_circle,
                            face: '',
                            lat: (fields.lat&&fields.lat>0.1)?fields.lat:0,
                            lng: (fields.lng&&fields.lng>0.1)?fields.lng:0,
                            area: fields.area,
                            extra: fields.desc?fields.desc:'{}',
                            name: fields.name?fields.name:'',
                            width: 0
                        }
                        console.log('某某某某某某'+group_data.price);
                        return db.Groups.create(group_data);

                    }else{

                        //如果有group，更新groups的scenes_id
                        var scenes_id = JSON.parse(group.scenes_id);
                        scenes_id.push(scene.id);

                        return db.Groups.update({
                            scenes_id: JSON.stringify(scenes_id)
                        },{
                            where: {
                                id: group.id
                            }
                        }).then(function(up){
                            if(!up){
                                res.json({code:-4,msg:'update failed'});
                                return;
                            }
                            return db.Groups.findOne({
                                where: {
                                    id: group.id
                                }
                            });
                        })
                    }
                }).then(function(group){

                    //更新scene的groupsid
                    db.Scenes.update({
                        group_id: group.id,
                        order: JSON.parse(group.scenes_id).length
                    },{
                        where: {
                            id: scene.id
                        }
                    }).then(function(up){
                        queueup();
                        res.json({code:0,msg:'上传成功',key:key});
                        // console.log('队列开启');
                        //开启队列
                    });
                });
            });
        }, token);
    });
});


//队列方法
function queueup(){

    console.log('11111111111111111111111-------------------------------------------队列推进了')

    var lockpath = path.join(__dirname, '../../lock_3t');

    // var locknum = parseInt(fs.readFileSync(lockpath));

    // if(locknum < 2){

        //设置并行数量
    var num = 2;
    if((new Date()).getHours()<8)num = 2;

    var queue = new Queue(num,{
        event_err: function(err){console.log('queue-succ:',err)},  //失败
        event_succ: function(data){}//成功
    });

    db.Scenes.findAll({
        attributes: ['key'],
        where: {
            type: 7,
            show: {
                $gte: 0
            }
        }
    }).then(function(scenes){

        //锁住，不并发操作
        // locknum++;
        // fs.writeFileSync(lockpath, locknum+'');

        // console.log(scenes);

        if(scenes){
            queue.allArray(scenes, cutcmd, {'event_succ': console.log}).then(function(){
                db.Scenes.findOne({
                    where: {
                        type: 7
                    }
                }).then(function(scene){
                    //解开锁，使得下个队列可以开启
                    // fs.writeFileSync(lockpath, '0');
                    if(scene){
                        queueup();
                        return;
                    };
                });
            });
            queue.start();
        }
    });
    // }
}

function cutcmd(obj){

    var q = queuefun.Q;
    var deferred = q.defer();
    var key = obj.key;

    var fileurl = path.join(__dirname, '../../public/pano/'+key+'.jpg');

    var cmd = "/home/qson/krpano19/krpanotools makepano -config=/home/qson/krpano19/templates/qson.config "+fileurl;

    // console.log('开始裁切');

    exec(cmd, function(err, stdout,stderr){

        if(err){
            console.log(err);
            return;
        };

        var mulindex = stdout.indexOf('multires: tilesize='),
            makindex = stdout.indexOf('making images');

        if(mulindex == -1||makindex == -1){
            return;
        }
        var m = stdout.substring(mulindex+1, makindex).split(' ');
        var m1 = m[4].split('x')[0];
        var m2 = m[5].split('x')[0];

        m1 = m1?parseInt(m1):1600;
        m2 = m2?parseInt(m2):768;

        var m3 = m1+'|'+m2;

        if(err){
            // console.log('发生了错误'+err);
            fs.unlinkSync(fileurl);
            deferred.reject(new Error(stderr));
            return;
        }

        if(stdout.indexOf('done.')==-1){
            deferred.reject(new Error('转换失败'));
            fs.unlinkSync(path.join(__dirname, '../../public/pano/'+key+'.tiles'));
            return;
        }

        // console.log('裁切成功');

        var images = require('images');
        var inputpath = path.join(__dirname, '../../public/pano/'+key+'.jpg');
        var outputpath = path.join(__dirname, '../../public/pano/'+key+'.tiles/pano_s.jpg');
        var i = images(inputpath).size(1000).save(outputpath, {quality: 100});

        //裁切成功，更新type
        db.Scenes.update({
            type: 5,//状态5为保存在主服务器的1比120的全景套图
            width: m3
        },{
            where: {
                key: key
            }
        }).then(function(up){

            // console.log('裁切成功，更新type');
            if(!up){
                deferred.reject(new Error('更新数据库失败'));
            }else{
                deferred.resolve();
                uploadarr(key, 0, isNaN(m2));
            }
        });
    });
    return deferred.promise;
}


//文件上传到七牛后删除主服务的图片文件夹
//清空文件夹
var emptyDir = function(fileUrl){
    var files = fs.readdirSync(fileUrl);//读取该文件夹
    files.forEach(function(file){
        var stats = fs.statSync(fileUrl + '/' + file);
        if(stats.isDirectory()){
            emptyDir(fileUrl + '/' + file);
        }else{
            fs.unlinkSync(fileUrl+'/'+file);
            console.log("删除文件" + fileUrl + '/' + file + "成功");
        }
    });
}
var rmEmptyDir = function(fileUrl){
    var files = fs.readdirSync(fileUrl);
    if(files.length > 0){
        var tempFile = 0;
        files.forEach(function(fileName)
        {
            tempFile++;
            rmEmptyDir(fileUrl+'/'+fileName);
        });
        if(tempFile == files.length){//删除母文件夹下的所有字空文件夹后，将母文件夹也删除
            fs.rmdirSync(fileUrl);
            console.log('删除空文件夹' + fileUrl + '成功');
        }
    }else{
        fs.rmdirSync(fileUrl);
        console.log('删除空文件夹' + fileUrl + '成功');
    }
}


//构造递归函数
function uploadarr(cbkey, i, isNaN){
    console.log('开始上传'+i+'张图片');
    var files = getuploadarr(cbkey);
    if(files[i]){
        //要上传的空间
        var bucket = 'suteng';
        //上传到七牛后保存的文件名
        var key = 'pano/' + files[i];
        var token = uptoken(bucket, key);

        //要上传文件的本地路径
        var filePath = path.join(__dirname, '../../public/pano/' + files[i]);

        uploadFile(token, key, filePath, function(){

            try{
                fs.unlinkSync(filePath);
            }catch(err){
                console.log(err);
            }
            uploadarr(cbkey, ++i, isNaN);
        });
    }else{
        //删除文件夹
        emptyDir(path.join(__dirname, '../../public/pano/' + cbkey + '.tiles'));
        rmEmptyDir(path.join(__dirname, '../../public/pano/' + cbkey + '.tiles'));
        db.Scenes.update({
            type: isNaN?9:6
        }, {
            where: {
                key: cbkey
            }
        }).then(function(up){
            db.Scenes.findOne({
                where: {
                    key: cbkey
                }
            }).then(function(Scene){

                            console.log('abc4');
                if(!Scene)return;

                db.Users.findOne({
                    where: {
                        id: Scene.user_id
                    }
                }).then(function(u){

                            console.log('abc3');
                    if(!u)return;

                    if(u.listapi && u.callbackapi){
                        db.Groups.findOne({
                            where: {
                                id: Scene.group_id
                            }
                        }).then(function(g){
                            console.log('abc2');
                            if(!g)return;
                            var scenes_id = JSON.parse(g.scenes_id);
                            if(scenes_id.length == 1){
                                console.log('abc1');
                                request.post({url: u.callbackapi,form:{
                                    key: g.housekey,
                                    scenekey: cbkey}
                                },function (error, response, body) {
                                    if(!error && response.statusCode == 200){
                                        console.log(body);
                                    }
                                }) 
                            }
                        })
                    }
                })
            })
        });
    }
}

//构造上传函数
function uploadFile(uptoken, key, localFile, callback) {

    var extra = new qiniu.io.PutExtra();

    qiniu.io.putFile(uptoken, key, localFile, extra, function(err, ret) {
        callback();
    });
}

//构造上传函数
function uptoken(bucket, key) {

    var putPolicy = new qiniu.rs.PutPolicy(bucket+":"+key);
    putPolicy.callbackUrl = 'http://wx.sz-sti.com/uploadsitem/nodeupcb';
    putPolicy.callbackBody = 'filename=$(fname)&filesize=$(fsize)';
    return putPolicy.token();
}


router.post('/nodeupcb',function(req,res){
    res.json({code:0,msg:'OK'});
});

router.get('/runqueue', function(req, res){
    var lockpath = path.join(__dirname, '../../lock_3t');
    fs.writeFileSync(lockpath, '0');
    res.json({msg:'queue running'});
});


module.exports= router;
