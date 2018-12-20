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
            scenesList.forEach(function (scenes) {
                var localFilePath = getLocalFilePath(scenes);
                scenes.localCalibrationData = fs.readFileSync(localFilePath.localCalibrationUrl);
                scenes.localCameraData = fs.readFileSync(localFilePath.localCameraUrl);
                var pList = [];
                supportList.forEach(function (support) {
                    pList.push(new Promise(function (resolve, reject) {
                        if (scenes.deviceid == support.deviceid) {
                            compareCalibrationFile(scenes, support, function (calibrationResult) {
                                compareCameraFile(scenes, support, function (cameraResult) {
                                    resolve({
                                        calibrationResult: calibrationResult,
                                        cameraResult: cameraResult,
                                        scenes: scenes,
                                        support: support
                                    });
                                });
                            });
                        }
                    }))
                });
                Promise.all(pList).then(function (resultList) {
                    var calibrationExist = false;
                    var cameraExist = false;

                    var currentScenes = {};
                    var oldSupport = {};
                    resultList.forEach(function (result) {
                        currentScenes = result.scenes;
                        if (result.calibrationResult) {
                            calibrationExist = true;
                            oldSupport = result.support;
                        }
                        if (result.cameraResult) {
                            cameraExist = true;
                            oldSupport = result.support;
                        }
                    });

                    if (!calibrationExist && !cameraExist) {    //如果两个文件都不存在相同

                    } else if (!calibrationExist || !cameraExist) {    //如果只有一个文件存在相同

                    } else {    //两个文件均相同
                        //Nothing to do...
                    }

                });
            });
        });
    });
});


var getLocalFilePath = function (scenes) {
    var localCalibrationUrl = path.join(__dirname, '../../public/pano/pano2T/' + scenes.key + '/calibration_2cam.xml');
    var localCameraUrl = path.join(__dirname, '../../public/pano/pano2T/' + scenes.key + '/camera.xml');
    return {localCalibrationUrl: localCalibrationUrl, localCameraUrl: localCameraUrl};
}


var compareCalibrationFile = function (scenes, support, callback) {
    var readStream = request(support.calibration_2cam_xml_url);
    var writeStream = fs.createWriteStream(__dirname + '/calibration_2cam.xml');
    readStream.pipe(writeStream);
    writeStream.on("finish", function () {
        var downCalibrationData = fs.readFileSync(writeStream.path);
        if (fs.existsSync(writeStream.path)) {
            //fs.unlinkSync(writeStream.path);
        }
        scenes.localCalibrationData.toString() == downCalibrationData.toString() ? callback(true) : callback(false);
    });
}


var compareCameraFile = function (scenes, support, callback) {
    var readStream = request(support.camera_xml_url);
    var writeStream = fs.createWriteStream(__dirname + '/camera.xml');
    readStream.pipe(writeStream);
    writeStream.on("finish", function () {
        var downCameraData = fs.readFileSync(writeStream.path);
        if (fs.existsSync(writeStream.path)) {
            //fs.unlinkSync(writeStream.path);
        }
        scenes.localCameraData.toString() == downCameraData.toString() ? callback(true) : callback(false);
    });
}


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
