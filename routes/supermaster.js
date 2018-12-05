var express = require('express');
var router = express.Router();
var db = require('./model');
var when = require('when');
var utils = require('./utils');
var fs = require('fs');
var global_password = 'binder123';

var when = require('when');

router.get('/', function(req, res) {

    if (req.session.masterid && req.session.masterid == 1) {

        var limit = 20,
            offset = req.query.offset ? (parseInt(req.query.offset) - 1) * limit : 0;
        var key = req.query.key ? req.query.key : '';
        var data = {
            id: {
                $gt: 0
            },
            $or: [{
                    name: {
                        $like: '%' + key + '%'
                    }
                },
                {
                    nickname: {
                        $like: '%' + key + '%'
                    }
                }
            ]
        };
        if (key > 10000) {
            key = key - 10000;
            data = {
                id: key
            }
        }
        db.Users.findAll({
            offset: offset,
            limit: limit,
            order: 'expiredate ASC',
            where: data
        }).then(function(users) {
            var children_list = [];
            var father_list = [];
            var father_id = [];

            for (var i in users) {
                if (users[i].children != '[]') {
                    children_list.push(db.Users.findAll({
                        where: {
                            id: {
                                $in: JSON.parse(users[i].children)
                            }
                        }
                    }))
                }
                if (users[i].father != '0'&&father_id.indexOf(users[i].father) == -1) {
                	father_id.push(users[i].father);
                    father_list.push(db.Users.findOne({
                        where: {
                            id: users[i].father
                        }
                    }))
                }
            }

            when.all(children_list).then(function(children) {

                for (var j in users) {
                    if (users[j].children != '[]') {
                        var children_id_list = JSON.parse(users[j].children);
                        for (var i in children) {
                            for (var k in children[i]) {
                                if (children_id_list.indexOf(children[i][k].id) != -1) {
                                    if (!users[j].dataValues.children_list) users[j].dataValues.children_list = [];
                                    users[j].dataValues.children_list.push(children[i][k]);
                                }
                            }
                        }
                    }
                }

                when.all(father_list).then(function(fathers) {
                    for (var j in users) {
                        if (users[j].father != '0') {
                            for (var i in fathers) {
                                if (users[j].father == fathers[i].id) {
                                    users[j].dataValues.fathername = fathers[i].name;
                                }
                            }
                        }
                    }
                    if (req.query.type == 'json') {
                        res.json({ users: users });
                    } else {
                        var result = { users: users };
                        if (offset) result.offset = offset;
                        res.render('supermaster', result);
                    }
                })

            });
        });
    } else {
        res.render('smlogin');
    }
});

router.get('/getusers', function(req, res) {

    db.Users.findAll({
        order: 'expiredate ASC',
        where: {
            id: {
                $gt: 0
            }
        },
        attributes: ['id', 'name', 'children', 'father', 'itcmail', 'nickname', 'expiredate', 'createdAt', 'itcmstertel', 'company', 'permission_trademark', 'permission_prefix', 'permission_logo', 'permission_hidetitle', 'permission_support', 'permission_delete', 'status', 'permission_api']
    }).then(function(users) {
        var children_list = [];
        var father_list = [];

        for (var i in users) {
            if (users[i].children != '[]') {
                children_list.push(db.Users.findAll({
                    where: {
                        id: {
                            $in: JSON.parse(users[i].children)
                        }
                    }
                }))
            }
            if (users[i].father != 0) {
                father_list.push(db.Users.findOne({
                    where: {
                        id: users[i].father
                    }
                }))
            }
        }

        when.all(children_list).then(function(children) {

            for (var j in users) {
                if (users[j].children != '[]') {
                    var children_id_list = JSON.parse(users[j].children);
                    for (var i in children) {
                        for (var k in children[i]) {
                            if (children_id_list.indexOf(children[i][k].id) != -1) {
                                if (!users[j].dataValues.children_list) users[j].dataValues.children_list = [];
                                users[j].dataValues.children_list.push(children[i][k]);
                            }
                        }
                    }
                }
            }

            when.all(father_list).then(function(fathers) {
                for (var j in users) {
                    if (users[j].father != 0) {
                        for (var i in fathers) {
                            if (users[j].father == fathers[i].id) {
                                users[j].dataValues.fathername = fathers[i].name;
                            }
                        }
                    }
                }
                res.json({ user: users });
            })
        });
    });

});

router.post('/unbindaccount', function(req, res) {

    var userid = parseInt(req.body.userid);
    var father = req.body.father;
    db.Users.findOne({
        where: {
            id: father
        }
    }).then(function(hasfather) {
        if (!hasfather) {
            res.json({ code: -99, msg: 'Found fail' })
        }
        var children_list = JSON.parse(hasfather.children);
        var index = children_list.indexOf(userid);
        if (index == '-1') {
            res.json({ code: -97, msg: 'Update fail' });
            return;
        }
        children_list.splice(index, 1);

        db.Users.update({
            children: JSON.stringify(children_list)
        }, {
            where: {
                id: father
            }
        }).then(function(u) {

            if (!u) {
                res.json({ code: -98, msg: 'Update fail' });
                return;
            };

            db.Users.update({
                father: 0
            }, {
                where: {
                    id: userid
                }
            }).then(function(update) {
                if (!update) {
                    res.json({ code: -22, msg: '子账号father字段更新失败' });
                    return;
                }
                res.json({ code: 0, msg: 'Update succeed' });

            })


        })
    })
});

router.post('/change_name', function(req, res) {

    var userid = req.body.userid;
    var name = req.body.name;
    db.Users.update({
        name: name
    }, {
        where: {
            id: userid
        }
    }).then(function(r) {
        if (!r) {
            res.json({ code: -98, msg: 'Update fail' });
            return;
        }
        res.json({ code: 0, msg: 'ok' });
    });

});

router.get('/father', function(req, res) {

    var limit = 20,
        offset = req.query.offset ? (parseInt(req.query.offset) - 1) * limit : 0;

    db.Users.findAll({
        limit: limit,
        offset: offset,
        order: 'expiredate ASC',
        where: {
            id: {
                $gt: 0
            },
            children: {
                $ne: '[]'
            }
        }
    }).then(function(users) {
        if (!users) {
            res.json({ code: -1, msg: 'There is not a user has account' });
            return;
        }
        var children_list = [];

        for (var i in users) {
            children_list.push(db.Users.findAll({
                where: {
                    id: {
                        $in: JSON.parse(users[i].children)
                    }
                }
            }))
        }

        when.all(children_list).then(function(children) {

            for (var j in users) {
                if (users[j].children != '[]') {
                    var children_id_list = JSON.parse(users[j].children);
                    for (var i in children) {
                        for (var k in children[i]) {
                            if (children_id_list.indexOf(children[i][k].id) != -1) {
                                if (!users[j].dataValues.children_list) users[j].dataValues.children_list = [];
                                users[j].dataValues.children_list.push(children[i][k]);
                            }
                        }
                    }
                }
            }

            if (req.query.type == 'json') {
                res.json({ users: users });
            } else {
                var result = { users: users };
                if (offset) result.offset = offset;
                res.render('accounts', result);
            }
        });
    });
});
router.get('/chomd', function(req, res) {

    if (req.session.masterid == 1) {

        var itemnum = 30;
        var page = req.query.page ? req.query.page : 0;
        page *= itemnum;

        db.Users.findAll({
            where: {
                id: {
                    $gt: 1
                }
            }
        }).then(function(users) {

            var r = {
                users: users.slice(page, page + itemnum)
            }
            res.render('chomd', r);
        });
    } else {
        res.json({ "message": "Not Found", "error": { "status": 404 } });
    }

});

router.post('/renewsetexpire', function(req, res) {

    var newdate = req.body.newdate,
        password = req.body.password,
        userids = req.body.userids;

    if (!newdate) {
        res.json({ msg: '请选择日期', code: -6 });
        return;
    }
    if (!password) {
        res.json({ msg: '密码不能为空', code: -9 });
        return;
    }
    if (!userids) {
        res.json({ msg: '呵呵哒', code: -88 });
        return;
    }
    if (password != global_password) {
        res.json({ msg: '管理员密码不正确', code: -8 });
        return;
    }

    // userids = JSON.parse(userids);


    db.Users.update({
        expiredate: newdate
    }, {
        where: {
            id: {
                $in: userids
            }
        }
    }).then(function(u) {
        if (!u) {
            res.json({ code: -1, msg: '续费失败' });
            return;
        };
        res.json({ code: 0, msg: '更新成功' });
    });

})

router.post('/setexpire', function(req, res) {

    var newdate = req.body.newdate,
        password = req.body.password,
        username = req.body.username,
        userid = req.body.userid;

    if (!newdate) {
        res.json({ msg: '请选择日期', code: -6 });
        return;
    }
    if (!password) {
        res.json({ msg: '密码不能为空', code: -9 });
        return;
    }
    if (!userid) {
        res.json({ msg: '呵呵哒', code: -88 });
        return;
    }
    if (password != global_password) {
        res.json({ msg: '管理员密码不正确', code: -8 });
        return;
    }

    db.Users.findOne({
        where: {
            id: userid,
            name: username
        }
    }).then(function(user) {
        if (!user) {
            res.json({ msg: '没有找到该用户', code: -18 });
            return;
        }
        db.Users.update({
            expiredate: newdate
        }, {
            where: {
                id: user.id
            }
        }).then(function(u) {
            if (!u) { return false };
            res.json({ msg: '更新成功', code: 0 });
        });
    });
});



router.post('/addchild', function(req, res) {

    var father = parseInt(req.body.father);
    var username = req.body.username;
    var password = req.body.password;

    if (!father || isNaN(father)) {
        res.json({ code: -98, msg: '请选择父账户' });
        return;
    }
    if (!username || !password) {
        res.json({ code: -2, msg: '新用户资料不能为空' });
        return;
    }

    db.Users.findOne({
        where: {
            name: username
        }
    }).then(function(user) {

        if (user) {
            res.json({ msg: "该用户名已经存在", code: -1 });
            return;
        }

        db.Users.findOne({
            where: {
                id: father
            }
        }).then(function(f) {
            var children = JSON.parse(f.children);

            db.Users.create({
                name: username,
                password: utils.hex_sha1(password + 'letian'),
                level: 1,
                father: f.id,
                company: f.company,
                permission_logo: f.permission_logo,
                permission_prefix: f.permission_prefix,
                permission_hidetitle: f.permission_hidetitle,
                permission_trademark: f.permission_trademark,
                logo: f.logo,
                itcmstertel: 'inherit',
                expiredate: new Date(0),
                nickname: username,
                trademark: f.trademark,
                prefix: f.prefix
            }).then(function(u) {
                children.push(u.id);
                db.Users.update({
                    children: JSON.stringify(children)
                }, {
                    where: {
                        id: f.id
                    }
                }).then(function(u) {
                    res.json({ msg: 'ok', code: 0 });
                });
            })
        })
    });
});

router.post('/bindfather', function(req, res) {

    var username = req.body.username;
    var password = req.body.password;
    var father = req.body.father;

    if (!username || !password) {
        res.json({ msg: '请输入用户名', code: -1 });
        return;
    }

    db.Users.findOne({
        where: {
            name: username,
            password: utils.hex_sha1(password + 'letian')
        }
    }).then(function(user) {
        if (!user) {
            res.json({ code: -98, msg: '该账号不存在或填写信息有误' });
            return;
        }

        if (user.id == father.id) {
            res.json({ code: -91, msg: '不能自己绑定自己' });
            return;
        }

        db.Users.findOne({
            where: {
                id: father,
                level: {
                    gt: 1
                }
            }
        }).then(function(father) {

            if (!father) {
                res.json({ code: -91, msg: '父账号不存在或权限不足' });
                return;
            }

            db.Users.update({
                father: father.id
            }, {
                where: {
                    id: user.id
                }
            }).then(function(r) {

                if (!r) {
                    console.log('更新失败');
                    return;
                }

                var children = JSON.parse(father.children);
                if (children.indexOf(user.id) != -1) {
                    res.json({ code: -99, msg: '该子账号已绑定该母账户' });
                } else {

                    children.push(user.id);
                    children = JSON.stringify(children);

                    db.Users.update({
                        children: children
                    }, {
                        where: {
                            id: father.id
                        }
                    }).then(function(r) {
                        if (!r) {
                            console.log('更新失败');
                            return;
                        }
                        res.json({ code: 0, msg: '绑定成功' });
                    });
                }

            });
        });
    });

});

router.post('/newappiduser', function(req, res) {

    var username = req.body.username;
    var password = req.body.password;

    if (!username || !password) {
        res.json({ msg: '请输入绑定用户信息', code: -98 });
        return;
    }

    db.Users.findOne({
        where: {
            name: username,
            password: utils.hex_sha1(password + 'letian')
        }
    }).then(function(user) {

        if (!user) {
            res.json({ code: -98, msg: '该账号不存在或填写信息有误' });
            return;
        }

        db.Apps.findOne({
            where: {
                user_id: user.id
            }
        }).then(function(a) {
            if (a) {
                res.json({
                    code: 0,
                    msg: '该账号已注册APPID',
                    appid: a.appid,
                    appsecret: a.appsecret
                })
            } else {

                var appid = 'sti' + utils.hex_sha1(Math.random() + '').substring(0, 16);
                var appsecret = utils.hex_sha1(user.password).substring(0, 32);

                db.Apps.create({
                    appid: appid,
                    appsecret: appsecret,
                    level: 100,
                    user_id: user.id,
                    token: null
                }).then(function(r) {

                    db.Users.update({
                        level: 100
                    }, {
                        where: {
                            id: user.id
                        }
                    }).then(function(u) {
                        res.json({
                            code: 0,
                            msg: '注册APPID成功',
                            appid: appid,
                            appsecret: appsecret,
                            username: username
                        });
                    });
                });
            }
        });
    });
});

router.post('/newuser', function(req, res) {

    var username = req.body.username;
    var password = req.body.password;
    var father = req.body.father;
    var expire = req.body.expire;
    var company = req.body.company;
    var itcmstertel = req.body.itcmstertel;
    if (expire == 0) {
        var date = new Date();
        expire = date.getFullYear() + '-' + (date.getMonth() + 7) + '-' + date.getDate();
    }

    expire += ' 00:00:00';

    if (!username) {
        res.json({ msg: '请输入用户名及密码', code: -1 });
        return;
    }
    // if (username.length < 3 || username.length > 18) {
    //     res.json({ msg: '请输入3位～18位字符作为用户名', code: -1 });
    //     return;
    // }

    var usernameList = username.split('|');
    var itcmstertelList = itcmstertel.split('|');

    db.Users.findOne({
        where: {
            $or: [{
                    name: {
                        $in: usernameList
                    }
                },
                {
                    nickname: {
                        $in: usernameList
                    }
                }
            ]
        }
    }).then(function(user) {

        if (user) {
            res.json({ msg: '该用户已经存在', code: -3 });
            return;
        }
        var newuserList = [];

        if (father != 0) {
            db.Users.findOne({
                where: {
                    id: father
                }
            }).then(function(f) {

                if (!f) {
                    res.json({ msg: '父账号不存在', code: -3 });
                    return;
                }
                if (f.level < 10) {
                    res.json({ msg: '父账号权限不足', code: -3 });
                    return;
                }
                var children = JSON.parse(f.children);
                
                for(var i in usernameList){
                    newuserList.push(
                        db.Users.create({
                            name: usernameList[i],
                            password: utils.hex_sha1(password + 'letian'),
                            level: 1,
                            permission_logo: 0,
                            permission_prefix: 1,
                            permission_hidetitle: 0,
                            permission_trademark: 1,
                            expiredate: expire,
                            itcmstertel: itcmstertelList[i] || '',
                            company: company||f.company,
                            nickname: usernameList[i],
                            father: f.id,
                            logo: f.logo,
                            trademark: f.trademark,
                            prefix: f.prefix
                        })
                    )
                }
                when.all(newuserList).then(function(alluser){
                	alluser = JSON.parse(JSON.stringify(alluser));
                    for(var i in alluser){
                        children.push(alluser[i].id);
                        alluser[i].fathername = f.nickname;
                    }
                    db.Users.update({
                        children: JSON.stringify(children)
                    }, {
                        where: {
                            id: f.id
                        }
                    }).then(function(u) {
                        res.json({ msg: 'ok', code: 0, newuser: alluser });
                    });
                });
            });
        } else {
            for(var i in usernameList){
                newuserList.push(
                    db.Users.create({
                        name: usernameList[i],
                        password: utils.hex_sha1(password + 'letian'),
                        level: 1,
                        permission_logo: 0,
                        permission_prefix: 1,
                        permission_hidetitle: 0,
                        permission_trademark: 1,
                        expiredate: expire,
                        itcmstertel: itcmstertelList[i] || '',
                        company: company,
                        nickname: usernameList[i]
                    })
                )
            }
            when.all(newuserList).then(function(alluser){
                res.json({ msg: 'ok', code: 0, newuser: alluser });
            });
        }
    });
});

router.get('/getfathers', function(req, res) {

    if (!req.session.masterid && req.session.masterid == 1) {
        res.json({ code: -98, msg: 'You had logout' });
        return;
    }

    db.Users.findAll({
        attributes: ['id', 'name', 'level'],
        where: {
            level: {
                gt: 1
            },
            id: {
                gt: 1
            }
        }
    }).then(function(fathers) {

        if (!fathers) fathers = [];

        var result = {
            fathers: fathers
        }

        res.json({ code: 0, fathers: fathers });
    });
});

router.post('/', function(req, res) {

    var username = req.body.username;
    var password = req.body.password;

    if (username != 'admin' || password != global_password) {
        res.json({ code: -1, msg: '账号或者密码不正确' });
    } else {
        req.session.masterid = 1;
        res.json({ code: 0, msg: '登录成功' });
    }

});

router.get('/logout', function(req, res) {
    req.session.masterid = undefined;
    res.redirect('/supermaster');
});

router.get('/setpermission', function(req, res) {

    if (req.session.masterid && req.session.masterid == 1) {

        var limit = 20,
            offset = req.query.offset ? (parseInt(req.query.offset) - 1) * limit : 0;
        var key = req.query.key ? req.query.key : '';

        db.Users.findAll({
            offset: offset,
            limit: limit,
            order: 'expiredate ASC',
            where: {
                id: {
                    $gt: 0
                },
                password: {
                    $ne: 'wechat'
                },
                name: {
                    $like: '%' + key + '%'
                }
            }
        }).then(function(users) {
            if (req.query.type == 'json') {
                res.json({ users: users });
            } else {
                var result = { users: users };
                if (offset) result.offset = offset;
                res.render('setpermission', result);
            }
        })

    } else {
        res.render('smlogin');
    }

});

router.post('/bindequit', function(req, res) {
    var userid = req.body.userid;
    var deviceid = req.body.deviceid;
    db.Users.update({
        itcmstertel: deviceid
    }, {
        where: {
            id: userid
        }
    }).then(function(user) {
        if (!user) {
            res.json({ code: -97, msg: '绑定失败' });
            return;
        }
        res.json({ code: 0, msg: '绑定成功' });
    });
});

router.post('/setpermission', function(req, res) {
    var kind = req.body.kind;
    var userid = req.body.userid;
    var permission = req.body.permission;

    if (!userid) {
        res.json({ code: -97, msg: 'heheda' });
        return;
    }

    var data = {};
    data[kind] = permission;

    db.Users.update(data, {
        where: {
            id: userid
        }
    }).then(function(user) {
        if (!user) {
            res.json({ code: -97, msg: '更新失败' })
        } else {
            res.json({ code: 0, msg: '更新成功' })
        }
    });
});

router.post('/delcount', function(req, res) {
    var password = req.body.password;
    if (!password || password != global_password) {
        res.json({ code: -1, msg: '管理员密码不正确' });
        return;
    }
    var id = parseInt(req.body.idStr);
    db.Users.findOne({
        where: {
            id: id
        }
    }).then(function(user) {
        if (!user) {
            res.json({ code: -2, msg: 'No such user' });
            return;
        }
        if (user.id == 1 || user.level >= 500) {
            res.json({ code: -3, msg: '该账号不可删除' });
            return;
        }
        db.Users.destroy({
            where: {
                id: id
            }
        }).then(function(result) {
            if (!result) {
                res.json({ code: -4, msg: '删除失败，请稍后再试' });
                return;
            }
            if (user.father != 0) {
                db.Users.findOne({
                    where: {
                        id: user.father
                    }
                }).then(function(father) {
                    if (!father) {
                        res.json({ code: -91, msg: 'Failed' });
                        return
                    }
                    var children_list = JSON.parse(father.children);
                    if (children_list.indexOf(user.id) != -1) {
                        children_list.splice(children_list.indexOf(user.id), 1);
                    }
                    db.Users.update({
                        children: JSON.stringify(children_list)
                    }, {
                        where: {
                            id: father.id
                        }
                    }).then(function(u) {
                        if (!u) {
                            res.json({ code: -67, msg: 'Failed' });
                            return;
                        }
                        res.json({ code: 0, msg: '删除成功' });
                    })
                })
            } else {
                res.json({ code: 0, msg: '删除成功' });
            }
        });
    })
});

router.post('/resetpsw', function(req, res) {
    var password = req.body.password;
    if (!password || password != global_password) {
        res.json({ code: -1, msg: '管理员密码不正确' });
        return;
    }
    var id = parseInt(req.body.idStr);
    db.Users.findOne({
        where: {
            id: id
        }
    }).then(function(user) {
        if (!user) {
            res.json({ code: -2, msg: 'No such user' });
            return;
        }
        db.Users.update({
            password: '02ec7a1a784cd35806242a72dfaf0a0bd1a06b7a'
        }, {
            where: {
                id: user.id
            }
        }).then(function(up) {
            if (!up) {
                res.json({ code: -3, msg: 'Update Failed' });
                return;
            }
            res.json({ code: 0, msg: '重置密码成功' })
        })
    })
});

router.post('/update', function(req, res) {
    var data = {};
    var itcmstertel = req.body.itcmstertel;
    var company = req.body.company;
    var itcmail = req.body.itcmail;
    var status = req.body.status;
    var idStr = req.body.idStr;
    var arrs = idStr.split(',');
    console.log(itcmstertel);
    console.log(company);
    console.log(itcmail);
    console.log(idStr);
    if (itcmstertel) {
        data.itcmstertel = itcmstertel;
    } else if (company) {
        data.company = company;
    } else if (itcmail) {
        data.itcmail = itcmail;
    } else if (status) {
        data.status = status;
    }
    console.log('大就搜到的奇偶啊' + itcmail);
    db.Users.update(data, {
        where: {
            id: { in: arrs
            }
        }
    }).then(function(user) {
        if (!user) {
            res.json({ code: -97, msg: '更新失败' })
        } else {
            res.json({ code: 0, msg: '更新成功' })
        }
    })
});



router.get('/notice', function(req, res) {

    var r = {},
        name = req.query.name;
    name == 'admin' ? r.isadmin = true : r.isadmin = false;

    r.name = '';


    if (req.session.name == 'admin') {
        r.name = req.session.name;
        var token = utils.hex_sha1(Date.now() + 'muwenhu');
        req.session.token = token;
        r.token = token;
    }
    console.log(req.session.token);

    req.session.name && name ? res.redirect('/notice') : res.render('notice', r);

});

router.get('/notice/logout', function(req, res) {
    req.session.name = undefined;
    req.session.token = undefined;
    res.redirect('/supermaster/notice');
});

router.post('/notice/login', function(req, res) {
    var psw = req.body.psw;
    if (psw == '123') {
        req.session.name = 'admin';
        res.json({ code: 0, msg: 'OK' });
        return;
    }
    res.json({ code: -1, msg: 'Invalid Password' });
});

router.get('/notice/data', function(req, res) {
    fs.readFile('./notice_data.json', function(err, data) {
        var data = JSON.parse(data);
        res.json(data);
    });
});

router.get('/notice/picpdf/data', function(req, res) {
    fs.readFile('./pic_pdf.json', function(err, data) {
        var data = JSON.parse(data);
        res.json(data);
    });
})

router.post('/notice/picpdf/img', function(req, res) {
    fs.readFile('./pic_pdf.json', function(err, data) {
        var data = JSON.parse(data);
        var newimg = { "src": "http://qncdn.sz-sti.com/" + req.body.url };
        data.picture.push(newimg);

        fs.writeFile('./pic_pdf.json', JSON.stringify(data), function(err) {
            if (err) {
                res.json({ code: -4, msg: 'fail to write data' });
                return;
            }
            res.json({ code: 0, msg: '图片写入成功' });
        });
    });
});

router.post('/notice/picpdf/pdf', function(req, res) {
    fs.readFile('./pic_pdf.json', function(err, data) {
        var data = JSON.parse(data);
        var newpdf = {
            "src": "http://qncdn.sz-sti.com/" + req.body.url,
            "name": req.body.name
        };
        data.pdf.push(newpdf);

        fs.writeFile('./pic_pdf.json', JSON.stringify(data), function(err) {
            if (err) {
                res.json({ code: -4, msg: 'fail to write data' });
                return;
            }
            res.json({ code: 0, msg: 'PDF写入成功', data: newpdf });
        });
    });
});


router.post('/updateread', function(req, res) {
    var userid = req.body.userid;
    var readnotice = req.body.readnotice;
    db.Users.findOne({
        where: {
            id: userid
        }
    }).then(function(user) {
        if (!user) {
            res.json({ code: -99, msg: 'No such user' });
            return;
        }
        db.Users.update({
            readnotice: JSON.stringify(readnotice)
        }, {
            where: {
                id: userid
            }
        })
        res.json({ code: 0, msg: 'update succeed' });
    })
});

router.post('/notice/add', function(req, res) {
    if (!req.session.name || !req.session.token) {
        res.json({ code: -1, msg: 'You seem not to be loggin' });
        return;
    }
    if (req.body.token != req.session.token) {
        res.json({ code: -2, msg: 'Invalid Token' });
        return;
    }
    fs.readFile('./notice_data.json', function(err, data) {
        if (err) {
            res.json({ code: -3, msg: 'fail to get data' });
            return;
        }
        var json = JSON.parse(data);
        var data = {
            title: req.body.title,
            noticehtml: JSON.parse(req.body.noticehtml),
            noticetext: JSON.parse(req.body.noticetext),
            status: req.body.status,
            createdAt: Date.parse(new Date()),
            order: 0
        }
        json.push(data);
        fs.writeFile('./notice_data.json', JSON.stringify(json), function(err) {
            if (err) {
                res.json({ code: -4, msg: 'fail to write data' });
                return;
            }
            res.json({ code: 0, msg: '发布成功', data: data });
        });
    });
});

router.post('/notice/update', function(req, res) {
    if (!req.session.name || !req.session.token) {
        res.json({ code: -1, msg: 'You seem not to be loggin' });
        return;
    }
    if (req.body.token != req.session.token) {
        res.json({ code: -2, msg: 'Invalid Token' });
        return;
    }
    fs.readFile('./notice_data.json', function(err, data) {
        if (err) {
            res.json({ code: -3, msg: 'fail to get data' });
            return;
        }
        var json = JSON.parse(data);
        var createdAt = req.body.createdAt;
        var index;
        for (var i in json) {
            if (json[i].createdAt == createdAt) {
                index = i;
            }
        }
        var data = {
            title: req.body.title,
            noticehtml: JSON.parse(req.body.noticehtml),
            noticetext: JSON.parse(req.body.noticetext),
            createdAt: Date.parse(new Date()),
            order: req.body.order
        }
        json[index] = data;

        fs.writeFile('./notice_data.json', JSON.stringify(json), function(err) {
            if (err) {
                res.json({ code: -4, msg: 'fail to write data' });
                return;
            }
            res.json({ code: 0, msg: '发布成功', data: data });
        });
    });
});

router.post('/notice/del', function(req, res) {
    if (!req.session.name || !req.session.token) {
        res.json({ code: -1, msg: 'You seem not to be loggin' });
        return;
    }
    if (req.body.token != req.session.token) {
        res.json({ code: -2, msg: 'Invalid Token' });
        return;
    }
    fs.readFile('./notice_data.json', function(err, data) {
        if (err) {
            res.json({ code: -3, msg: 'fail to get data' });
            return;
        }

        var createdAt = req.body.createdAt;
        var json = JSON.parse(data);

        var index = -1;
        for (var i in json) {
            if (json[i].createdAt == createdAt) index = i;
        }

        if (index == -1) {
            res.json({ code: -4, msg: 'No such job' });
            return;
        }

        json.splice(index, 1);

        fs.writeFile('./notice_data.json', JSON.stringify(json), function(err) {
            if (err) {
                res.json({ code: -4, msg: 'fail to write data' });
                return;
            }
            res.json({ code: 0, msg: '删除成功' });
        });
    });
});
router.post('/notice/order', function(req, res) {
    var create = req.body.create;
    fs.readFile('./notice_data.json', function(err, data) {
        if (err) {
            res.json({ code: -3, msg: 'fail to get data' });
            return;
        }

        var json = JSON.parse(data);
        var minorder = 0;
        var index = 0;
        for (var i in json) {
            if (json[i].order < minorder) {
                minorder = json[i].order;
            }
            if (json[i].createdAt == Date.parse(create)) {
                index = i;
            }
        }
        json[index].order = minorder - 1;
        fs.writeFile('./notice_data.json', JSON.stringify(json), function(err) {
            if (err) {
                res.json({ code: -4, msg: 'fail to write data' });
                return;
            }
            res.json({ code: 0, msg: '置顶成功', minorder: minorder - 1 });
        });
    });
})


router.get('/feedback', function(req, res) {

    var r = {},
        name = req.query.name;
    name == 'admin' ? r.isadmin = true : r.isadmin = false;

    r.name = '';


    if (req.session.name == 'admin') {
        r.name = req.session.name;
        var token = utils.hex_sha1(Date.now() + 'muwenhu');
        req.session.token = token;
        r.token = token;
    }
    console.log(req.session.token);

    req.session.name && name ? res.redirect('/supermaster/feedback') : res.render('feedback', r);
});

router.get('/feedback/logout', function(req, res) {
    req.session.name = undefined;
    req.session.token = undefined;
    res.redirect('/supermaster/feedback');
});

router.post('/feedback/login', function(req, res) {
    var psw = req.body.psw;
    if (psw == '123') {
        req.session.name = 'admin';
        res.json({ code: 0, msg: 'OK' });
        return;
    }
    res.json({ code: -1, msg: 'Invalid Password' });
});

router.get('/feedback/data', function(req, res) {
    fs.readFile('./feedback_data.json', function(err, data) {
        var data = JSON.parse(data);
        res.json(data);
    });
});

router.post('/feedback/add', function(req, res) {
    fs.readFile('./feedback_data.json', function(err, data) {
        if (err) {
            res.json({ code: -3, msg: 'fail to get data' });
            return;
        }
        var json = JSON.parse(data);
        var data = {
            username: req.body.username,
            telephone: parseInt(req.body.telephone),
            email: req.body.email,
            type: req.body.type,
            content: req.body.content,
            createdAt: Date.now()
        }
        json.push(data);
        fs.writeFile('./feedback_data.json', JSON.stringify(json), function(err) {
            if (err) {
                res.json({ code: -4, msg: 'fail to write data' });
                return;
            }
            res.json({ code: 0, msg: '提交成功', data: data });
        });
    });
});
router.get('/news/data', function(req, res) {
    fs.readFile('../views/index/article.ejs', function(err, data) {
        if (err) {
            res.json({ code: -3, msg: 'fail to get data' });
            return;
        }
        res.send(data);
    });
});
router.post('/news/add', function(req, res) {
    fs.readFile('../views/index/article.ejs', function(err, data) {
        if (err) {
            res.json({ code: -3, msg: 'fail to get data' });
            return;
        }

        try {
            var json = JSON.parse(data);
        } catch (err) {
            res.json(err);
            return;
        }


        var data = {
            "title": req.body.title,
            "link": req.body.link,
            "edit": req.body.edit,
            "edittime": req.body.edittime,
            "content": req.body.content,
            "newinfo": req.body.newinfo
        }

        json.news.newslist.unshift(data);

        fs.writeFile('../views/index/article.ejs', JSON.stringify(json), function(err) {
            if (err) {
                res.json({ code: -4, msg: 'fail to write data' });
                return;
            }
            res.json({ code: 0, msg: '添加成功', data: data });
        });
    });
});

router.post('/delnews', function(req, res) {
    fs.readFile('../views/index/article.ejs', function(err, data) {
        if (err) {
            res.json({ code: -3, msg: 'fail to get data' });
            return;
        }
        var json = JSON.parse(data);
        var data = {
            "psw": req.body.psw,
            "title": req.body.title,
            "index": req.body.index
        }
        if (data.psw != '123') {
            res.json({ code: -22, msg: '密码输入错误' });
            return;
        }
        console.log(json.news.newslist[data.index].title);
        console.log(data.title);
        if (json.news.newslist[data.index].title == data.title) {
            json.news.newslist.splice(data.index, 1);
            fs.writeFile('../views/index/article.ejs', JSON.stringify(json), function(err) {
                if (err) {
                    res.json({ code: -4, msg: 'fail to write data' });
                    return;
                }
                res.json({ code: 0, msg: '删除成功', data: data });
            });
        } else {
            res.json({ code: -29, msg: '删除失败' });
            return;
        }
    });
});




router.get('/analysis/login', function(req, res) {
    res.render('analysislogin');
});

router.get('/analysis/data', function(req, res) {

    var r = {},
        name = req.query.name;

    if (req.session.name != 'admin') {
        res.redirect('/supermaster/analysis/login');
        return;
    }

    r.name = 'admin';
    var token = utils.hex_sha1(Date.now() + 'muwenhu');
    req.session.token = token;
    r.token = token;

    var time1 = (new Date(new Date().valueOf() - 7 * 24 * 3600 * 1000)).Format('yyyy-MM-dd hh:mm:ss');

    db.Groups.findAll({
        attributes: ['id', 'user_id', 'createdAt'],
        where: {
            createdAt: {
                $gt: time1
            }
        },
        order: 'createdAt DESC'
    }).then(function(Groups) {


        var oneusers = [];

        for (var i in Groups) {
            if (oneusers.indexOf(Groups[i].user_id) == -1) {
                oneusers.push(Groups[i].user_id);
            }
        }

        var time2 = (new Date(new Date().valueOf() - 3 * 7 * 24 * 3600 * 1000)).Format('yyyy-MM-dd hh:mm:ss');

        db.Groups.findAll({
            attributes: ['id', 'user_id', 'createdAt'],
            where: {
                createdAt: {
                    $lt: time1,
                    $gt: time2
                }
            },
            order: 'createdAt DESC'
        }).then(function(groups) {


            var twousers = [];
            var data = [];

            for (var i in groups) {
                if (oneusers.indexOf(groups[i].user_id) == -1) {
                    var index = twousers.indexOf(groups[i].user_id);
                    if (index == -1) {
                        twousers.push(groups[i].user_id);
                        var obj = {
                            userid: groups[i].user_id,
                            createdAt: groups[i].createdAt
                        };
                        data.push(obj);
                    } else {
                        if (data[index].createdAt < groups[i].createdAt)
                            data[index].createdAt = groups[i].createdAt;
                    }
                }
            }

            db.Users.findAll({
                where: {
                    id: {
                        $in: twousers
                    }
                }
            }).then(function(users) {

                for (var i in users) {
                    for (var j in data) {
                        if (data[j].userid == users[i].id) {
                            data[j].username = JSON.parse(users[i].realname).content2 || users[i].name;
                            data[j].company = users[i].founder || users[i].company || users[i].prefix || JSON.parse(users[i].realname).content1 || '空';
                            data[j].telephone = users[i].itcmail || users[i].telephone || users[i].telphone || '空';
                        }
                    }
                }

                res.json(data);
            });
        });
    });
    // res.render('analysis', r);
});

router.get('/analysis', function(req, res) {
    var r = {};
    if (req.session.name == 'admin') {
        r.name = req.session.name;
        var token = utils.hex_sha1(Date.now() + 'muwenhu');
        req.session.token = token;
        r.token = token;
        res.render('analysis', r);
    } else {
        res.redirect('/supermaster/analysis/login');
    }
});

router.get('/analysis/logout', function(req, res) {
    req.session.name = undefined;
    req.session.token = undefined;
    res.redirect('/supermaster/analysis/login');
});

router.post('/analysis/login', function(req, res) {
    var psw = req.body.psw;
    if (psw == '123') {
        req.session.name = 'admin';
        res.json({ code: 0, msg: 'OK' });
        return;
    }
    res.json({ code: -1, msg: 'Invalid Password' });
});


// router.get('/order', function(req, res){

//     var r = {};
//     if(req.session.name == 'admin'){
//         r.name = req.session.name;
//         var token = utils.hex_sha1(Date.now()+'muwenhu');
//         req.session.token = token;
//         r.token = token;
//         r.isadmin = true;
//         res.render('order', r);
//     }else{
//         r.isadmin = false;
//         res.render('order', r);
//     }
// })


// router.post('/order/login', function(req, res){
//     var psw = req.body.psw;
//     if(psw=='123'){
//         req.session.name = 'admin';
//         res.json({code:0,msg:'OK'});
//         return;
//     }
//     res.json({code:-1,msg:'Invalid Password'});
// })

// router.get('/order/logout', function(req, res){

//     req.session.name = undefined;
//     req.session.token = undefined;
//     res.redirect('/supermaster/order');

// });

// router.get('/order/data', function(req, res){

//     db.Orders.findAll({
//         order: 'createdAt DESC',
//         where: {
//             deleted: 0
//         }
//     }).then(function(orders){
//         res.json({code: 0, msg: 'ok', orders: orders});
//     })

// })

module.exports = router;