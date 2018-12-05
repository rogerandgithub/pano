var express = require('express');
var router = express.Router();
var db= require('./model');
var xss= require('xss');
var utils= require('./utils');
var qr = require('qr-image');
var https = require('https');
var qs = require('querystring');

var config= require('./config');
var nodegrass = require('nodegrass');
var request = require('request');
var when = require('when');


router.get('/', function(req, res){
    res.render('resetpwd');
})


module.exports = router;
