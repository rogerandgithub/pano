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
var deploy = require('../../config/deploy').config;

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
    db.Scenes.sequelize.query("select * from scenes where id in (select max(id) as id from scenes group by deviceid) and deviceid != ''", {
        model: db.Scenes
    }).then(function (scenesList) {
        db.Scenes.sequelize.query('select * from support order by deviceid asc', {
            model: db.Support
        }).then(function (supportList) {
            scenesList.forEach(function (scenes, index) {
                var localFilePath = getLocalFilePath(scenes);
                scenes.localCalibrationUrl = localFilePath.localCalibrationUrl;
                scenes.localCameraUrl = localFilePath.localCameraUrl;

                if (!fs.existsSync(scenes.localCalibrationUrl) || !fs.existsSync(scenes.localCameraUrl)) {
                    //console.log("文件不存在, 开始下一轮循环: " + index);
                    return;
                }

                scenes.localCalibrationData = fs.readFileSync(scenes.localCalibrationUrl);
                scenes.localCameraData = fs.readFileSync(scenes.localCameraUrl);
                var pList = [];
                pList.push(new Promise(function (resolve, reject) {
                    var count = 0;
                    supportList.forEach(function (support, index) {
                        if (scenes.deviceid == support.deviceid) {
                            count++;
                            compareCalibrationFile(scenes, support, function (calibrationResult) {
                                compareCameraFile(scenes, support, function (cameraResult) {
                                    //这里比较的值就有错误， 需要排查是文件原因还是网络原因
                                    return;
                                    resolve({
                                        calibrationResult: calibrationResult,
                                        cameraResult: cameraResult,
                                        support: support
                                    });
                                });
                            });
                        }
                    });
                    if (count == 0) {
                        console.log("没有发现文件");
                        resolve({
                            calibrationResult: false,
                            cameraResult: false,
                            support: {}
                        });
                    }
                }));
                Promise.all(pList).then(function (resultList) {
                    var calibrationExist = false;
                    var cameraExist = false;
                    var oldSupport = {};
                    resultList.forEach(function (result) {
                        if (result.calibrationResult) {
                            calibrationExist = true;
                            oldSupport = result.support;
                        }
                        if (result.cameraResult) {
                            cameraExist = true;
                            oldSupport = result.support;
                        }
                    });
                    if (!calibrationExist && !cameraExist) {
                        var bucket = 'suteng';
                        var qiniu_key = 'calibration/' + scenes.key + '/' + 'calibration_2cam.xml';
                        var token = uptoken(bucket, qiniu_key);
                        uploadFile(token, qiniu_key, scenes.localCalibrationUrl, function (calibrationErr, calibrationRet) {
                            qiniu_key = 'calibration/' + scenes.key + '/' + 'camera.xml';
                            token = uptoken(bucket, qiniu_key);
                            uploadFile(token, qiniu_key, scenes.localCameraUrl, function (cameraErr, cameraRet) {
                                var calibrationCallback = JSON.parse(calibrationErr.error);
                                var cameraCallback = JSON.parse(cameraErr.error);
                                var data = {
                                    key: scenes.key,
                                    deviceid: scenes.deviceid,
                                    calibration_2cam_xml_url: deploy.cdnPath + "/" + calibrationCallback.key,
                                    camera_xml_url: deploy.cdnPath + "/" + cameraCallback.key
                                }
                                db.Support.create(data).then(function (result) {
                                    console.log("两个文件均不相同, 新增数据成功");
                                });
                            });
                        });
                    } else if (!calibrationExist || !cameraExist) {
                        var filePath = !calibrationExist ? scenes.localCalibrationUrl : scenes.localCameraUrl;
                        var fileName = !calibrationExist ? 'calibration_2cam.xml' : 'camera.xml';
                        var bucket = 'suteng';
                        var qiniu_key = 'calibration/' + scenes.key + '/' + fileName;
                        var token = uptoken(bucket, qiniu_key);
                        uploadFile(token, qiniu_key, filePath, function (err, ret) {
                            var callback = JSON.parse(err.error);
                            var data = {};
                            if (!calibrationExist) {
                                data = {
                                    key: scenes.key,
                                    deviceid: scenes.deviceid,
                                    calibration_2cam_xml_url: deploy.cdnPath + "/" + callback.key,
                                    camera_xml_url: oldSupport.camera_xml_url
                                }
                            } else {
                                data = {
                                    key: scenes.key,
                                    deviceid: scenes.deviceid,
                                    calibration_2cam_xml_url: oldSupport.calibration_2cam_xml_url,
                                    camera_xml_url: deploy.cdnPath + "/" + callback.key
                                }
                            }
                            db.Support.create(data).then(function (result) {
                                console.log("只有一个文件存在不相同, 新增数据成功");
                            });
                        });
                    } else {
                        console.log("两个文件均相同, 不执行任何操作");
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
        // if (fs.existsSync(writeStream.path)) {
        //     fs.unlinkSync(writeStream.path);
        // }
        scenes.localCalibrationData.toString() == downCalibrationData.toString() ? callback(true) : callback(false);
    });
}


var compareCameraFile = function (scenes, support, callback) {
    var readStream = request(support.camera_xml_url);
    var writeStream = fs.createWriteStream(__dirname + '/camera.xml');
    readStream.pipe(writeStream);
    writeStream.on("finish", function () {
        var downCameraData = fs.readFileSync(writeStream.path);
        // if (fs.existsSync(writeStream.path)) {
        //     fs.unlinkSync(writeStream.path);
        // }
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
        callback(err, ret);
    });
}


module.exports = router;
