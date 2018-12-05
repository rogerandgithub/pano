var express = require('express');
var router = express.Router();
var db= require('../model');
var xss= require('xss');
var utils= require('../utils');
var config= require('../config');
var nodegrass = require('nodegrass');



/* GET home page. */
router.get('/', function(req, res) {
    var r = {};

    utils.login(req, res, function(userid){
        res.render('new/submit', r);
    });
});

module.exports = router;
