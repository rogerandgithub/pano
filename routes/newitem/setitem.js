var express = require('express');
var router = express.Router();
var db = require('../model');
var xss = require('xss');
var utils = require('../utils');
var nodegrass = require('nodegrass');
var config = require('../config');
var when = require('when');


router.get('/', function(req, res) {

    utils.login(req, res, function(userid) {

        var r = {};

        db.Users.findOne({
            where: {
                id: userid
            }
        }).then(function(user) {

            var ad = user.advertisement ? user.advertisement.split('</div>') : [''];
            var ad1, ad2, ad3;
            if (ad.length > 0) {
                ad1 = ad[0].split('<div>').length > 1 ? (ad[0].split('<div>'))[1] : ad[0];
            }
            if (ad.length > 1) {
                ad2 = ad[1].split('<div>').length > 1 ? (ad[1].split('<div>'))[1] : ad[1];
            }
            if (ad.length > 2) {
                ad3 = ad[2].split('<div>').length > 1 ? (ad[2].split('<div>'))[1] : ad[2];
            }

            r.user = user;
            r.user.info = {
                ad1: ad1,
                ad2: ad2,
                ad3: ad3
            }

            utils.getexpire(userid).then(function(expire) {

                utils.getuserinfo(userid).then(function(user) {

                    r.user.expire = expire;
                    res.render('newitem/set', r);

                });

            });

        });

    });

});

router.post('/del_botimg', function(req, res) {

    utils.autologin(req, res, function(sessionuser) {

        if (req.body.type == 'global') {
            db.Users.update({
                itccontactstel: ''
            }, {
                where: {
                    id: sessionuser
                }
            }).then(function(u) {
                res.json({ msg: '删除成功', code: 0 });
            });
            return;
        }

        utils.getChildrenUsers(sessionuser).then(function(users) {
            db.Groups.findOne({
                where: {
                    key: req.body.groupkey,
                    user_id: { in: users
                    },
                    scenes_id: {
                        ne: "[]"
                    }
                }
            }).then(function(group) {
                if (!group) {
                    res.json({ code: -1, msg: 'none' });
                    return;
                }
                db.Groups.update({
                    bottrademark: ''
                }, {
                    where: {
                        id: group.id
                    }
                }).then(function(up) {
                    res.json({ code: 0, msg: 'ok' });
                });
            });
        });
    });
});


router.post('/deletepsw', function(req, res) {

    var old_password = req.body.oldpsw;
    var new_password = req.body.newpsw;
    var re_password = req.body.repsw;

    if (!req.session.user) {
        res.json({ code: -98, msg: '登录已失效' });
        return;
    }
    if (!old_password || !new_password || !re_password) {
        res.json({ code: -1, msg: '密码不能为空' });
        return;
    }
    if (new_password != re_password) {
        res.json({ code: -21, msg: '两次密码不同' });
        return;
    }

    old_password = utils.hex_sha1('muwenhu' + old_password);

    db.Users.findOne({
        where: {
            id: req.session.user,
            deletepsw: old_password
        }
    }).then(function(user) {
        if (!user) {
            res.json({ code: -31, msg: '原密码输入不正确' });
            return;
        }
        db.Users.update({
            deletepsw: utils.hex_sha1('muwenhu' + new_password)
        }, {
            where: {
                id: user.id
            }
        }).then(function(new_user) {
            if (!new_user) {
                res.json({ code: -31, msg: '修改失败，请稍后再试或联系业务员' });
                return;
            }
            res.json({ code: 0, msg: '修改成功，请记住新密码' });
        });
    });
});


router.post('/changechildpsw', function(req, res) {

    utils.login(req, res, function(sessionuser) {

        db.Users.findOne({
            where: {
                password: utils.hex_sha1(req.body.oldpsw + 'letian'),
                id: sessionuser
            }
        }).then(function(u) {
            if (!u) {
                res.json({ msg: 'Incorrect password', code: -1 });
                return;
            }
            db.Users.findOne({
                where: {
                    name: req.body.name
                }
            }).then(function(child) {
                if (!child) {
                    res.json({ code: -2, msg: 'No such child' });
                    return;
                }

                utils.getChildrenUsers(u.id).then(function(childreusers) {

                    if (childreusers.indexOf(child.id) == -1) {
                        res.json({ code: -3, msg: 'It\'s not your child' });
                        return;
                    }

                    db.Users.update({
                        password: utils.hex_sha1(req.body.newpsw + 'letian')
                    }, {
                        where: {
                            id: child.id
                        }
                    }).then(function(r) {

                        var log = {
                            user_id: u.id,
                            user_name: u.name,
                            ip: utils.getClientIp(req),
                            group_id: null,
                            group_name: '非全景操作',
                            platform: utils.getUA(req),
                            operate: '修改了' + child.name + '密码',
                            other: ''
                        }

                        utils.updatelog(req, log);
                        log.time = (new Date()).Format('yyyy-MM-dd');
                        res.json({ code: 0, msg: 'successed', object: log });
                    });
                });
            });
        });
    });
});


router.post('/set-qrcode-position', function(req, res) {

    utils.autologin(req, res, function(sessionuser) {

        db.Users.findOne({
            where: {
                id: sessionuser
            }
        }).then(function(u) {
            var qrcode = u.qrcode ? 0 : 1;
            db.Users.update({
                qrcode: qrcode
            }, {
                where: {
                    id: sessionuser
                }
            }).then(function(r) {
                res.json({ code: 0, msg: 'ok' });
            });
        });
    });

});

router.post('/set-rotate-status', function(req, res) {

    utils.autologin(req, res, function(sessionuser) {

        db.Users.findOne({
            where: {
                id: sessionuser
            }
        }).then(function(u) {
            var isrotate = u.isrotate ? 0 : 1;
            db.Users.update({
                isrotate: isrotate
            }, {
                where: {
                    id: sessionuser
                }
            }).then(function(r) {
                res.json({ code: 0, msg: 'ok' });
            });
        });
    });
});

router.post('/set-sharedesc', function(req, res) {

    utils.autologin(req, res, function(sessionuser) {

        var itccontacts = req.body.sharead ? req.body.sharead : '';

        db.Users.update({
            itccontacts: itccontacts
        }, {
            where: {
                id: sessionuser
            }
        }).then(function(up) {
            res.json({ code: 0, msg: 'ok' });
        });
    });
});

router.post('/set-global-ad', function(req, res) {

    utils.autologin(req, res, function(sessionuser) {

        var ad = req.body.advertisement ? req.body.advertisement : '';
        var sp = ad.split('</div>');
        var telephone = '';
        if (sp.length > 1) {
            if (utils.isTelephone(sp[1].substr(5))) {
                telephone = sp[1].substr(5);
            }
        }
        utils.getChildrenUsers(sessionuser).then(function(users) {
            db.Users.update({
                advertisement: ad,
                telephone: telephone
            }, {
                where: {
                    id: { in: users
                    }
                }
            }).then(function(r) {
                res.json({ code: 0, msg: 'ok' });
            });
        });
    });
});

router.post('/delchild', function(req, res) {

    utils.login(req, res, function(userid) {

        var name = req.body.name;

        db.Users.findOne({

            where: {
                password: utils.hex_sha1(req.body.deletepsw + 'letian'),
                id: userid
            }

        }).then(function(user) {

            if (!user) {
                res.json({ msg: 'Incorrect password', code: -1 });
                return;
            }

            var children = JSON.parse(user.children);

            db.Users.findOne({
                where: {
                    name: req.body.name,
                    id: {
                        $in: children
                    }
                }
            }).then(function(child) {

                if (!child) {
                    res.json({ code: -2, msg: 'No such child' });
                    return;
                }

                var index = children.indexOf(child.id);
                if (index == -1) {
                    res.json({ code: -3, msg: 'It\'s not your child' });
                    return;
                }

                children.splice(index, 1);

                console.log(children);

                db.Users.update({
                    children: JSON.stringify(children)
                }, {
                    where: {
                        id: userid
                    }
                }).then(function(user) {

                    if (child.itcmstertel == 'inherit') {

                        db.Users.destroy({
                            where: {
                                id: child.id
                            }
                        }).then(function(u) {

                            var log = {
                                user_id: user.id,
                                user_name: user.name,
                                ip: utils.getClientIp(req),
                                group_id: null,
                                group_name: '非全景操作',
                                platform: utils.getUA(req),
                                operate: '删除了' + child.name,
                                other: ''
                            };

                            utils.updatelog(req, log);
                            log.time = (new Date()).Format('yyyy-MM-dd');
                            res.json({ code: 0, msg: 'successed', object: log });
                        });
                    } else {

                        var log = {
                            user_id: user.id,
                            user_name: user.name,
                            ip: utils.getClientIp(req),
                            group_id: null,
                            group_name: '非全景操作',
                            platform: utils.getUA(req),
                            operate: '解绑了' + child.name,
                            other: ''
                        };

                        utils.updatelog(req, log);
                        log.time = (new Date()).Format('yyyy-MM-dd');
                        res.json({ code: 0, msg: 'successed', object: log });
                    }
                });
            });
        });
    });
});

router.post('/changename', function(req, res) {

    utils.login(req, res, function(sessionuser) {

        db.Users.findOne({
            where: {
                name: req.body.name
            }
        }).then(function(child) {
            if (!child) {
                res.json({ code: -1, msg: 'No such child' });
                return;
            }

            utils.getChildrenUsers(sessionuser).then(function(childreusers) {

                if (childreusers.indexOf(child.id) == -1) {
                    res.json({ code: -2, msg: 'It\'s not your child' });
                    return;
                }
                db.Users.findOne({
                    where: {
                        name: req.body.newname
                    }
                }).then(function(haduser) {
                    if (haduser) {
                        res.json({ code: -3, msg: '该用户名已存在' });
                        return;
                    }
                    db.Users.update({
                        name: req.body.newname
                    }, {
                        where: {
                            id: child.id
                        }
                    }).then(function(r) {
                        res.json({ code: 0, msg: 'ok' });
                    });
                });
            });
        });
    });
});



router.post('/changepsw', function(req, res) {

    utils.login(req, res, function(sessionuser) {

        db.Users.findOne({
            where: {
                password: utils.hex_sha1(req.body.oldpsw + 'letian'),
                id: sessionuser
            }
        }).then(function(u) {
            if (!u) {
                res.json({ msg: 'Incorrect password', code: -1 });
                return;
            }
            db.Users.update({
                password: utils.hex_sha1(req.body.newpsw + 'letian')
            }, {
                where: {
                    id: sessionuser
                }
            }).then(function(r) {

                var log = {
                    user_id: u.id,
                    user_name: u.name,
                    ip: utils.getClientIp(req),
                    group_id: null,
                    group_name: '非全景操作',
                    platform: utils.getUA(req),
                    operate: '修改了密码',
                    other: ''
                }

                utils.updatelog(req, log);
                log.time = (new Date()).Format('yyyy-MM-dd');
                res.json({ code: 0, msg: 'successed', object: log });
            });
        });
    });
});


router.post('/delscene', function(req, res) {

    var key = req.body.scene_key;
    var id = req.body.id;

    var deletepsw = utils.hex_sha1('muwenhu' + req.body.deletepsw);
    var map = key ? { key: key } : { id: id };
    map.show = {
        $gt: 0
    };

    utils.login(req, res, function(userid) {

        db.Scenes.findOne({
            where: map
        }).then(function(scene) {

            if (!scene) {
                res.json({ code: -1, msg: 'No such scene' });
                return;
            }
            db.Users.findOne({
                where: {
                    id: scene.user_id
                }
            }).then(function(user) {
                if (!user) {
                    res.json({ code: -21, msg: 'No such user' });
                    return;
                };
                if (deletepsw != user.deletepsw) {
                    res.json({ code: -71, msg: '删除密码错误' });
                    return;
                };

                db.Scenes.update({
                    show: -10
                }, {
                    where: {
                        id: scene.id
                    }
                }).then(function(up) {
                    if (!up) {
                        res.json({ code: -2, msg: 'update fail' });
                        return;
                    }

                    db.Groups.findOne({
                        where: {
                            id: scene.group_id
                        }
                    }).then(function(group) {

                        if (group.scenes_id == '[]') {
                            db.Groups.update({ show: -9 }, { where: { id: group.id } });
                            res.json({ code: 0, msg: '删除成功' });
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
                        }).then(function(scenes) {
                            if (!scenes || scenes.length == 0) {
                                db.Groups.update({ show: -9 }, { where: { id: group.id } });
                                res.json({ code: 0, msg: '删除成功' });
                            } else {
                                res.json({ code: 0, msg: '删除成功' });
                            }
                        })
                    })
                });
            });
        });
    });
});


router.post('/change_nickname', function(req, res) {

    utils.autologin(req, res, function(sessionuser) {
        db.Users.findOne({
            where: {
                $or: [{
                        name: req.body.nickname
                    },
                    {
                        nickname: req.body.nickname
                    }
                ]
            }
        }).then(function(user) {
            if (user) {
                res.json({ code: -33, msg: '该用户名已存在' });
                return;
            }
            db.Users.update({
                name: req.body.nickname
            }, {
                where: {
                    id: sessionuser
                }
            }).then(function(r) {
                res.json({ code: 0, msg: 'ok' });
            });
        })
    });
});

router.post('/changeusername', function(req, res) {
    utils.autologin(req, res, function(sessionuser) {
        if (!req.body.newname) {
            res.json({ code: -2, msg: '传入新用户名错误' });
            return;
        }

        db.Users.findOne({
            where: {
                name: req.body.newname
            }
        }).then(function(user) {
            if (user) {
                res.json({ code: -1, msg: '该用户名已存在' });
                return;
            }

            db.Users.update({
                name: req.body.newname
            }, {
                where: {
                    id: sessionuser
                }
            }).then(function(r) {
                res.json({ code: 0, msg: 'ok' });
            });
        })
    })
})

router.post('/change_realname', function(req, res) {

    utils.autologin(req, res, function(sessionuser) {
        // db.Users.findOne({
        //     where:{
        //         realname: req.body.realname
        //     }
        // }).then(function(user){
        //     if(user){
        //         res.json({code:-33,msg:'该用户名已存在'});
        //         return;
        //     }
        db.Users.update({
            realname: JSON.stringify(req.body.realname)
        }, {
            where: {
                id: sessionuser
            }
        }).then(function(r) {
            res.json({ code: 0, msg: 'ok' });
        });
        // })
    });
});

router.post('/delpano', function(req, res) {

    var groupid = req.body.id ? parseInt(req.body.id) : '';
    var groupkey;
    var show;
    var deletepsw = utils.hex_sha1('muwenhu' + req.body.deletepsw);

    utils.login(req, res, function(userid) {


        utils.getChildrenUsers(userid).then(function(users) {

            db.Groups.findOne({
                where: {
                    user_id: {
                        $in: users
                    },
                    id: groupid
                }
            }).then(function(group) {
                if (!group) {
                    res.json({ code: -3, msg: 'No such group' });
                    return;
                }
                db.Users.findOne({
                    where: {
                        id: req.session.user
                    }
                }).then(function(permission) {

                    if (permission.permission_delete == 0 && permission.level < 10) {
                        res.json({ code: -1, msg: '权限不足' });
                        return;
                    }


                    utils.getexpire(permission.id).then(function(expire) {

                        // if( Date.parse(expire)>Date.now() ){
                        if (permission.deletepsw != deletepsw) {
                            if (req.query.lang == 'en') {
                                res.json({ code: -1, msg: 'Incorrect Delete Password' });
                            } else {
                                res.json({ code: -1, msg: '删除密码错误' });
                            }
                            return;
                        }
                        // }

                        show = group.show - 10;
                        var links_id = JSON.parse(group.links_id);
                        var comments_id = JSON.parse(group.comments_id);

                        var links_map = {};
                        for (var i in links_id) {
                            for (var j in links_id[i]) {
                                if (!links_map[links_id[i][j]]) {
                                    links_map[links_id[i][j]] = links_id[i][j];
                                }
                            }
                        }
                        links_id = [];
                        for (var i in links_map) {
                            links_id.push(links_map[i]);
                        }

                        var comments_map = {};
                        for (var i in comments_id) {
                            for (var j in comments_id[i]) {
                                if (!comments_map[comments_id[i][j]]) {
                                    comments_map[comments_id[i][j]] = comments_id[i][j];
                                }
                            }
                        }
                        comments_id = [];
                        for (var i in comments_map) {
                            comments_id.push(comments_map[i]);
                        }
                        var scenes_id = JSON.parse(group.scenes_id);

                        //删除相关link
                        db.Links.destroy({
                            where: {
                                id: { in: links_id
                                }
                            }
                        }).then(function(result) {
                            //删除相关comment
                            return db.Comments.destroy({
                                where: {
                                    id: { in: comments_id
                                    }
                                }
                            })
                        }).then(function(result) {
                            //更新group
                            db.Groups.update({
                                show: show,
                                scenes_id: "[]",
                                links_id: "{}",
                                comments_id: "{}"
                            }, {
                                where: {
                                    user_id: group.user_id,
                                    id: groupid,
                                    show: {
                                        gte: 10
                                    }
                                }
                            }).then(function(result) {
                                db.Scenes.update({
                                    show: -99
                                }, {
                                    where: {
                                        id: { in: scenes_id
                                        }
                                    }
                                }).then(function(a) {

                                    var log = {
                                        user_id: permission.id,
                                        user_name: permission.name,
                                        ip: utils.getClientIp(req),
                                        group_id: group.id,
                                        group_name: group.city + ' ' + group.community + ' ' + group.room,
                                        platform: utils.getUA(req),
                                        operate: '删除了全景',
                                        other: ''
                                    }

                                    utils.updatelog(req, log);
                                    res.json({ code: 0, msg: 'successed' });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});

router.post('/set-logo', function(req, res) {
    var logo = req.body.logo ? req.body.logo : '';
    db.Users.findOne({
        where: {
            id: req.session.user
        }
    }).then(function(u) {
        db.Users.update({
            logo: logo
        }, {
            where: {
                id: req.session.user
            }
        }).then(function(r) {
            res.json({ msg: "ok", code: 0 });
        });
    });
});

router.post('/deltrademark', function(req, res) {
    if (req.body.type == 'global') {
        db.Users.update({
            trademark: ''
        }, {
            where: {
                id: req.session.user
            }
        }).then(function(u) {
            res.json({ msg: 'ok', code: 0 });
        });
        return;
    }

    utils.getChildrenUsers(req.session.user).then(function(users) {
        db.Groups.findOne({
            where: {
                key: req.body.groupkey,
                user_id: { in: users
                },
                scenes_id: {
                    ne: "[]"
                }
            }
        }).then(function(group) {
            if (!group) {
                res.json({ code: -1, msg: 'none' });
                return;
            }
            var scenes_id = JSON.parse(group.scenes_id);
            db.Scenes.update({
                trademark: ''
            }, {
                where: {
                    id: { in: scenes_id
                    }
                }
            }).then(function(up) {
                res.json({ code: 0, msg: 'ok' });
            });
        });
    });
});


router.post('/delbottrademarks', function(req, res) {

    if (req.body.type == 'global') {
        db.Users.update({
            itccontactstel: ''
        }, {
            where: {
                id: req.session.user
            }
        }).then(function(u) {
            res.json({ msg: '删除成功', code: 0 });
        });
        return;
    }

    utils.getChildrenUsers(req.session.user).then(function(users) {
        db.Groups.findOne({
            where: {
                key: req.body.groupkey,
                user_id: { in: users
                },
                scenes_id: {
                    ne: "[]"
                }
            }
        }).then(function(group) {
            if (!group) {
                res.json({ code: -1, msg: 'none' });
                return;
            }
            db.Groups.update({
                bottrademark: ''
            }, {
                where: {
                    id: group.id
                }
            }).then(function(up) {
                res.json({ code: 0, msg: 'ok' });
            });
        });
    });
});

router.post('/set-global-phone', function(req, res) {

    utils.autologin(req, res, function(sessionuser) {

        var phone = req.body.phone ? req.body.phone : '';
        db.Users.findOne({
            where: {
                id: sessionuser
            }
        }).then(function(u) {
            utils.getChildrenUsers(sessionuser).then(function(users) {
                db.Users.update({
                    itcregion: phone
                }, {
                    where: {
                        id: { in: users
                        }
                    }
                }).then(function(up) {
                    res.json({ code: 0, msg: 'ok' });
                });
            });
        });
    });
});

router.post('/set-global-prefix', function(req, res) {

    utils.autologin(req, res, function(sessionuser) {

        var prefix = req.body.prefix ? req.body.prefix : '';
        db.Users.findOne({
            where: {
                id: sessionuser
            }
        }).then(function(u) {
            utils.getChildrenUsers(sessionuser).then(function(users) {
                db.Users.update({
                    prefix: prefix
                }, {
                    where: {
                        id: { in: users
                        }
                    }
                }).then(function(up) {
                    res.json({ code: 0, msg: 'ok' });
                });
            });
        });
    });
});

router.post('/set-introduction-status', function(req, res) {

    utils.autologin(req, res, function(sessionuser) {

        db.Users.findOne({
            where: {
                id: sessionuser
            }
        }).then(function(u) {
            var permission_introduction = u.permission_introduction ? 0 : 1;
            db.Users.update({
                permission_introduction: permission_introduction
            }, {
                where: {
                    id: sessionuser
                }
            }).then(function(r) {
                res.json({ code: 0, msg: 'ok' });
            });
        });
    });
});

router.post('/set-info', function(req, res) {

    utils.autologin(req, res, function(sessionuser) {

        db.Users.findOne({
            where: {
                id: sessionuser
            }
        }).then(function(user) {
            // if(user.permission_logo==0){
            //     res.json({code:-91,msg:'您没有该权限  '});
            //     return;
            // }

            var data = {
                company: req.body.itcname,
                telephone: req.body.itcphone,
                itcwebsite: req.body.itcwebsite
            }

            db.Users.update(data, {
                where: {
                    id: sessionuser
                }
            }).then(function(user) {
                if (!user) return false;
                res.json({ code: 0, msg: '修改成功' });
            });
        });
    });
});

router.post('/set-bgmusic-status', function(req, res) {

    utils.autologin(req, res, function(sessionuser) {
        db.Users.findOne({
            where: {
                id: sessionuser
            }
        }).then(function(u) {
            var permission_bgsnd = u.permission_bgsnd ? 0 : 1;
            db.Users.update({
                permission_bgsnd: permission_bgsnd
            }, {
                where: {
                    id: sessionuser
                }
            }).then(function(r) {
                res.json({ code: 0, msg: 'ok' });
            });
        });
    });
});

router.post('/del-bgmusic', function(req, res) {
    utils.autologin(req, res, function(sessionuser) {
        db.Users.update({
            bgmusic: ''
        }, {
            where: {
                id: sessionuser
            }
        }).then(function(user) {
            res.json({ code: 0, msg: '全局背景音乐删除成功' });
        });
    });
});

router.post('/toggleshareicon', function(req, res) {
    utils.autologin(req, res, function(sessionuser) {
        db.Users.findOne({
            where: {
                id: sessionuser
            }
        }).then(function(u) {
            var sharetype = req.body.sharetype;
            console.log(sharetype);
            var type = u.sharekey ? JSON.parse(u.sharekey) : '[0]';
            type[0] = parseInt(sharetype);
            console.log(type);
            db.Users.update({
                sharekey: JSON.stringify(type)
            }, {
                where: {
                    id: sessionuser
                }
            }).then(function(r) {
                res.json({ code: 0, msg: 'ok' });
            });
        });
    });
})

router.post('/del_shareicon', function(req, res) {
    db.Users.update({
        sharekey: '[0]'
    }, {
        where: {
            id: req.session.user
        }
    }).then(function(u) {
        res.json({ msg: 'ok', code: 0 });
    });
});

module.exports = router;