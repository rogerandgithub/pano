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
            downloadAllFile(supportList, function (resultList) {
                executeCompare(scenesList, resultList);
            });
        });
    });
});


var downloadAllFile = function (supportList, callback) {
    var tempFilePath = __dirname + '/temp_file/';
    if (fs.existsSync(tempFilePath)) {
        var files = fs.readdirSync(tempFilePath);
        files.forEach(function (file, index) {
            fs.unlinkSync(tempFilePath + file);
        });
        fs.rmdirSync(tempFilePath);
        fs.mkdirSync(tempFilePath);
    } else {
        fs.mkdirSync(tempFilePath);
    }

    //清除本地 temp_file 文件夹开关, 只需要取消 return 的注释即可
    //return;

    var pList = [];
    supportList.forEach(function (support, index) {
        pList.push(new Promise(function (resolve, reject) {
            var tempCalibrationPath = tempFilePath + support.deviceid + '_' + support.key + '_calibration_2cam.xml';
            var tempCameraPath = tempFilePath + support.deviceid + '_' + support.key + '_camera.xml';
            request(support.calibration_2cam_xml_url).pipe(fs.createWriteStream(tempCalibrationPath)).on("finish", function () {
                request(support.camera_xml_url).pipe(fs.createWriteStream(tempCameraPath)).on("finish", function () {
                    support.downCalibrationPath = tempCalibrationPath;
                    support.downCameraPath = tempCameraPath;
                    resolve(support);
                });
            });
        }));
    });
    Promise.all(pList).then(function (resultList) {
        callback(resultList);
    });
}


var executeCompare = function (scenesList, supportList) {
    scenesList.forEach(function (scenes, index) {
        var localFilePath = getLocalFilePath(scenes);
        scenes.localCalibrationPath = localFilePath.localCalibrationPath;
        scenes.localCameraPath = localFilePath.localCameraPath;

        if (!fs.existsSync(scenes.localCalibrationPath) || !fs.existsSync(scenes.localCameraPath)) {
            return;
        }

        scenes.localCalibrationFile = fs.readFileSync(scenes.localCalibrationPath);
        scenes.localCameraFile = fs.readFileSync(scenes.localCameraPath);
        var pList = [];
        var count = 0;
        supportList.forEach(function (support, index) {
            if (scenes.deviceid == support.deviceid) {
                pList.push(new Promise(function (resolve, reject) {
                    count++;
                    compareCalibrationFile(scenes, support, function (calibrationResult) {
                        compareCameraFile(scenes, support, function (cameraResult) {
                            resolve({
                                calibrationResult: calibrationResult,
                                cameraResult: cameraResult,
                                support: support
                            });
                        });
                    });
                }));
            }
        });
        if (count == 0) {
            console.log("没有发现文件");
            pList.push(new Promise(function (resolve, reject) {
                resolve({
                    calibrationResult: false,
                    cameraResult: false,
                    support: {}
                });
            }));
        }
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
                uploadFile(token, qiniu_key, scenes.localCalibrationPath, function (calibrationErr, calibrationRet) {
                    qiniu_key = 'calibration/' + scenes.key + '/' + 'camera.xml';
                    token = uptoken(bucket, qiniu_key);
                    uploadFile(token, qiniu_key, scenes.localCameraPath, function (cameraErr, cameraRet) {
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
                var filePath = !calibrationExist ? scenes.localCalibrationPath : scenes.localCameraPath;
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
}


var getLocalFilePath = function (scenes) {
    var localCalibrationPath = path.join(__dirname, '../../public/pano/pano2T/' + scenes.key + '/calibration_2cam.xml');
    var localCameraPath = path.join(__dirname, '../../public/pano/pano2T/' + scenes.key + '/camera.xml');
    return {localCalibrationPath: localCalibrationPath, localCameraPath: localCameraPath};
}


var compareCalibrationFile = function (scenes, support, callback) {
    var downCalibrationFile = fs.readFileSync(support.downCalibrationPath);
    scenes.localCalibrationFile.toString() == downCalibrationFile.toString() ? callback(true) : callback(false);
}


var compareCameraFile = function (scenes, support, callback) {
    var downCameraFile = fs.readFileSync(support.downCameraPath);
    scenes.localCameraFile.toString() == downCameraFile.toString() ? callback(true) : callback(false);
}


router.post('/queryFile', function (req, res) {
    var supportList = [];
    db.Support.findAll({
        where: {
            deviceid: req.body.deviceid
        }
    }).then(function (supportList) {
        if (supportList) {
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
