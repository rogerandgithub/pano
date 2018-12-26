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
var dateFormat = require('dateformat');

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


router.get('/updateFileLibrary', function (req, res) {
    db.Scenes.sequelize.query("select a.* from scenes as a inner join (select max(id) as id from scenes where deviceid != '' group by deviceid) as b on (a.id = b.id)", {
        model: db.Scenes
    }).then(function (scenesList) {
        db.Scenes.sequelize.query('select * from support order by deviceid asc', {
            model: db.Support
        }).then(function (supportList) {
            downloadAllFile(supportList, function (resultList) {
                executeCompare(scenesList, resultList, function () {
                    res.json({code: 0, msg: 'OK'});
                });
            });
        });
    });
});


var downloadAllFile = function (supportList, callback) {
    var tempFilePath = __dirname + '/temp_file/';
    if (fs.existsSync(tempFilePath)) {
        console.log("temp_file 目录已存在, 先清空再下载");
        var files = fs.readdirSync(tempFilePath);
        files.forEach(function (file, index) {
            fs.unlinkSync(tempFilePath + file);
        });
        fs.rmdirSync(tempFilePath);
        fs.mkdirSync(tempFilePath);
    } else {
        console.log("temp_file 目录不存在, 新建目录");
        fs.mkdirSync(tempFilePath);
    }

    //清除本地 temp_file 文件夹开关, 只需要取消 return 的注释即可
    //return;

    var processList = [];
    supportList.forEach(function (support, index) {
        processList.push(new Promise(function (resolve, reject) {
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
    Promise.all(processList).then(function (resultList) {
        console.log("下载所有文件成功");
        callback(resultList);
    });
}


var executeCompare = function (scenesList, supportList, callback) {
    var allProcessList = [];
    scenesList.forEach(function (scenes, index) {
        allProcessList.push(new Promise(function (resolve, reject) {
            resolve();
        }));

        var localFilePath = getLocalFilePath(scenes);
        scenes.localCalibrationPath = localFilePath.localCalibrationPath;
        scenes.localCameraPath = localFilePath.localCameraPath;

        if (!fs.existsSync(scenes.localCalibrationPath) || !fs.existsSync(scenes.localCameraPath)) {
            return;
        }

        scenes.localCalibrationFile = fs.readFileSync(scenes.localCalibrationPath);
        scenes.localCameraFile = fs.readFileSync(scenes.localCameraPath);
        var processList = [];
        var count = 0;
        supportList.forEach(function (support, index) {
            if (scenes.deviceid == support.deviceid) {
                processList.push(new Promise(function (resolve, reject) {
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
            processList.push(new Promise(function (resolve, reject) {
                resolve({
                    calibrationResult: false,
                    cameraResult: false,
                    support: {}
                });
            }));
        }
        Promise.all(processList).then(function (resultList) {
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
                var calibration_qiniu_key = 'calibration/' + scenes.key + '/' + 'calibration_2cam.xml';
                var calibration_token = uptoken(bucket, calibration_qiniu_key);
                uploadFile(calibration_token, calibration_qiniu_key, scenes.localCalibrationPath, function (calibrationErr, calibrationRet) {
                    var camera_qiniu_key = 'calibration/' + scenes.key + '/' + 'camera.xml';
                    var camera_token = uptoken(bucket, camera_qiniu_key);
                    uploadFile(camera_token, camera_qiniu_key, scenes.localCameraPath, function (cameraErr, cameraRet) {
                        if (calibrationRet.code == 0 && cameraRet.code == 0) {
                            var data = {
                                key: scenes.key,
                                deviceid: scenes.deviceid,
                                calibration_2cam_xml_url: deploy.cdnPath + "/" + calibration_qiniu_key,
                                camera_xml_url: deploy.cdnPath + "/" + camera_qiniu_key,
                                createdAt: dateFormat(new Date(), 'yyyy-mm-dd HH:mm:ss'),
                                updatedAt: dateFormat(new Date(), 'yyyy-mm-dd HH:mm:ss')
                            }
                            db.Support.create(data).then(function (result) {
                                console.log("两个文件均不相同, 新增数据成功");
                            });
                        } else {
                            console.log("两个文件均不相同, 新增数据失败");
                        }
                    });
                });
            } else if (!calibrationExist || !cameraExist) {
                var filePath = !calibrationExist ? scenes.localCalibrationPath : scenes.localCameraPath;
                var fileName = !calibrationExist ? 'calibration_2cam.xml' : 'camera.xml';
                var bucket = 'suteng';
                var qiniu_key = 'calibration/' + scenes.key + '/' + fileName;
                var token = uptoken(bucket, qiniu_key);
                uploadFile(token, qiniu_key, filePath, function (err, ret) {
                    if (ret.code == 0) {
                        var data = {};
                        if (!calibrationExist) {
                            data = {
                                key: scenes.key,
                                deviceid: scenes.deviceid,
                                calibration_2cam_xml_url: deploy.cdnPath + "/" + qiniu_key,
                                camera_xml_url: oldSupport.camera_xml_url,
                                createdAt: dateFormat(new Date(), 'yyyy-mm-dd HH:mm:ss'),
                                updatedAt: dateFormat(new Date(), 'yyyy-mm-dd HH:mm:ss')
                            }
                        } else {
                            data = {
                                key: scenes.key,
                                deviceid: scenes.deviceid,
                                calibration_2cam_xml_url: oldSupport.calibration_2cam_xml_url,
                                camera_xml_url: deploy.cdnPath + "/" + qiniu_key,
                                createdAt: dateFormat(new Date(), 'yyyy-mm-dd HH:mm:ss'),
                                updatedAt: dateFormat(new Date(), 'yyyy-mm-dd HH:mm:ss')
                            }
                        }
                        db.Support.create(data).then(function (result) {
                            console.log("只有一个文件存在不相同, 新增数据成功");
                        });
                    } else {
                        console.log("只有一个文件存在不相同, 新增数据失败");
                    }
                });
            } else {
                console.log("两个文件均相同, 不执行任何操作");
            }
        });
    });
    Promise.all(allProcessList).then(function () {
        callback();
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
        },
        order: "id DESC"
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
