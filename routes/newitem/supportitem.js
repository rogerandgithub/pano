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

router.get('/queryFile', function (req, res) {
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

module.exports = router;
