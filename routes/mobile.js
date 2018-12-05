var express = require('express');
var router = express.Router();
var db= require('./model');
var xss= require('xss');
var utils= require('./utils');
var fs= require('fs');
var config= require('./config');

router.get('/rslidar', function(req, res){
    if(utils.getPlatform(req).indexOf('pc') != -1){
        res.redirect('/web/cn');
    }else{
        res.redirect('/mobile/cn');
    }
});
router.get('/rslidar/:lang', function(req, res){
    var lang = req.params.lang;
    if(lang!='en' && lang!='cn'){
        lang = 'cn';
    };
    if(utils.getPlatform(req).indexOf('pc') != -1){
        res.render('index/rslidar',{lang:lang});
    }else{
        res.render('index/m_rslidar',{lang:lang});
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
        lang = 'cn';
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
        lang = 'cn';
    };
    if(utils.getPlatform(req).indexOf('pc') != -1){
        res.render('index/rs_solution',{lang:lang});
    }else{
        res.render('index/m_rsSolution',{lang:lang});
    }
});

router.get('/threedimensional', function(req, res){
    if(utils.getPlatform(req).indexOf('pc') != -1){
        res.redirect('/web/three-dimensional/cn');
    }else{
        res.redirect('/mobile/threedimensional/cn');
    }
});
router.get('/threedimensional/:lang', function(req, res){
    var lang = req.params.lang;
    if(lang!='en' && lang!='cn'){
        lang = 'cn';
    };
    if(utils.getPlatform(req).indexOf('pc') != -1){
        res.render('index/three-dimensional',{lang:lang});
    }else{
        res.render('index/m-three-dimensional',{lang:lang});
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
        lang = 'cn';
    };
    if(utils.getPlatform(req).indexOf('pc') != -1){
        res.render('index/company',{lang:lang});
    }else{
        res.render('index/m_company',{lang:lang});
    }
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
        lang = 'cn';
    };
    if(utils.getPlatform(req).indexOf('pc') != -1){
        res.render('index/contact',{lang:lang});
    }else{
        res.render('index/m_contact',{lang:lang});
    }
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
        lang = 'cn';
    };
    if(utils.getPlatform(req).indexOf('pc') != -1){
        res.render('index/news',{lang:lang});
    }else{
        res.render('index/m_news',{lang:lang});
    }
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
        lang = 'cn';
    };
    if(utils.getPlatform(req).indexOf('pc') != -1){
        res.render('index/resource',{lang:lang});
    }else{
        res.render('index/m_resource',{lang:lang,name:name});
    }
});

router.get('/recruitment/social', function(req, res){
    if(utils.getPlatform(req).indexOf('pc') != -1){
        res.redirect('/web/recruitment/social/cn');
    }else{
        res.redirect('/mobile/recruitment/social/cn');
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
        res.render('index/m_social',{lang:lang,jobname:jobname});
    }
});

router.get('/social/:index/:lang', function(req, res){
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

router.get('/rssolution/:index/:lang', function(req, res){
    var index = req.params.index;
    var lang = req.params.lang;
    if(lang!='en' && lang!='cn'){
        lang ='cn';
    };
    if(utils.getPlatform(req).indexOf('pc') != -1){
        res.redirect('/pillar/:id');
    }else{
        res.render('index/m_rssolutioninfo',{index:index,lang:lang});
    }
});


router.get('/', function(req, res){
    if(utils.getPlatform(req).indexOf('pc') != -1){
        res.redirect('/web/cn');
    }else{
        res.redirect('/mobile/cn');
    }
});
router.get('/:lang', function(req, res){
    var getPlatform = utils.getPlatform(req);
    var lang = req.params.lang;
    if(lang!='en' && lang!='cn'){
        lang = 'cn';
    };
    if(utils.getPlatform(req).indexOf('pc') != -1){
        res.render('index/main',{lang:lang,getPlatform:getPlatform});
    }else{
        res.render('index/m_main',{lang:lang,getPlatform:getPlatform});
    }
});


module.exports = router;
