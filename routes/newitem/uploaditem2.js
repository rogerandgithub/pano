var express = require('express');
var router = express.Router();
var config= require('../config');
var db= require('../model');
var utils= require('../utils');
var session = require('express-session');
var request = require('request');


router.get('/',function(req,res){

    utils.login(req, res, function(userid){

        utils.getexpire(userid).then(function(expire){

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
                            platform: utils.getPlatform(req),
                            group: groupid?group:null,
                            userid: userid,
                            locked: Date.parse(expire)<Date.now()&&groups.length>=200
                        }
                        res.render('newitem/upload', result);
                    });
                }else{
                    var result = {
                        platform: utils.getPlatform(req),
                        group: null,
                        userid: userid,
                        locked: Date.parse(expire)<Date.now()&&groups.length>=200
                    }
                    res.render('newitem/upload', result);
                }
            });
        });
    });
});


var exec = require('child_process').exec;
var fs = require('fs');
var path = require('path');
var formidable = require('formidable');
var qiniu= require('qiniu');

qiniu.conf.ACCESS_KEY = "ek6zXNw1Zvl9LAeIXPfzf_EAQZ1sXz0DcXZ0WKsL";
qiniu.conf.SECRET_KEY = "pUBR4t4LZOtXisXKm8O2Tj-tQnCxySmOwSJsXYDx";


router.post('/', function(req, res){
    
    utils.autologin(req, res, function(userid){

        var formParse=new formidable.IncomingForm();  
        formParse.uploadDir=path.join(__dirname, '../../public/pano/temp/');
        formParse.multiples=false;//设置为多文件上传  
        formParse.keepExtensions=true;//是否包含文件后缀  

        formParse.parse(req, function(error,fields,files) {

            if(!fields.city||!fields.region||!fields.community||!fields.building||!fields.room||!fields.business_circle){
                res.json({code:-2,msg:'房源信息不完整'});
                return;
            }

            if (error) {
                console.log("error" + error.message);  
                return;
            }

            var fileName = files.file.name;
            var key = utils.md5(new Date().valueOf()+''+userid).substr(0,10);
            var fileurl = path.join(__dirname, '../../public/pano/'+key+'.jpg');

            fs.renameSync(files.file.path, fileurl);

            var cmd = "/opt/krpano19/krpanotools makepano -config=/opt/krpano19/templates/qson.config "+fileurl;

            exec(cmd, function(err, stdout,stderr){

                var mulindex = stdout.indexOf('multires: tilesize='),
                    makindex = stdout.indexOf('making images');

                var m = stdout.substring(mulindex+1, makindex).split(' ');
                var m1 = m[4].split('x')[0];
                var m2 = m[5].split('x')[0];

                m1 = m1?parseInt(m1):1600;
                m2 = m2?parseInt(m2):768;

                var m3 = parseInt(m1+'|'+m2);

                console.log('heheheh'+m1);
                console.log('heheheh'+m2);
                console.log('heheheh'+m3);

                if(err){
                    fs.unlinkSync(fileurl);
                    res.json({code:-3,msg:stderr});
                    return;
                }

                if(stdout.indexOf('done.')==-1){
                    res.json({code:-4,msg:'转换失败'});
                    fs.unlinkSync(path.join(__dirname, '../../public/pano/'+key+'.tiles'));
                    return;
                }

                var data={
                    type: 5,
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
                    width: m3
                }

                db.Scenes.create(data).then(function(scene){

                    if(!scene){
                        res.json({code:-3,msg:'创建失败'});
                        fs.unlinkSync(fileurl);
                        return;
                    }

                    var uuid = files.uuid?files.uuid:parseInt(Math.random()*10000000)+'';
                    var group_key = utils.md5(uuid+'qson').substr(0,10);

                    db.Groups.findOne({
                        where: {
                            key: group_key
                        }
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

                                city: files.city,
                                region: files.region,
                                community: files.community,

                                building: files.building,
                                room: files.room,

                                floor:files.floor?files.floor:0,

                                apartment_halls: files.apartment_halls?files.apartment_halls:0,
                                apartment_rooms: files.apartment_rooms?files.apartment_rooms:0,
                                apartment_bathrooms: files.apartment_bathrooms?files.apartment_bathrooms:0,
                                area: files.area?files.area:0,
                                total_floor: files.total_floor?files.total_floor:0,
                                floor: files.floor?files.floor:0,
                                business_circle: files.business_circle,
                                face: '',
                                lat: (files.lat&&files.lat>0.1)?files.lat:0,
                                lng: (files.lng&&files.lng>0.1)?files.lng:0,
                                area: files.area,
                                extra: files.desc?files.desc:'{}',
                                name: files.name?files.name:'',
                                width: m3
                            }

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
                            groups_id: group.id,
                            order: JSON.parse(group.scenes_id).length
                        },{
                            where: {
                                id: scene.id
                            }
                        }).then(function(up){

                            //如果是最后一套，更新scene
                            // res.json({code:0,msg:'OK'});

                            var patharr = [
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
                                key+".tiles/mres_u/l2/4/l2_u_4_4.jpg"
                            ];
                            uploadarr(patharr, 0, res);
                        });
                    });
                });
            });
        });
    });
});

// function uploadall(key, res){

    //调用uploadFile上传
    
// };

//构造递归函数
function uploadarr(files, i, res){
    console.log(i);
    if(files[i]){

        //要上传的空间
        var bucket = 'suteng';
        //上传到七牛后保存的文件名
        var key = 'pano/' + files[i];

        var token = uptoken(bucket, key);
        //要上传文件的本地路径
        var filePath = path.join(__dirname, '../../public/pano/'+files[i]);

        uploadFile(token, key, filePath, res, function(){

            console.log('上传了第'+i+'张图片');
            uploadarr(files, ++i, res);
        });
    }else{
        res.json({code:0});
    }
}

//构造上传函数
function uploadFile(uptoken, key, localFile, res, callback) {

    var extra = new qiniu.io.PutExtra();

    qiniu.io.putFile(uptoken, key, localFile, extra, function(err, ret) {
        if(!err) {
            // 上传成功， 处理返回值
            console.log(ret.hash, ret.key, ret.persistentId);  
            callback();
        } else {
            // 上传失败， 处理返回代码
            console.log(err); 
            res.json({code:-1,msg:err});
        }
    });
}

//构造上传函数
function uptoken(bucket, key) {

    var putPolicy = new qiniu.rs.PutPolicy(bucket+":"+key);
    putPolicy.callbackUrl = 'http://wx.sz-sti.com/uploaditem/nodeupcb/'+key;
    putPolicy.callbackBody = 'filename=$(fname)&filesize=$(fsize)';
    return putPolicy.token();
}


router.post('/nodeupcb/:key',function(req,res){
    var key = req.params.key;
    // db.Scenes.update({
    //     show:11
    // },{
    //     where: {
    //         key
    //     }
    // });
    console.log('所有的往事来年无恙及恒');
    res.json({code:0,msg:'OK'});
});


module.exports= router;
