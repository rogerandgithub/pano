var express = require('express');
var router = express.Router();
var config= require('./config');
var db= require('./model');
var when = require('when');
var utils= require('./utils');
var request= require('request');
var cheerio= require('cheerio');
var fs = require("fs");
var cityArr = require('./citystr');
var relation = require('./relation');
var value = require('./value');


router.get('/updatefile', function(req, res){

    utils.savefile(function(){
         res.json({code:0,msg:'已更新文件'});
    });

});

router.get('/mtspider', function(req, res){

    function htmlDecode(str) {
        return str.replace(/&#(x)?([^&]{1,5});?/g,function($,$1,$2) {
            return String.fromCharCode(parseInt($2 , $1 ? 16:10));
        });
    };

    var pro_arr = [], pro_key = 0, city_arr = [];
    for(var i in relation){
        pro_arr.push(i);
        city_arr = city_arr.concat(relation[i]);
    }

    savepro(pro_arr);
    res.json('后台正在保存数据');

    function savepro(pro_arr){

        var province = value[pro_arr[pro_key]];

        db.Citys.create({

            name: province,
            upid: 0,
            level: 1

        }).then(function(newpro){

            if(!newpro)return false;

            console.log('保存了省份'+newpro.name+', id是'+newpro.id);

            var city_key = 0, city_arr = relation[pro_arr[pro_key]];

            savecity(city_arr, newpro.id);

        });
    }

    
    var city_key = 0;

    function savecity(city_arr, proid){

        var city = value[city_arr[city_key]];

        db.Citys.create({

            name: city,
            upid: proid,
            level: 2

        }).then(function(newcity){

            if(!newcity)return false;

            console.log('保存了城市'+newcity.name+', id是'+newcity.id);

            saveregion(city_arr[city_key], newcity.id, city_arr, proid);

        })
    }

    var region_key = 0;
    var region_arr = {};

    function saveregion(city_name, cityid, city_arr, proid){

        if(!region_arr[city_name]){

            //如果区域数组为空，则先获取区域
            region_arr[city_name] = [];
            region_arr[city_name+'_urlkey'] = [];

            var options = {
                url: 'http://'+city_name+'.meituan.com/?mtt=1.index%2Ffloornew.0.0.in8muosq',
                headers: {
                    'User-Agent': req.headers['user-agent']
                },
                timeout: 30000
            };

            request(options, function(error, response, body){

                if(error)console.log(error);

                if (!error && response.statusCode == 200) {

                    $ = cheerio.load(body);

                    var back_region = $('.J-filter__geo .filter-strip__list li a');
                    // var back_region = $('.geo-filter-wrapper .J-filter-list li a');
                    

                    for (var j = back_region.length - 1; j >= 0; j--) {

                        if(back_region.eq(j).html()&&back_region.eq(j).html() != '全部'){

                            region_arr[city_name].push(htmlDecode(back_region.eq(j).html()));
                            var url_key = back_region.eq(j).attr('href');
                            // .split('?')[0].split('/');
                            // url_key = url_key[url_key.length-1];
                            region_arr[city_name+'_urlkey'].push(url_key);
                        }

                    };
                    // console.log(back_region.length);
                    // res.json(body);
                    // return;

                    if(region_arr[city_name].length != 0){
                        
                        saveregion(city_name, cityid, city_arr, proid);

                    }else{

                        if(city_arr[city_key+1]){

                            console.log('正在保存下一个城市');
                            city_key++;
                            savecity(city_arr, proid);

                        }else{

                            console.log('该省下面的城市保存完毕');
                            //初始化city_key
                            city_key = 0;

                            if(pro_arr[pro_key+1]){
                                console.log('正在保存下一个省');
                                pro_key++;
                                savepro(pro_arr);
                            }else{
                                console.log('保存完毕');
                            }

                        }
                    }
                    
                }

            });

        }else{

            var region = region_arr[city_name][region_key];
            db.Citys.create({

                name: region,
                upid: cityid,
                level: 3

            }).then(function(newregion){

                if(!newregion)return false;

                console.log('保存了区域'+newregion.name+', id是'+newregion.id);

                savebusiness(newregion.id, city_name, cityid, city_arr, proid);

            });
        }
    }

    var busi_key = 0;
    var busi_arr = {};

    function savebusiness(regid, city_name, cityid, city_arr, proid){

        var url = region_arr[city_name+'_urlkey'][region_key];

        if(!busi_arr[regid]){

            busi_arr[regid] = [];

            //如果商圈数组为空，则先获取商圈
            var boptions = {
                url: url.split('?')[0],
                headers: {
                    'User-Agent': req.headers['user-agent']
                },
                timeout: 30000
            };

            request(boptions, function(error, response, body){

                if(error)console.log(error);

                if (!error && response.statusCode == 200) {

                    $ = cheerio.load(body);

                    var area = $('.J-area-block .item a');

                    for (var i = area.length - 1; i >= 1; i--) {
                        if(area.eq(i).html()){
                            busi_arr[regid].push(htmlDecode(area.eq(i).html()));
                        }
                    };

                    console.log(busi_arr[regid]);
                    // res.json(body);
                    // return;


                    if(busi_arr[regid].length==0){

                        console.log(busi_arr[regid]);

                        db.Citys.create({
                            name: region_arr[city_name][region_key]+'商圈',
                            upid: regid,
                            level: 4
                        }).then(function(newbusi){

                            if(!newbusi)return false;
                            console.log('保存了商圈'+newbusi.name+'商圈, id是'+newbusi.id);

                            if(region_arr[city_name][region_key+1]){

                                region_key++;
                                saveregion(city_name, cityid, city_arr, proid)

                            }else{

                                region_key = 0;

                                if(city_arr[city_key+1]){

                                    console.log('正在保存下一个城市');
                                    city_key++;
                                    savecity(city_arr, proid);

                                }else{

                                    console.log('该省下面的城市保存完毕');
                                    //初始化city_key
                                    city_key = 0;

                                    if(pro_arr[pro_key+1]){
                                        console.log('正在保存下一个省');
                                        pro_key++;
                                        savepro(pro_arr);
                                    }else{
                                        console.log('省份保存完毕');
                                    }

                                }

                            }
                        });
                        
                    }else{

                        savebusiness(regid, city_name, cityid, city_arr, proid);
                    }
                }
            });

        }else{
            var business = busi_arr[regid][busi_key];

            db.Citys.create({
                name: business,
                upid: regid,
                level: 3
            }).then(function(newbusi){

                if(!newbusi)return false;
                console.log('保存了商圈'+newbusi.name+', id是'+newbusi.id);

                if(busi_arr[regid][busi_key+1]){

                    busi_key++;
                    savebusiness(regid, city_name, cityid, city_arr, proid);

                }else{

                    console.log('该区域下的商圈保存完毕');
                    busi_key = 0;

                    if(region_arr[city_name][region_key+1]){

                        region_key++;
                        saveregion(city_name, cityid, city_arr, proid)

                    }else{

                        region_key = 0;

                        if(city_arr[city_key+1]){

                            console.log('正在保存下一个城市');
                            city_key++;
                            savecity(city_arr, proid);

                        }else{

                            console.log('该省下面的城市保存完毕');
                            //初始化city_key
                            city_key = 0;

                            if(pro_arr[pro_key+1]){
                                console.log('正在保存下一个省');
                                pro_key++;
                                savepro(pro_arr);
                            }else{
                                console.log('省份保存完毕');
                            }

                        }

                    }

                }

            });
            
        }

    };

});




router.get('/savecity', function(req, res){
    // cityArr = cityArr.slice(0, 10);
    res.json({});
    var i = 0;
    function save(cityArr){
        var city = cityArr[i];
        db.Citys.findOne({
            where:{
                name:city[5]
            }
        }).then(function(city1){

            if(!city1){

                db.Citys.create({
                    name:city[5],
                    level:1,
                    upid:0
                }).then(function(npro){
                    db.Citys.create({
                        name:city[4],
                        level:2,
                        upid:npro.id
                    }).then(function(ncity){
                        db.Citys.create({
                            name:city[3],
                            level:3,
                            upid:ncity.id
                        }).then(function(nregion){
                            db.Citys.create({
                                name:city[1],
                                level:4,
                                upid:nregion.id
                            }).then(function(nbusi){
                                if(cityArr[i+1]){
                                    i++;
                                    save(cityArr);
                                }else{
                                    console.log(nbusi.id);
                                }
                            })
                        });
                    })
                });

            }else{

                db.Citys.findOne({
                    where:{
                        name:city[4]
                    }
                }).then(function(ncity1){

                    if(!ncity1){

                        db.Citys.create({
                            name:city[4],
                            level:2,
                            upid:city1.id
                        }).then(function(ncity){
                            db.Citys.create({
                                name:city[3],
                                level:3,
                                upid:ncity.id
                            }).then(function(nregion){
                                db.Citys.create({
                                    name:city[1],
                                    level:4,
                                    upid:nregion.id
                                }).then(function(nbusi){
                                    if(cityArr[i+1]){
                                        i++;
                                        save(cityArr);
                                    }else{
                                        console.log(nbusi.id);
                                    }
                                })
                            });
                        })

                    }else{

                        db.Citys.findOne({
                            where:{
                                name: city[3]
                            }
                        }).then(function(region){

                            if(!region){

                                db.Citys.create({
                                    name:city[3],
                                    level:3,
                                    upid:ncity1.id
                                }).then(function(nregion){
                                    db.Citys.create({
                                        name:city[1],
                                        level:4,
                                        upid:nregion.id
                                    }).then(function(nbusi){
                                        if(cityArr[i+1]){
                                            i++;
                                            save(cityArr);
                                        }else{
                                            console.log(nbusi.id);
                                        }
                                    })
                                });

                            }else{

                                db.Citys.create({
                                    name:city[1],
                                    level:4,
                                    upid:region.id
                                }).then(function(nbusi){
                                    if(cityArr[i+1]){
                                        i++;
                                        save(cityArr);
                                    }else{
                                        console.log(nbusi.id);
                                    }
                                })

                            }

                        })

                    }

                })

            }

        });
    }

    save(cityArr);
});

router.get('/58spider', function(req, res){

    var options = {
        url: 'http://www.58.com/duanzu/changecity/?PGTID=0d300009-0067-6ee7-539a-da11724c2470&ClickID=5',
        headers: {
            'User-Agent': req.headers['user-agent']
        },
        timeout: 15000
    };

    var province_and_city_obj, regions_obj, business_obj;
    request(options, callback);
     
    function callback(error, response, body) {
        if(error)console.log(error);
        if (!error && response.statusCode == 200) {

            $ = cheerio.load(body);

            var province = $('#clist dt');
            var provinceData = [];

            var cityurl = $('#clist dd');
            var result = [];
            var provinceId = 1000;

            for(var i in province){

                if(i<28&&province.eq(i).text()&&province.eq(i).text()!='热门')
                {
                    var provinceObj = {};
                    var urlArr = [];

                    for(var j in cityurl){
                        if(cityurl.eq(i).children().eq(j).text()){

                            var cityId = j<10?provinceId+''+0+j:provinceId+''+j;
                            var urlObj = {};

                            urlObj.id = cityId;
                            urlObj.cname = cityurl.eq(i).children().eq(j).text();
                            urlObj.url = cityurl.eq(i).children().eq(j).attr('href');

                            // (function(pname, cname){
                            //     db.Citys.findOne({
                            //         where:{
                            //             name: pname
                            //         }
                            //     }).then(function(pro){
                            //         if(!pro)return;
                            //         db.Citys.create({
                            //             name: cname,
                            //             upid: pro.id,
                            //             level:2
                            //         });
                            //     });
                            // })(province.eq(i).text(), urlObj.cname);
                            
                            urlArr.push(urlObj);
                        }
                    }

                    provinceObj.pname = province.eq(i).text();
                    provinceObj.id = provinceId;
                    provinceObj.city = urlArr;

                    // db.Citys.create({
                    //     name: provinceObj.pname,
                    //     upid: 0,
                    //     level: 1
                    // })

                    result.push(provinceObj);
                    provinceId++;
                }

            }

            province_and_city_obj = result;

            getRegions(result);
            res.json(result);
        }
    }

    function getRegions(provinceArr){

        var provinceCityRegion =[];
        var k = 0;

        provincebackcall(provinceArr);

        function provincebackcall(provinceArr){

            var j = 0;
            var city = provinceArr[k].city;
            // var pname = provinceArr[k].pname;
            citybackcall(city);

            function citybackcall(cityArr){

                var options = {
                    url: cityArr[j].url+'?PGTID=0d300009-0071-1faa-6102-7e4ba59e5500&ClickID=4',
                    headers: {
                        'User-Agent': req.headers['user-agent']
                    },
                    timeout: 15000
                };

                request(options, function(error, response, body) {

                    if(error)console.log(error);

                    if (!error && response.statusCode == 200) {

                        $ = cheerio.load(body);

                        var regionurl = $('.relative .secitem dd').eq(0).children();

                        for(var i in regionurl){
                            if(i>0)
                            {
                                var urlObj = {};
                                var regionId = i<10?cityArr[j].id+''+0+i:cityArr[j].id+''+i;
                                urlObj.id = regionId;
                                urlObj.rname = regionurl.eq(i).text();
                                urlObj.url = cityArr[j].url.replace('/duanzu/', '') + regionurl.eq(i).attr('href');
                                urlObj.cid = cityArr[j].id;

                                provinceCityRegion.push(urlObj);

                                
                                (function(cname, rname){
                                    db.Citys.findOne({
                                        where: {
                                            name: rname
                                        }
                                    }).then(function(city){
                                        if(city){return};
                                        db.Citys.findOne({
                                            where:{
                                                name: cname
                                            }
                                        }).then(function(pro){
                                            if(!pro)return;
                                            db.Citys.create({
                                                name: rname,
                                                upid: pro.id,
                                                level:3
                                            });
                                        });
                                    });                                
                                })(cityArr[j].cname, urlObj.rname);

                                // if(k==27&&j==2&&i==6){
                                //     getBusinesses(provinceCityRegion);
                                //     res.json(provinceCityRegion);
                                //     return;
                                // }
                            }
                        }

                        console.log('第'+k+'个省的第'+j+'城市的区域');

                        if(cityArr[j+1]){
                            j++;
                            setTimeout(function(){
                                citybackcall(cityArr, cityArr[j].cname);
                            }, parseInt(Math.random()*100));
                            
                        }else{

                            if(provinceArr[k+1]){
                                k++;
                                provincebackcall(provinceArr);
                            }else{
                                regions_obj = provinceCityRegion;
                                // getBusinesses(provinceCityRegion);
                                // res.json(provinceCityRegion);
                                res.json({});
                            }
                        } 
                    }
                });
            }
        }
    };


    function getBusinesses(regionArr){

        var e = 0;
        var businessArr = {};
        getBusiness(regionArr);

        function getBusiness(regionArr){

            var options = {
                url: regionArr[e].url+'?PGTID=0d300009-0000-4da7-12f9-3421ac384dfc&ClickID=1',
                headers: {
                    'User-Agent': req.headers['user-agent']
                },
                timeout: 15000
            };
             
            request(options, function(error, response, body) {

                if (!error && response.statusCode == 200) {
                    $ = cheerio.load(body);
                    // var region = $('#crumbs a').eq($('#crumbs a').length-1).text().slice(0, -7);

                    var business = $('.subarea a');
                    var businessData = [];

                    for(var f in business){
                        if(business.eq(f).text()){
                            businessData.push(business.eq(f).text());
                        }
                    }
                    console.log('正在获取第'+e+'个区域下的商圈信息');

                    businessArr[regionArr[e].id] = businessData;
                    
                    // res.send(body);
                    if(regionArr[e+1]&&e<410){
                        e++;
                        getBusiness(regionArr);
                    }else{
                        // res.json(businessArr);
                        var all_text = 'var province_and_city_text=';
                        all_text += JSON.stringify(province_and_city_obj);
                        all_text += ';var regions=';
                        all_text += JSON.stringify(regions_obj);
                        all_text += ';var businesses=';
                        all_text += JSON.stringify(businessArr);

                        fs.writeFile("business.js",all_text,function (err) {
                            if (err) throw err ;
                            console.log("File Saved !"); //文件被保存
                        }) ;
                    }
                }
            });
        };
    }
});


var punycode = require('punycode');
var iconv = require('iconv-lite');

router.get('/spider', function(req, res){

    var options = {
        url: 'http://www.meituan.com/index/changecity/initiative',
        headers: {
            'User-Agent': req.headers['user-agent']
        },
        timeout: 30000
    };

    var province_and_city_obj, regions_obj, business_obj;
    request(options, callback);
     
    function callback(error, response, body) {
        if(error)console.log(error);
        if (!error && response.statusCode == 200) {

            $ = cheerio.load(body);

            var province = $('.province-city-select').attr('data-params');

            var city  = $('.ui-select-small').eq(1).html();

            // var buffer = punycode.ucs2.decode(province.eq(2).html());
            // console.log(buffer);
            // console.log()
            // var str = iconv.decode(new Buffer(buffer), 'ascii'); 
            res.charset = 'utf-8';
            res.send(province);

            // fs.writeFile("test2.html",body,function (err) {
            //     if (err) throw err ;
            //     console.log("File Saved !"); //文件被保存
            // }) ;
            return;
            
            var result = [];
            var provinceId = 1000;

            for(var i in province){

                var cityurl = province.eq(i).next('td').find('a');

                if(i<28&&province.eq(i).text()&&province.eq(i).text()!='热门')
                {
                    var provinceObj = {};
                    var urlArr = [];

                    for(var j in cityurl){
                        if(cityurl.eq(i).children().eq(j).text()){

                            var cityId = j<10?provinceId+''+0+j:provinceId+''+j;
                            var urlObj = {};

                            urlObj.id = cityId;
                            urlObj.cname = cityurl.eq(i).children().eq(j).text();
                            urlObj.url = cityurl.eq(i).children().eq(j).attr('href');

                            // (function(pname, cname){
                            //     db.Citys.findOne({
                            //         where:{
                            //             name: pname
                            //         }
                            //     }).then(function(pro){
                            //         if(!pro)return;
                            //         db.Citys.create({
                            //             name: cname,
                            //             upid: pro.id,
                            //             level:2
                            //         });
                            //     });
                            // })(province.eq(i).text(), urlObj.cname);
                            
                            urlArr.push(urlObj);
                        }
                    }

                    provinceObj.pname = province.eq(i).text();
                    provinceObj.id = provinceId;
                    provinceObj.city = urlArr;

                    // db.Citys.create({
                    //     name: provinceObj.pname,
                    //     upid: 0,
                    //     level: 1
                    // })

                    result.push(provinceObj);
                    provinceId++;
                }

            }

            province_and_city_obj = result;

            getRegions(result);
            res.json(result);
        }
    }

    function getRegions(provinceArr){

        var provinceCityRegion =[];
        var k = 0;

        provincebackcall(provinceArr);

        function provincebackcall(provinceArr){

            var j = 0;
            var city = provinceArr[k].city;
            // var pname = provinceArr[k].pname;
            citybackcall(city);

            function citybackcall(cityArr){

                var options = {
                    url: cityArr[j].url+'?PGTID=0d300009-0071-1faa-6102-7e4ba59e5500&ClickID=4',
                    headers: {
                        'User-Agent': req.headers['user-agent']
                    },
                    timeout: 15000
                };

                request(options, function(error, response, body) {

                    if(error)console.log(error);

                    if (!error && response.statusCode == 200) {

                        $ = cheerio.load(body);

                        var regionurl = $('.relative .secitem dd').eq(0).children();

                        for(var i in regionurl){
                            if(i>0)
                            {
                                var urlObj = {};
                                var regionId = i<10?cityArr[j].id+''+0+i:cityArr[j].id+''+i;
                                urlObj.id = regionId;
                                urlObj.rname = regionurl.eq(i).text();
                                urlObj.url = cityArr[j].url.replace('/duanzu/', '') + regionurl.eq(i).attr('href');
                                urlObj.cid = cityArr[j].id;

                                provinceCityRegion.push(urlObj);

                                
                                (function(cname, rname){
                                    db.Citys.findOne({
                                        where: {
                                            name: rname
                                        }
                                    }).then(function(city){
                                        if(city){return};
                                        db.Citys.findOne({
                                            where:{
                                                name: cname
                                            }
                                        }).then(function(pro){
                                            if(!pro)return;
                                            db.Citys.create({
                                                name: rname,
                                                upid: pro.id,
                                                level:3
                                            });
                                        });
                                    });                                
                                })(cityArr[j].cname, urlObj.rname);

                                // if(k==27&&j==2&&i==6){
                                //     getBusinesses(provinceCityRegion);
                                //     res.json(provinceCityRegion);
                                //     return;
                                // }
                            }
                        }

                        console.log('第'+k+'个省的第'+j+'城市的区域');

                        if(cityArr[j+1]){
                            j++;
                            setTimeout(function(){
                                citybackcall(cityArr, cityArr[j].cname);
                            }, parseInt(Math.random()*100));
                            
                        }else{

                            if(provinceArr[k+1]){
                                k++;
                                provincebackcall(provinceArr);
                            }else{
                                regions_obj = provinceCityRegion;
                                // getBusinesses(provinceCityRegion);
                                // res.json(provinceCityRegion);
                                res.json({});
                            }
                        } 
                    }
                });
            }
        }
    };


    function getBusinesses(regionArr){

        var e = 0;
        var businessArr = {};
        getBusiness(regionArr);

        function getBusiness(regionArr){

            var options = {
                url: regionArr[e].url+'?PGTID=0d300009-0000-4da7-12f9-3421ac384dfc&ClickID=1',
                headers: {
                    'User-Agent': req.headers['user-agent']
                },
                timeout: 15000
            };
             
            request(options, function(error, response, body) {

                if (!error && response.statusCode == 200) {
                    $ = cheerio.load(body);
                    // var region = $('#crumbs a').eq($('#crumbs a').length-1).text().slice(0, -7);

                    var business = $('.subarea a');
                    var businessData = [];

                    for(var f in business){
                        if(business.eq(f).text()){
                            businessData.push(business.eq(f).text());
                        }
                    }
                    console.log('正在获取第'+e+'个区域下的商圈信息');

                    businessArr[regionArr[e].id] = businessData;
                    
                    // res.send(body);
                    if(regionArr[e+1]&&e<410){
                        e++;
                        getBusiness(regionArr);
                    }else{
                        // res.json(businessArr);
                        var all_text = 'var province_and_city_text=';
                        all_text += JSON.stringify(province_and_city_obj);
                        all_text += ';var regions=';
                        all_text += JSON.stringify(regions_obj);
                        all_text += ';var businesses=';
                        all_text += JSON.stringify(businessArr);

                        fs.writeFile("business.js",all_text,function (err) {
                            if (err) throw err ;
                            console.log("File Saved !"); //文件被保存
                        }) ;
                    }
                }
            });
        };
    }
});



router.get('/saveqn', function(req, res){

    db.Groups.findAll({
        where:{
            id:{
                gt:2545,
                lt:2550
            }
        }
    }).then(function(results){
        if(!results){
            res.json({code:-1,msg:"no such group"});
            return;
        }

        var scenearr = [];
        var sceneid;
        for(var i in results){
            sceneid = JSON.parse(results[i].scenes_id);
            scenearr=scenearr.concat(sceneid)
        }

        db.Scenes.findAll({
            attributes:['id','key', 'name'],
            where:{
                id:scenearr
            }
        }).then(function(romaings){
            if(!romaings){
                res.json({code:-2,msg:"no such scene"});
                return;
            }
            var tosceneid;


            for(var j in results){

                console.log('正在保存第'+(parseInt(i)+1)+"组图");

                for(var i in romaings){
                    tosceneid=JSON.parse(results[j].scenes_id);
                    if(tosceneid.indexOf(romaings[i].id!=-1)){
                        var url = "http://7xiljm.com1.z0.glb.clouddn.com/images/scenes/"+romaings[i].key+"/allinone.jpg";
                        try{
                            request.get(url, {}).pipe(
                                fs.createWriteStream(__dirname + '/qn/'+results[j].city+results[j].region+results[j].community+'__'+romaings[i].name+'.jpg'));
                        }catch(err){
                            console.log(err);
                        }
                    }
                }
            }
        });
    });

    // var url='http://7xiljm.com1.z0.glb.clouddn.com/images/scenes/1a37622e7aac02ddd84ca49be3b77c9b07324bc5/allinone.jpg'
    // request(url).pipe(fs.createWriteStream(__dirname + '/test.jpg'));
});

router.get('/',function(req,res){
    var cur_page=req.query.cur_page?req.query.cur_page:1;
    if(!utils.isNum(cur_page)){
        res.json({code:-1,msg:'hehe'});
        return;
    }
    var n=10;

    var gid2name={};
    var pubgid2name={};
    var gid2key={};

    utils.getChildrenUsers(req.session.user).then(function(users){
        db.Scenes.findAndCountAll({
            where:{
                user_id:{
                    in:users
                },
                show:{
                    gte:0
                }
            },
            offset:(cur_page-1)*n,
            limit:n,
            order:'createdAt DESC'
        }).then(function(scenes){
            var gids=[];
            for(var i in scenes.rows){
                gids.push(JSON.parse(scenes.rows[i].groups_id)[0]);
            }
            //查找父亲
            db.Groups.findAll({
                    where:{
                        id:{
                            in:gids
                        }
                    }
            }).then(function(data){
                //////////////////leejie
                var gid2extra={};
                //////////////////
                for(var i in data){
                    gid2name[data[i].id+'']=data[i].city+data[i].region+data[i].community+data[i].building+' '+data[i].room;
                    gid2key[data[i].id+'']=data[i].key;
                    //////////////leejie
                    gid2extra[data[i].id+'']={
                        city:data[i].city,
                        community:data[i].community,
                        region:data[i].region,
                        building:data[i].building,
                        room:data[i].room,
                        face:data[i].face,
                        total_floor:data[i].total_floor,
                        area:data[i].area,
                        floor:data[i].floor,
                        apartment_rooms:data[i].apartment_rooms,
                        apartment_bathrooms:data[i].apartment_bathrooms,
                        apartment_halls:data[i].apartment_halls,
                        business:data[i].business_circle,
                        telephone:0
                    };
                    ////////////////
                }
                for(var i in scenes.rows){

                    if(req.query.type=="json"){
                        ///////////lee jie
                        scenes.rows[i].dataValues.extra=gid2extra[JSON.parse(scenes.rows[i].groups_id)[0]];;
                        scenes.rows[i].dataValues.type=0;
                        scenes.rows[i].dataValues.group_id=0;
                        ///////////////////
                        scenes.rows[i].dataValues.place=scenes.rows[i].name;
                        scenes.rows[i].dataValues.groupname=gid2name[JSON.parse(scenes.rows[i].groups_id)[0]];
                        scenes.rows[i].dataValues.groupkey=gid2key[JSON.parse(scenes.rows[i].groups_id)[0]];
                    }else{
                        scenes.rows[i].place=scenes.rows[i].name;
                        scenes.rows[i].groupname=gid2name[JSON.parse(scenes.rows[i].groups_id)[0]];
                        scenes.rows[i].groupkey=gid2key[JSON.parse(scenes.rows[i].groups_id)[0]];
                    }
                }

                var result={
                        scenes:scenes.rows,
                        count:scenes.count,
                        cur_page:parseInt(cur_page),
                        platform:utils.getPlatform(req),
                        title:'我的作品',
                        page:'work'
                    };
                if(req.query.type=='json'){
                    res.json(result);
                }else{
                    res.render('works',result);
                }

            });
        });
    });
});

router.post('/delete', function(req, res){

    var key = req.body.scene_key;
    var id = req.body.id;

    var deletepsw = utils.hex_sha1('muwenhu'+req.body.deletepsw);
    var map = key?{key:key}:{id:id};
    map.show = {
        $gt: 0
    };

    utils.autologin(req, res, function(userid){

        db.Scenes.findOne({
            where: map
        }).then(function(scene){
            
            if(!scene){
                res.json({code:-1,msg:'No such scene'});
                return;
            }
            db.Users.findOne({
                where: {
                    id: scene.user_id
                }
            }).then(function(user){
                if(!user){
                    res.json({code:-21,msg:'No such user'});
                    return;
                };
                if(deletepsw != user.deletepsw){
                    res.json({code:-71,msg:'删除密码错误'});
                    return;
                };

                db.Scenes.update({
                    show: -10
                },{
                    where: {
                        id: scene.id
                    }
                }).then(function(up){
                    if(!up){
                        res.json({code:-2,msg:'update fail'});
                        return;
                    }

                    db.Groups.findOne({
                        where: {
                            id: scene.group_id
                        }
                    }).then(function(group){

                        if(group.scenes_id == '[]'){
                            db.Groups.update({show: -9},{where: {id: group.id}});
                            res.json({code:0,msg:'删除成功'});
                            return;
                        }
                        var scenes_id = JSON.parse(group.scenes_id);

                        db.Scenes.findAll({
                            where: {
                                id: {
                                    $in: scenes_id
                                },
                                show: {
                                    $gt: 0
                                }
                            }
                        }).then(function(scenes){
                            if(!scenes||scenes.length==0){
                                db.Groups.update({show: -9},{where: {id: group.id}});
                                res.json({code:0,msg:'删除成功'});
                            }else{
                                res.json({code:0,msg:'删除成功'});
                            }
                        })
                    })
                });
            });
        });
    });
});
module.exports= router;
