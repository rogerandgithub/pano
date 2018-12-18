var express = require('express');
var router = express.Router();
var db = require('../model');
var xss = require('xss');
var utils = require('../utils');
var config = require('../config');
var nodegrass = require('nodegrass');
var fs = require('fs');
var path = require('path');
var request = require('request');
var qiniu = require('qiniu');


router.get('/', function (req, res) {
    var r = {};

    utils.login(req, res, function (userid) {
        db.Users.findOne({
            where: {
                id: userid
            }
        }).then(function (user) {
            r.user = user;
            res.render('newitem/support', r);
        })
    });
});


router.post('/test', function (req, res) {
    //db.Scenes.sequelize.query("select * from scenes where id in (select max(id) as id from scenes group by deviceid)", {
    db.Scenes.sequelize.query("select * from scenes where `key` = '21c40c1658'", {
        model: db.Scenes
    }).then(function (scenesList) {
        db.Scenes.sequelize.query('select * from support order by deviceid asc', {
            model: db.Support
        }).then(function (supportList) {
            
        });
    });
});


router.post('/queryFile', function (req, res) {
    var supportList = [];
    db.Support.findAll({
        where: {
            deviceid: req.body.deviceid
        }
    }).then(function (support) {
        if (support) {
            supportList = support;
            res.json({supportList: supportList, code: 0, msg: 'OK'});
        } else {
            res.json({code: 1, msg: 'NO'});
        }
    });
});

//构造上传函数
function uptoken(bucket, key) {
    var putPolicy = new qiniu.rs.PutPolicy(bucket + ":" + key);
    putPolicy.callbackUrl = 'http://120.76.27.228/supportitem/nodeupcb';
    putPolicy.callbackBody = 'filename=$(fname)&filesize=$(fsize)';
    return putPolicy.token();
}

//七牛云CDN上传回调
router.post('/nodeupcb', function (req, res) {
    res.json({code: 0, msg: 'OK'});
});

//构造上传函数
function uploadFile(uptoken, key, localFile, callback) {
    var extra = new qiniu.io.PutExtra();
    qiniu.io.putFile(uptoken, key, localFile, extra, function (err, ret) {
        callback();
    });
}

//上传图片到七牛云
function uploadFileToQiniu(key, fileName) {
    var bucket = 'suteng';    //要上传的空间
    var qiniu_key = 'calibration/' + key + '/' + fileName;    //上传到七牛后保存的文件名
    var token = uptoken(bucket, qiniu_key);    //要上传文件的本地路径
    var filePath = path.join(__dirname, '../../../../Downloads/' + key + '/' + fileName);    //本地文件路径
    //var filePath = path.join(__dirname, '../../public/pano/pano2T/' + key + '/' + fileName);
    uploadFile(token, qiniu_key, filePath, function (err) {
        console.log("上传成功");
    });
}

module.exports = router;
