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
    var files = getCalibrationFile(req, res);
});

router.post('/sssssssssssss', function (req, res) {
    db.Scenes.sequelize.query('select * from scenes where id in (select max(id) as id from scenes group by deviceid)', {
        model: db.Scenes
    }).then(function (scenes) {
        db.Scenes.sequelize.query('select * from support order by deviceid asc', {
            model: db.Support
        }).then(function (support) {
            for (var key in scenes) {
                var isExist = false;
                var calibrationUrl = '';
                var cameraUrl = '';
                for (var keys in support) {
                    if (scenes[key].dataValues.deviceid == support[keys].dataValues.deviceid) {
                        isExist = true;
                        if (scenes[key].dataValues.key != support[keys].dataValues.key) {
                            if (calibrationUrl == '') {
                                var files = getCalibrationFile(scenes[key].dataValues, support[keys].dataValues);
                                calibrationUrl = compareFile(files[0], files[1]);
                            }
                            if (cameraUrl == '') {
                                var files = getCameraFile(scenes[key].dataValues, support[keys].dataValues);
                                cameraUrl = compareFile(files[0], files[1]);
                            }
                        }
                    }
                }
                if (!isExist) {
                    //如果不存在则需要新增记录
                    // db.Support.create({
                    //     key: scenes[key].dataValues.key,
                    //     deviceid: scenes[key].dataValues.deviceid,
                    //     calibration_2cam_xml_url: scenes[key].dataValues.key,
                    //     camera_xml_url: scenes[key].dataValues.key
                    // }).then(function (result) {
                    //     console.log(result);
                    // }).catch(function (ex) {
                    //     console.log(ex);
                    // });
                }
            }
        });
    });
});

function getCalibrationFile(scenes, support) {
    var oldUrl = 'http://qncdn.sz-sti.com/pano/d7be08ecf9.jpg'
    var readStream = request(oldUrl);
    var writeStream = fs.createWriteStream(__dirname + '/test.jpg');
    readStream.pipe(writeStream);
    writeStream.on("finish", function () {
        var newFileSrc = path.join(__dirname, '../../../../Downloads/00005fa875/calibration_2cam.xml');
        fs.readFile(newFileSrc, function (err, data) {
            fs.readFile(writeStream.path, function (err, datas) {
                //console.log(datas.toString());
            });
        });
    });
    return '';
}

function getCameraFile(scenes, support) {
    return [];
}

function compareFile(file, files) {

    return '';
}


router.post('/queryFile', function (req, res) {
    var supportObj = {};
    db.Support.findOne({
        where: {
            deviceid: req.body.deviceid
        }
    }).then(function (support) {
        if (support) {
            supportObj = {
                "id": support.dataValues.id,
                "deviceid": support.dataValues.deviceid,
                "calibration_2cam_xml_name": "calibration_2cam_.xml",
                "calibrationUrl": support.dataValues.calibrationUrl,
                "camera_xml_name": "camera.xml",
                "cameraUrl": support.dataValues.cameraUrl
            };
            res.json({supportObj: supportObj, code: 0, msg: 'OK'});
        } else {
            res.json({code: 1, msg: 'NO'});
        }
    });
});
//
module.exports = router;
