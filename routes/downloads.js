var express = require('express');
var router = express.Router();
var db= require('./model');
var xss= require('xss');
var utils= require('./utils');

var config= require('./config');

router.get('/',function(req,res){
    res.render('download',{title:'资源中心',page:'downloads',platform:utils.getPlatform(req)});
});

router.get('/v2',function(req,res){
    res.render('download_v2',{title:'资源中心',page:'downloads',platform:utils.getPlatform(req)});
});

router.get('/houseworldtemp',function(req,res){
    res.render('download_houseworld_temp',{title:'资源中心',page:'downloads',platform:utils.getPlatform(req)});
});
router.get('/houseworld',function(req,res){
    res.render('download_houseworld',{title:'资源中心',page:'downloads',platform:utils.getPlatform(req)});
});
router.get('/temp',function(req,res){
    res.render('download_temp',{title:'资源中心',page:'downloads',platform:utils.getPlatform(req)});
});

module.exports = router;
