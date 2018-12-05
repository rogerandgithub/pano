var express = require('express');
var router = express.Router();
var db= require('./model');
var xss= require('xss');
var utils= require('./utils');
var fs= require('fs');
var config= require('./config');
var request = require('request');



router.get('/recruitment', function(req, res){
    if(utils.getPlatform(req).indexOf('pc') != -1){
        res.redirect('/web/recruitment/cn');
    }else{
        res.redirect('/mobile/recruitment/cn');
    }
});
router.get('/recruitment/:lang', function(req, res){
    var lang = req.params.lang;
    if(lang!='en' && lang!='cn'){
        lang = 'cn';
    };
    if(utils.getPlatform(req).indexOf('pc') != -1){
        res.render('index/recruitment',{lang:lang});
    }else{
        res.render('index/m_recruitment',{lang:lang});
    }  
});

router.get('/recruitment/social', function(req, res){
    if(utils.getPlatform(req).indexOf('pc') != -1){
        res.redirect('/web/recruitment/social/cn');
    }else{
        res.redirect('/web/recruitment/social/cn');
    }
});
router.get('/recruitment/social/:lang', function(req, res){
    var lang = req.params.lang;
    var jobname = req.query.jobname;
    jobname?jobname:'';
    if(lang!='en' && lang!='cn'){
        lang = 'cn';
    };
    if(utils.getPlatform(req).indexOf('pc') != -1){
        res.render('index/social',{lang:lang,jobname:jobname});
    }else{
        res.render('index/m_social',{lang:lang});
    } 
});



router.get('/mobilerecruit', function(req, res){
    res.render('index/mobilerecruit');
});

router.get('/joinus',function(req, res){
    res.redirect('/web/joinus/cn');
})
router.get('/joinus/:lang', function(req, res){

    var r = {}, name = req.query.name;
    name == 'admin'?r.isadmin = true:r.isadmin = false;
    var lang = req.params.lang;
    if(lang!='en' && lang!='cn'){
        lang = 'cn';
    };
    r.name = '';
    r.lang = lang;


    if(req.session.name == 'admin'){
        r.name = req.session.name;
        var token = utils.hex_sha1(Date.now()+'muwenhu');
        req.session.token = token;
        r.token = token;
    }
    console.log(req.session.token);

    req.session.name&&name?res.redirect('/web/joinus/'+lang):res.render('index/joinus', r);

});

router.get('/join/logout', function(req, res){
    req.session.name = undefined;
    req.session.token = undefined;
    res.redirect('/web/joinus');
});

router.post('/join/login', function(req, res){
    var psw = req.body.psw;
    if(psw=='weigenping'){
        req.session.name = 'admin';
        res.json({code:0,msg:'OK'});
        return;
    }
    res.json({code:-1,msg:'Invalid Password'});
});

router.get('/join/data/:lang', function(req, res){
    var lang = req.params.lang;
    fs.readFile('./join_data_'+lang+'.json', function(err, data){
        var data = JSON.parse(data);
        res.json(data);
    });
});

router.post('/join/add', function(req, res){
    if(!req.session.name||!req.session.token){
        res.json({code:-1,msg:'You seem not to be loggin'});
        return;
    }
    if(req.body.token != req.session.token){
        res.json({code:-2,msg:'Invalid Token'});
        return;
    }
    fs.readFile('./join_data.json', function(err, data){
        if(err){
            res.json({code:-3,msg:'fail to get data'});
            return;
        }
        var json = JSON.parse(data);
        var job = JSON.parse(req.body.job);
        console.log(job);
        console.log(job.duty);
        json.push(job);
        fs.writeFile('./join_data.json', JSON.stringify(json), function(err){
            if(err){
                res.json({code:-4,msg:'fail to write data'});
                return;
            }
            res.json({code:0,msg:'发布成功'});
        });
    });
});

router.post('/join/edit', function(req, res){
    if(!req.session.name||!req.session.token){
        res.json({code:-1,msg:'You seem not to be loggin'});
        return;
    }
    if(req.body.token != req.session.token){
        res.json({code:-2,msg:'Invalid Token'});
        return;
    }
    fs.readFile('./join_data.json', function(err, data){
        if(err){
            res.json({code:-3,msg:'fail to get data'});
            return;
        }
        var json = JSON.parse(data);
        var job = JSON.parse(req.body.job);

        var index = -1;
        for(var i in json){
            if(json[i].name == req.body.changename)index = i;
        }

        if(index == -1){
            res.json({code:-4,msg:'No such job'});
            return;
        }

        json[index] = job;

        fs.writeFile('./join_data.json', JSON.stringify(json), function(err){
            if(err){
                res.json({code:-4,msg:'fail to write data'});
                return;
            }
            res.json({code:0,msg:'修改成功'});
        });
    });
});



router.post('/join/del', function(req, res){
    if(!req.session.name||!req.session.token){
        res.json({code:-1,msg:'You seem not to be loggin'});
        return;
    }
    if(req.body.token != req.session.token){
        res.json({code:-2,msg:'Invalid Token'});
        return;
    }
    fs.readFile('./join_data.json', function(err, data){
        if(err){
            res.json({code:-3,msg:'fail to get data'});
            return;
        }

        var name = req.body.name;
        var json = JSON.parse(data);

        var index = -1;
        for(var i in json){
            if(json[i].name == name)index = i;
        }

        if(index == -1){
            res.json({code:-4,msg:'No such job'});
            return;
        }

        json.splice(index,1);

        fs.writeFile('./join_data.json', JSON.stringify(json), function(err){
            if(err){
                res.json({code:-4,msg:'fail to write data'});
                return;
            }
            res.json({code:0,msg:'删除成功'});
        });
    });
});


router.get('/newinfo/:index/:lang', function(req, res){
    var index = req.params.index;
    var lang = req.params.lang;
    if(lang!='en' && lang!='cn'){
        lang ='cn';
    };
    if(utils.getPlatform(req).indexOf('pc') != -1){
        res.render('index/newinfo',{index:index,lang:lang});
    }else{
        res.render('index/m_newinfo',{index:index,lang:lang});
    } 
});
router.get('/join_sch_us',function(req,res){
    res.redirect('/web/join_sch_us/cn');
});

router.get('/recruitment/social/:index/:lang', function(req, res){
    var index = req.params.index;
    var lang = req.params.lang;
    if(lang!='en' && lang!='cn'){
        lang ='cn';
    };
    if(utils.getPlatform(req).indexOf('pc') != -1){
        res.render('index/socialinfo',{index:index,lang:lang});
    }else{
        res.render('index/m_socialinfo',{index:index,lang:lang});
    } 
});

router.get('/join_sch_us/:lang', function(req, res){

    var r = {}, name = req.query.name;
    name == 'admin'?r.isadmin = true:r.isadmin = false;
    var lang = req.params.lang;
    if(lang!='en' && lang!='cn'){
        lang = 'cn';
    };
    r.name = '';
    r.lang = lang;

    if(req.session.name == 'admin'){
        r.name = req.session.name;
        var token = utils.hex_sha1(Date.now()+'muwenhu');
        req.session.token = token;
        r.token = token;
    }
    req.session.name&&name?res.redirect('/web/join_sch_us'):res.render('index/join_sch_us', r);

});

router.get('/join_sch/logout', function(req, res){
    req.session.name = undefined;
    req.session.token = undefined;
    res.redirect('/web/join_sch_us');
});


router.get('/', function(req, res){
    if(utils.getPlatform(req).indexOf('pc') != -1){
        res.redirect('/web/cn');
    }else{
        res.redirect('/mobile/cn');
    }
});

router.get('/:lang', function(req, res){
    var lang = req.params.lang;
    if(lang!='en' && lang!='cn'){
        res.redirect('/web/cn');
    };
    if(utils.getPlatform(req).indexOf('pc') != -1){
        res.render('index/main',{lang:lang});
    }else{
        res.render('index/m_main',{lang:lang});
    } 
});


router.get('/main', function(req, res){
    res.redirect('/web/main/cn');
});
router.get('/main/:lang', function(req, res){
    var lang = req.params.lang;
    if(lang!='en' && lang!='cn'){
        res.redirect('/web');
        return;
    };
    if(utils.getPlatform(req).indexOf('pc') != -1){
        res.render('index/main',{lang:lang});
    }else{
        res.render('index/m_main',{lang:lang});
    } 
});

router.get('/rslidar', function(req, res){
    if(utils.getPlatform(req).indexOf('pc') != -1){
        res.redirect('/web/rslidar/cn');
    }else{
        res.redirect('/mobile/rslidar/cn');
    }
});

router.get('/rslidar/:lang', function(req, res){
    var lang = req.params.lang;
    if(lang!='en' && lang!='cn'){
        res.redirect('/web');
        return;
    };
    if(utils.getPlatform(req).indexOf('pc') != -1){
        res.render('index/rs-lidar',{lang:lang});
    }else{
        res.render('index/m_rslidar',{lang:lang});
    }
});

router.get('/prometheus', function(req, res){
    if(utils.getPlatform(req).indexOf('pc') != -1){
        res.redirect('/web/prometheus/cn');
    }else{
        res.redirect('/mobile/prometheus/cn');
    }
});

router.get('/prometheus/:lang', function(req, res){
    var lang = req.params.lang;
    if(lang!='en' && lang!='cn'){
        res.redirect('/web');
        return;
    };
    if(utils.getPlatform(req).indexOf('pc') != -1){
        res.render('index/prometheus',{lang:lang});
    }else{
        res.render('index/m_prometheus',{lang:lang});
    }
});

router.get('/rslidar/solution', function(req, res){
    if(utils.getPlatform(req).indexOf('pc') != -1){
        res.redirect('/web/rslidar/solution/cn');
    }else{
        res.redirect('/mobile/rslidar/solution/cn');
    }
});
router.get('/rslidar/solution/:lang', function(req, res){
    var lang = req.params.lang;
    if(lang!='en' && lang!='cn'){
        res.redirect('/web');
        return;
    };
    if(utils.getPlatform(req).indexOf('pc') != -1){
        res.render('index/rs_solution',{lang:lang});
    }else{
        res.render('index/m_rsSolution',{lang:lang});
    }
});

router.get('/rslidar/platform', function(req, res){
    if(utils.getPlatform(req).indexOf('pc') != -1){
        res.redirect('/web/rslidar/platform/cn');
    }else{
        res.redirect('/mobile/rslidar/platform/cn');
    }
});
router.get('/rslidar/platform/:lang', function(req, res){
    var lang = req.params.lang;
    if(lang!='en' && lang!='cn'){
        res.redirect('/web');
        return;
    };
    if(utils.getPlatform(req).indexOf('pc') != -1){
        res.render('index/platform',{lang:lang});
    }else{
        res.render('index/m_platform',{lang:lang});
    }
});

router.get('/rslidar/algorithm', function(req, res){
    if(utils.getPlatform(req).indexOf('pc') != -1){
        res.redirect('/web/rslidar/algorithm/cn');
    }else{
        res.redirect('/mobile/rslidar/algorithm/cn');
    }
});
router.get('/rslidar/algorithm/:lang', function(req, res){
    var lang = req.params.lang;
    if(lang!='en' && lang!='cn'){
        res.redirect('/web');
        return;
    };
    if(utils.getPlatform(req).indexOf('pc') != -1){
        res.render('index/algorithm',{lang:lang});
    }else{
        res.render('index/m_algorithm',{lang:lang});
    }
});

router.get('/rslidar/promethus', function(req, res){
    if(utils.getPlatform(req).indexOf('pc') != -1){
        res.redirect('/web/rslidar/promethus/cn');
    }else{
        res.redirect('/mobile/rslidar/promethus/cn');
    }
});
router.get('/rslidar/promethus/:lang', function(req, res){
    var lang = req.params.lang;
    if(lang!='en' && lang!='cn'){
        res.redirect('/web');
        return;
    };
    if(utils.getPlatform(req).indexOf('pc') != -1){
        res.render('index/promethus',{lang:lang});
    }else{
        res.render('index/m_promethus',{lang:lang});
    }
});


router.get('/panorama', function(req, res){
    res.redirect('/web/panorama/cn');
});
router.get('/panorama/:lang', function(req, res){
    var lang = req.params.lang;
    if(lang!='en' && lang!='cn'){
        res.redirect('/web');
        return;
    };
    res.render('index/panorama',{lang:lang});
});

router.get('/cooperation', function(req, res){
    res.redirect('/web/cooperation/cn');
});
router.get('/cooperation/:lang', function(req, res){
    var lang = req.params.lang;
    if(lang!='en' && lang!='cn'){
        res.redirect('/web');
        return;
    };
    res.render('index/cooperation',{lang:lang});
});

router.get('/rslidar-application', function(req, res){
    res.redirect('/web/rslidar-application/cn');
});
router.get('/rslidar-application/:lang', function(req, res){
    var lang = req.params.lang;
    if(lang!='en' && lang!='cn'){
        res.redirect('/web');
        return;
    };
    res.render('index/rslidar-application',{lang:lang});
});

router.get('/rslidar-software', function(req, res){
    res.redirect('/web/rslidar-software/cn');
});
router.get('/rslidar-software/:lang', function(req, res){
    var lang = req.params.lang;
    if(lang!='en' && lang!='cn'){
        res.redirect('/web');
        return;
    };
    res.render('index/rslidar-software',{lang:lang});
});

router.get('/three-dimensional', function(req, res){
    if(utils.getPlatform(req).indexOf('pc') != -1){
        res.redirect('/web/three-dimensional/cn');
    }else{
        res.redirect('/mobile/threedimensional/cn');
    }
});
router.get('/three-dimensional/:lang', function(req, res){
    var lang = req.params.lang;
    if(lang!='en' && lang!='cn'){
        res.redirect('/web');
        return;
    };
    if(utils.getPlatform(req).indexOf('pc') != -1){
        res.render('index/three-dimensional',{lang:lang});
    }else{
        res.render('index/m-three-dimensional',{lang:lang});
    }
});

router.get('/application', function(req, res){
    res.redirect('/web/application/cn');
});
router.get('/application/:lang', function(req, res){
    var lang = req.params.lang;
    if(lang!='en' && lang!='cn'){
        res.redirect('/web');
        return;
    };
    res.render('index/application',{lang:lang});
});

router.get('/news', function(req, res){
    if(utils.getPlatform(req).indexOf('pc') != -1){
        res.redirect('/web/news/cn');
    }else{
        res.redirect('/mobile/news/cn');
    }
});
router.get('/news/:lang', function(req, res){
    var lang = req.params.lang;
    if(lang!='en' && lang!='cn'){
        res.redirect('/web');
        return;
    };
    if(utils.getPlatform(req).indexOf('pc') != -1){
        res.render('index/news',{lang:lang});
    }else{
        res.render('index/m_news',{lang:lang});
    }
});

router.get('/company', function(req, res){
    if(utils.getPlatform(req).indexOf('pc') != -1){
        res.redirect('/web/company/cn');
    }else{
        res.redirect('/mobile/company/cn');
    }
});
router.get('/company/:lang', function(req, res){
    var lang = req.params.lang;
    if(lang!='en' && lang!='cn'){
        res.redirect('/web');
        return;
    };
    if(utils.getPlatform(req).indexOf('pc') != -1){
        res.render('index/company',{lang:lang});
    }else{
        res.render('index/m_company',{lang:lang});
    }
});

router.get('/software', function(req, res){
    res.redirect('/web/software/cn');
});
router.get('/software/:lang', function(req, res){
    var lang = req.params.lang;
    if(lang!='en' && lang!='cn'){
        res.redirect('/web');
        return;
    };
    res.render('index/software',{lang:lang});
});

router.get('/about', function(req, res){
    res.redirect('/web/about/cn');
});
router.get('/about/:lang', function(req, res){
    var lang = req.params.lang;
    if(lang!='en' && lang!='cn'){
        res.redirect('/web');
        return;
    };
    res.render('index/about',{lang:lang});
});

router.get('/contact', function(req, res){
    if(utils.getPlatform(req).indexOf('pc') != -1){
        res.redirect('/web/contact/cn');
    }else{
        res.redirect('/mobile/contact/cn');
    }
});

router.get('/contact/:lang', function(req, res){
    var lang = req.params.lang;
    if(lang!='en' && lang!='cn'){
        res.redirect('/web');
        return;
    };
    if(utils.getPlatform(req).indexOf('pc') != -1){
        res.render('index/contact',{lang:lang});
    }else{
        res.render('index/m_contact',{lang:lang});
    }
});

router.get('/cooperation', function(req, res){
    res.redirect('/web/cooperation/cn');
});

router.get('/cooperation/:lang', function(req, res){
    var lang = req.params.lang;
    if(lang!='en' && lang!='cn'){
        res.redirect('/web');
        return;
    };
    res.render('index/cooperation',{lang:lang});
});

router.get('/service', function(req, res){
    res.redirect('/web/service/cn');
});
router.get('/service/:lang', function(req, res){
    var lang = req.params.lang;
    if(lang!='en' && lang!='cn'){
        res.redirect('/web');
        return;
    };
    res.render('index/service',{lang:lang});
});

router.get('/resource', function(req, res){
    if(utils.getPlatform(req).indexOf('pc') != -1){
        res.redirect('/web/resource/cn');
    }else{
        res.redirect('/mobile/resource/cn');
    }
});
router.get('/resource/:lang', function(req, res){
    var lang = req.params.lang;
    var name = req.query.name?1:0;
    if(lang!='en' && lang!='cn'){
        res.redirect('/web');
        return;
    };
    if(utils.getPlatform(req).indexOf('pc') != -1){
        res.render('index/resource',{lang:lang,name:name});
    }else{
        res.render('index/m_resource',{lang:lang,name:name});
    }
});

router.get('/join', function(req, res){
    res.render('index/join');
});

router.get('/loading', function(req, res){
    res.render('index/loading');
});



router.post('/join_sch/login', function(req, res){
    var psw = req.body.psw;
    if(psw=='weigenping'){
        req.session.name = 'admin';
        res.json({code:0,msg:'OK'});
        return;
    }
    res.json({code:-1,msg:'Invalid Password'});
});

router.get('/join_sch/data/:lang', function(req, res){
    var lang = req.params.lang;
    fs.readFile('./join_sch_data_'+lang+'.json', function(err, data){
        var data = JSON.parse(data);
        res.json(data);
    });
});

router.post('/join_sch/add', function(req, res){
    if(!req.session.name||!req.session.token){
        res.json({code:-1,msg:'You seem not to be loggin'});
        return;
    }
    if(req.body.token != req.session.token){
        res.json({code:-2,msg:'Invalid Token'});
        return;
    }
    fs.readFile('./join_sch_data.json', function(err, data){
        if(err){
            res.json({code:-3,msg:'fail to get data'});
            return;
        }
        var json = JSON.parse(data);
        var job = JSON.parse(req.body.job);
        console.log(job);
        console.log(job.duty);
        json.push(job);
        fs.writeFile('./join_sch_data.json', JSON.stringify(json), function(err){
            if(err){
                res.json({code:-4,msg:'fail to write data'});
                return;
            }
            res.json({code:0,msg:'发布成功'});
        });
    });
});

router.post('/join_sch/edit', function(req, res){
    if(!req.session.name||!req.session.token){
        res.json({code:-1,msg:'You seem not to be loggin'});
        return;
    }
    if(req.body.token != req.session.token){
        res.json({code:-2,msg:'Invalid Token'});
        return;
    }
    fs.readFile('./join_sch_data.json', function(err, data){
        if(err){
            res.json({code:-3,msg:'fail to get data'});
            return;
        }
        var json = JSON.parse(data);
        var job = JSON.parse(req.body.job);

        var index = -1;
        for(var i in json){
            if(json[i].name == req.body.changename)index = i;
        }

        if(index == -1){
            res.json({code:-4,msg:req.body.changename});
            return;
        }

        json[index] = job;

        fs.writeFile('./join_sch_data.json', JSON.stringify(json), function(err){
            if(err){
                res.json({code:-4,msg:'fail to write data'});
                return;
            }
            res.json({code:0,msg:'修改成功'});
        });
    });
});


router.post('/join_sch/del', function(req, res){
    if(!req.session.name||!req.session.token){
        res.json({code:-1,msg:'You seem not to be loggin'});
        return;
    }
    if(req.body.token != req.session.token){
        res.json({code:-2,msg:'Invalid Token'});
        return;
    }
    fs.readFile('./join_sch_data.json', function(err, data){
        if(err){
            res.json({code:-3,msg:'fail to get data'});
            return;
        }

        var name = req.body.name;
        var json = JSON.parse(data);

        var index = -1;
        for(var i in json){
            if(json[i].name == name)index = i;
        }

        if(index == -1){
            res.json({code:-4,msg:'No such job'});
            return;
        }

        json.splice(index,1);

        fs.writeFile('./join_sch_data.json', JSON.stringify(json), function(err){
            if(err){
                res.json({code:-4,msg:'fail to write data'});
                return;
            }
            res.json({code:0,msg:'删除成功'});
        });
    });
});


router.get('/buy', function(req, res){
    res.redirect('/web/buy/cn');
});
router.get('/buy/:lang', function(req, res){
    var lang = req.params.lang;
    if(lang!='en' && lang!='cn'){
        res.redirect('/web');
        return;
    };
    res.render('index/buy',{lang:lang});
});

router.post('/buy', function(req, res){

    var orderData = {
        organization: req.body.organization,
        address: req.body.address,
        telephone: req.body.telephone,
        name: req.body.name,
        position: req.body.position,
        mobilephone: req.body.mobilephone,
        email: req.body.email,
        wechat: req.body.wechat,
        qq: req.body.qq,
        product: req.body.product,
        quantity: req.body.quantity,
        deliverdate: req.body.deliverdate,
        application: JSON.stringify(req.body.application),
        suggest: req.body.suggest
    }
    if(!orderData.organization || !orderData.name || !orderData.position || !orderData.mobilephone || !orderData.product || !orderData.quantity || !orderData.deliverdate || !orderData.application){
        res.json({code: -1, msg: '资料未填写完整'});
            return;
    }

    db.Orders.create(orderData).then(function(order){

        if(!order){
            res.json({code: -2, msg: '提交失败'});
            return;
        }

        // request.post('http://mes.robosense.cn:8888/admin/sendorder', {from: {key: 111111}});
        request.post('http://mes.robosense.cn:8888/admin/sendorder', {form: orderData});

        res.json({code: 0, msg: '提交成功'}); 

    });
})


router.get('/delete/order', function(req, res){

    var orderid = req.query.orderid;

    db.Orders.findOne({
        where: {
            id: orderid
        }
    }).then(function(order){

        if(!order){
            res.json({code: -1, msg: '没有该订单'});
            return;
        }

        db.Orders.update({
            deleted: 1
        }, {
            where: {
                id: orderid
            }
        }).then(function(update){

            if(update){
                res.json({code: -2, msg: '删除失败'});
                return;
            }

            res.json({code: 0, msg: 'ok'});

        })

    })

})

module.exports = router;
