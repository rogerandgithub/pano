var express = require('express');
var router = express.Router();
var db = require('../model');
var xss = require('xss');
var utils = require('../utils');
var config = require('../config');
var nodegrass = require('nodegrass');


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
    db.Scenes.findAll({
        attributes: [
            "id",
            "deviceid",
            "createdAt",
            "updatedAt",
            [sequelize.fn('COUNT', sequelize.col('id')), 'max_id']
        ],
        where: {},
        group: "deviceid"
    }).then(function (scenes) {
        //console.log(scenes);

    });
});


router.post('/queryFile', function (req, res) {
    var supportObj = {};
    db.Support.findOne({
        where: {
            camera_id: req.body.cameraId
        }
    }).then(function (support) {
        console.log(support);
        if (support) {
            supportObj = {
                "id": support.dataValues.id,
                "camera_id": support.dataValues.camera_id,
                "calibration_2cam_xml_name": "calibration_2cam_.xml",
                "calibration_2cam_xml_url": support.dataValues.calibration_2cam_xml_url,
                "camera_xml_name": "camera.xml",
                "camera_xml_url": support.dataValues.camera_xml_url
            };
            res.json({supportObj: supportObj, code: 0, msg: 'OK'});
        } else {
            res.json({code: 1, msg: 'NO'});
        }
    });
});

module.exports = router;
