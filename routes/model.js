var Sequelize = require("sequelize");
var config = require("./config");
var sequelize = new Sequelize(config.dbDatabase, config.dbUser, config.dbPassword, {
    host: config.dbHost,
    dialect: 'mysql',
    pool: {
        max: 20,
        min: 0,
        idle: 10000
    },
    charset:'utf8',
    timestamps: false,
    timezone: '+08:00',
    logging: false
});


var Missions = sequelize.define('Missions', {
    id: {
        type: Sequelize.INTEGER,
        field: 'id',
        primaryKey: true,
        autoIncrement: true
    },
    key: {
        type: Sequelize.CHAR(100),
        field: 'key'
    },
    type: {
        type: Sequelize.INTEGER,
        field: 'type'
    },
    status: {
        type: Sequelize.INTEGER,
        field: 'status'
    }
}, {
    freezeTableName: true
});


var MultiPro = sequelize.define('multipro', {
    id: {
        type: Sequelize.INTEGER,
        field: 'id',
        primaryKey: true,
        autoIncrement: true
    },
    title: {
        type: Sequelize.CHAR(100),
        field: 'title'
    },
    key: {
        type: Sequelize.CHAR(50),
        field: 'key'
    },
    show: {
        type: Sequelize.INTEGER,
        field: 'show'
    },
    user_id: {
        type: Sequelize.INTEGER,
        field: 'user_id'
    },
    groups_id: {
        type: Sequelize.CHAR(100),
        field: 'groups_id'
    }
}, {
    freezeTableName: true
});



var Comments = sequelize.define('comments', {
    id: {
        type: Sequelize.INTEGER,
        field: 'id',
        primaryKey: true,
        autoIncrement: true
    },
    //回复
    reply_id:{
        type: Sequelize.INTEGER,
        field: 'reply_id'
    },
    is_description:{
        type: Sequelize.INTEGER,
        field: 'is_description'
    },
    is_mosaic:{
        type: Sequelize.INTEGER,
        field: 'is_mosaic'
    },
    type:{
        type: Sequelize.INTEGER,
        field: 'type'
    },
    position_x:{
        type: Sequelize.FLOAT,
        field: 'position_x'
    },
    position_y:{
        type: Sequelize.FLOAT,
        field: 'position_y'
    },
    position_z:{
        type: Sequelize.FLOAT,
        field: 'position_z'
    },
    //评论
    text:{
        type: Sequelize.CHAR(60),
        field: 'text'
    },
    user_id:{
        type: Sequelize.INTEGER,
        field: 'user_id'
    },
    is_new:{
        type: Sequelize.INTEGER,
        field: 'is_new'
    },
    hotimg_name:{
        type: Sequelize.CHAR(20),
        field: 'hotimg_name'
    },
    hotimg_des:{
        type: Sequelize.CHAR(20),
        field: 'hotimg_des'
    }
}, {
  freezeTableName: true
});

var Links = sequelize.define('links', {
    id: {
        type: Sequelize.INTEGER,
        field: 'id',
        primaryKey: true,
        autoIncrement: true
    },
    text:{
        type: Sequelize.CHAR(30),
        field: 'text'
    },
    //链接到场景的id
    scene_id:{
        type: Sequelize.INTEGER,
        field: 'scene_id'
    },
    position_x:{
        type: Sequelize.FLOAT,
        field: 'position_x'
    },
    position_y:{
        type: Sequelize.FLOAT,
        field: 'position_y'
    },
    position_z:{
        type: Sequelize.FLOAT,
        field: 'position_z'
    },
    //链接样式0直线1左2右3左4右56789
    type:{
        type:Sequelize.INTEGER,
        field: 'type'
    },
    user_id:{
        type: Sequelize.INTEGER,
        field: 'user_id'
    },
    is_new:{
        type: Sequelize.INTEGER,
        field: 'is_new'
    }
}, {
  freezeTableName: true
});

var Apps = sequelize.define('apps', {
    id: {
        type: Sequelize.INTEGER,
        field: 'id',
        primaryKey: true,
        autoIncrement: true
    },
    level: {
        type: Sequelize.INTEGER,
        field: 'level'
    },
    user_id: {
        type: Sequelize.INTEGER,
        field: 'user_id'
    },
    appid:{
        type: Sequelize.CHAR(100),
        field: 'appid'
    },
    appsecret:{
        type: Sequelize.CHAR(255),
        field: 'appsecret'
    },
    access_token:{
        type: Sequelize.CHAR(200),
        field: 'access_token'
    }
}, {
  freezeTableName: true
});

var Binds = sequelize.define('binds', {
    id: {
        type: Sequelize.INTEGER,
        field: 'id',
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: Sequelize.INTEGER,
        field: 'user_id'
    },
    app_id:{
        type: Sequelize.CHAR(200),
        field: 'app_id'
    },
    code:{
        type: Sequelize.CHAR(100),
        field: 'code'
    },
    time:{
        type: Sequelize.CHAR(50),
        field: 'time'
    },
    access_token:{
        type: Sequelize.CHAR(200),
        field: 'access_token'
    },
    redirect_uri:{
        type: Sequelize.CHAR(255),
        field: 'redirect_uri'
    },
    openid:{
        type: Sequelize.CHAR(200),
        field: 'openid'
    }
}, {
  freezeTableName: true
});

var Scenes = sequelize.define('scenes', {
    id: {
        type: Sequelize.INTEGER,
        field: 'id',
        primaryKey: true,
        autoIncrement: true
    },
    //随机key
    key: {
        type: Sequelize.CHAR(128),
        field: 'key',
    },
    //prefix
    prefix: {
        type: Sequelize.CHAR(25),
        field: 'prefix',
    },
    logo: {
        type: Sequelize.CHAR(250),
        field: 'logo',
    },
    trademark: {
        type: Sequelize.CHAR(250),
        field: 'trademark',
    },
    //底部广告
    advertisement: {
        type: Sequelize.CHAR(250),
        field: 'advertisement',
    },
    //联系电话
    telephone: {
        type: Sequelize.CHAR(250),
        field: 'telephone',
    },
    user_id: {
        type: Sequelize.INTEGER,
        field: 'user_id'
    },
    order: {
        type: Sequelize.INTEGER,
        field: 'order'
    },
    //name
    name: {
        type: Sequelize.CHAR(250),
        field: 'name',
    },
    //尾数 0 自己可见 1 所有人可见 （－10<=x<0 图片上传中)(大于0可见）（小于－10 被删除）
    show:{
        type: Sequelize.INTEGER,
        field: 'show'
    },
    //访问量
    visited:{
        type: Sequelize.INTEGER,
        field: 'visited'
    },
    //介绍
    introduction:{
        type: Sequelize.TEXT,
        field: 'introduction'
    },
    //属于哪些组
    groups_id:{
        type: Sequelize.TEXT,
        field: 'groups_id'
    },
    //0 内景 1外景
    type:{
        type: Sequelize.INTEGER,
        field: 'type'
    },
    //初始视角
    ry:{
        type: Sequelize.FLOAT,
        field: 'ry'
    },
    rx:{
        type: Sequelize.FLOAT,
        field: 'rx'
    },
    cfov:{
        type: Sequelize.FLOAT,
        field: 'cfov'
    },
    scenestyle:{
        type: Sequelize.FLOAT,
        field: 'scenestyle'
    },
    //保留
    extra:{
        type: Sequelize.TEXT,
        field: 'extra'
    },
    order:{
        type: Sequelize.INTEGER,
        field: 'order'
    },
    is_new:{
        type: Sequelize.INTEGER,
        field: 'is_new'
    },
    deviceid:{
        type: Sequelize.TEXT,
        field: 'deviceid'
    },
    jzmode:{
        type: Sequelize.INTEGER,
        field: 'jzmode'
    },
    width:{
        type: Sequelize.CHAR(20),
        field: 'width'
    },
    group_id:{
        type: Sequelize.INTEGER,
        field: 'group_id'
    }
}, {
  freezeTableName: true
});

var Users = sequelize.define('users', {
    id: {
        type: Sequelize.INTEGER,
        field: 'id',
        primaryKey: true,
        autoIncrement: true
    },
    //昵称
    nickname: {
        type: Sequelize.CHAR(20),
        field: 'nickname'
    },
    //真实名字
    realname: {
        type: Sequelize.CHAR(100),
        field: 'realname'
    },
    //登陆名
    name: {
        type: Sequelize.CHAR(128),
        field: 'name'
    },
    //背景音乐
    bgmusic: {
        type: Sequelize.CHAR(128),
        field: 'bgmusic'
    },
    //sha1(password+'letian')
    password:{
        type: Sequelize.CHAR(128),
        field: 'password'
    },
    advertisement:{
        type: Sequelize.TEXT,
        field: 'advertisement'
    },
    //商标
    trademark:{
        type: Sequelize.CHAR(250),
        field: 'trademark'
    },
    //前缀
    prefix:{
        type: Sequelize.CHAR(20),
        field: 'prefix'
    },
    logo:{
        type: Sequelize.CHAR(150),
        field: 'logo'
    },
    qrcode:{
        type: Sequelize.INTEGER,
        field: 'qrcode'
    },
    isrotate:{
        type: Sequelize.INTEGER,
        field: 'isrotate'
    },
    telephone: {
        type: Sequelize.CHAR(250),
        field: 'telephone',
    },
    //顶部商标修改权限 0/1
    permission_trademark:{
        type: Sequelize.INTEGER,
        field: 'permission_trademark'
    },
    //sti logo左上角修改权限 0/1隐藏/2使用url
    permission_logo:{
        type: Sequelize.INTEGER,
        field: 'permission_logo'
    },
    //分享标题前缀 0 不可修改 1可修改
    permission_prefix:{
        type: Sequelize.INTEGER,
        field: 'permission_prefix'
    },
    //隐藏title 0 1
    permission_hidetitle:{
        type: Sequelize.INTEGER,
        field: 'permission_hidetitle'
    },
    //0 1
    permission_support:{
        type: Sequelize.INTEGER,
        field: 'permission_support'
    },
    //0 1
    permission_api:{
        type: Sequelize.INTEGER,
        field: 'permission_api'
    },
    permission_delete:{
        type: Sequelize.INTEGER,
        field: 'permission_delete'
    },
    //语音播报播放状态 0/1
    permission_introduction:{
        type: Sequelize.INTEGER,
        field: 'permission_introduction'
    },
    //背景音乐播放状态 0/1
    permission_bgsnd:{
        type: Sequelize.INTEGER,
        field: 'permission_bgsnd'
    },
    //公司
    company:{
        type: Sequelize.INTEGER,
        field: 'company'
    },
    //级别 master 10 普通0
    children:{
        type: Sequelize.CHAR(2000),
        field: 'children'
    },
    //级别 master 10 普通0
    level:{
        type: Sequelize.INTEGER,
        field: 'level'
    },
    expiredate:{
        type: Sequelize.DATE,
        field: 'expiredate'
    },
    itcregion:{
        type: Sequelize.CHAR(100),
        field: 'itcregion'
    },
    itcmail:{
        type: Sequelize.CHAR(100),
        field: 'itcmail'
    },
    deletepsw:{
        type: Sequelize.CHAR(50),
        field: 'deletepsw'
    },
    itcmstertel:{
        type: Sequelize.CHAR(50),
        field: 'itcmstertel'
    },
    itccontacts:{
        type: Sequelize.CHAR(50),
        field: 'itccontacts'
    },
    itcwebsite:{
        type: Sequelize.CHAR(50),
        field: 'itcwebsite'
    },
    itccontactstel:{
        type: Sequelize.CHAR(50),
        field: 'itccontactstel'
    },
    agent:{
        type: Sequelize.INTEGER,
        field: 'agent'
    },
    //父亲
    father:{
        type: Sequelize.INTEGER,
        field: 'father'
    },
    //公告
    readnotice:{
        type: Sequelize.CHAR(255),
        field: 'readnotice'
    },
    //朋友圈
    sharekey:{
        type: Sequelize.CHAR(200),
        field: 'sharekey'
    },
    status:{
        type: Sequelize.INTEGER,
        field: 'status'
    },
    listapi:{
        type: Sequelize.CHAR(255),
        field: 'listapi'
    },
    callbackapi:{
        type: Sequelize.CHAR(255),
        field: 'callbackapi'
    },
    avatar: {
        type: Sequelize.CHAR(100),
        field: 'avatar'
    }
}, {
  freezeTableName: true
});

var Groups = sequelize.define('groups', {
    id: {
        type: Sequelize.INTEGER,
        field: 'id',
        primaryKey: true,
        autoIncrement: true
    },
    user_id:{
        type: Sequelize.INTEGER,
        field: 'user_id'
    },
    //sha1
    key: {
        type: Sequelize.CHAR(128),
        field: 'key'
    },
    //小于0 不可见 10或以上漫游可见
    show:{
        type: Sequelize.INTEGER,
        field: 'show'
    },
    links_id:{
        type: Sequelize.TEXT,
        field: 'links_id'
    },
    //纬度
    lng:{
        type: Sequelize.DECIMAL,
        field: 'lng'
    },
    //经度
    lat:{
        type: Sequelize.DECIMAL,
        field: 'lat'
    },
    //{
    //   场景id:[评论id,id,id]
    //}
    comments_id:{
        type: Sequelize.TEXT,
        field: 'comments_id'
    },
    //场景id数组
    scenes_id:{
        type: Sequelize.TEXT,
        field: 'scenes_id'
    },
    maps_id:{
        type: Sequelize.TEXT,
        field: 'maps_id'
    },
    //保留
    extra:{
        type: Sequelize.TEXT,
        field: 'extra'
    },
    recommend:{
        type: Sequelize.INTEGER,
        field: 'recommend'
    },
    introduction:{
        type: Sequelize.CHAR(250),
        field: 'introduction'
    },
    //深圳
    city:{
        type: Sequelize.CHAR(250),
        field: 'city'
    },
    //罗湖
    region:{
        type: Sequelize.CHAR(250),
        field: 'region'
    },
    //小区
    community:{
        type: Sequelize.CHAR(250),
        field: 'community'
    },
    //栋
    building:{
        type: Sequelize.CHAR(250),
        field: 'building'
    },
    //房号
    room:{
        type: Sequelize.CHAR(250),
        field: 'room'
    },
    //楼层
    floor:{
        type: Sequelize.INTEGER,
        field: 'floor'
    },
    apartment_halls:{
        type: Sequelize.INTEGER,
        field: 'apartment_halls'
    },
    apartment_bathrooms:{
        type: Sequelize.INTEGER,
        field: 'apartment_bathrooms'
    },
    apartment_rooms:{
        type: Sequelize.INTEGER,
        field: 'apartment_rooms'
    },
    area:{
        type: Sequelize.FLOAT,
        field: 'area'
    },
    name:{
        type: Sequelize.CHAR(200),
        field: 'name'
    },
    plant_status:{
        type: Sequelize.INTEGER,
        field: 'plant_status'
    },
    copyfrom:{
        type: Sequelize.INTEGER,
        field: 'copyfrom'
    },
    //total楼层
    total_floor:{
        type: Sequelize.INTEGER,
        field: 'total_floor'
    },
    //商圈
    business_circle:{
        type: Sequelize.CHAR(250),
        field: 'business_circle'
    },
    //朝向
    face:{
        type: Sequelize.CHAR(250),
        field: 'face'
    },
    //外景id
    public_group_id:{
        type: Sequelize.INTEGER,
        field: 'public_group_id'
    },
    width:{
        type: Sequelize.INTEGER,
        field: 'width'
    },
    liked:{
        type: Sequelize.INTEGER,
        field: 'liked'
    },
    autoplay: {
        type: Sequelize.INTEGER,
        field: 'autoplay'
    },
    //朝向
    bottrademark: {
        type: Sequelize.CHAR(200),
        field: 'bottrademark'
    },
    //房源标识符
    housekey: {
        type: Sequelize.CHAR(200),
        field: 'housekey'
    },
    title: {
        type: Sequelize.CHAR(200),
        field: 'title'
    },
    visited: {
        type: Sequelize.INTEGER,
        field: 'visited'
    },
    price: {
        type: Sequelize.CHAR(50),
        field: 'price'
    }
}, {
  freezeTableName: true
});

var Action_log = sequelize.define('action_log', {
    id: {
        type: Sequelize.INTEGER,
        field: 'id',
        primaryKey: true,
        autoIncrement: true
    },
    ip:{
        type:Sequelize.CHAR(250),
        filed:'ip'
    },
    user_id:{
        type: Sequelize.INTEGER,
        field: 'user_id'
    },
    group_id:{
        type: Sequelize.INTEGER,
        field: 'group_id'
    },
    //深圳
    city:{
        type: Sequelize.CHAR(250),
        field: 'city'
    },
    //罗湖
    region:{
        type: Sequelize.CHAR(250),
        field: 'region'
    },
    //android-app ios-app wechat pc
    platform:{
        type: Sequelize.CHAR(250),
        field: 'platform'
    },
    operate:{
        type: Sequelize.CHAR(250),
        field: 'operate'
    },
    user_name:{
        type: Sequelize.CHAR(250),
        field: 'user_name'
    },
    group_name:{
        type: Sequelize.CHAR(250),
        field: 'group_name'
    },
    other:{
        type: Sequelize.CHAR(250),
        field: 'other'
    }
}, {
  freezeTableName: true
});

var Maps = sequelize.define('maps', {
    id: {
        type: Sequelize.INTEGER,
        field: 'id',
        primaryKey: true,
        autoIncrement: true
    },
    user_id:{
        type: Sequelize.INTEGER,
        field: 'user_id'
    },
    //random key
    key: {
        type: Sequelize.CHAR(128),
        field: 'key'
    },
    name: {
        type: Sequelize.CHAR(250),
        field: 'name'
    },
    links_id:{
        type: Sequelize.TEXT,
        field: 'links_id'
    },
    groups_id:{
        type: Sequelize.TEXT,
        field: 'groups_id'
    },
    show:{
        type: Sequelize.INTEGER,
        field: 'show'
    },
    //default {}
    extra:{
        type: Sequelize.TEXT,
        field: 'extra'
    }
}, {
  freezeTableName: true
});


var Public_groups = sequelize.define('public_groups', {
    id: {
        type: Sequelize.INTEGER,
        field: 'id',
        primaryKey: true,
        autoIncrement: true
    },
    user_id:{
        type: Sequelize.INTEGER,
        field: 'user_id'
    },
    //sha1
    key: {
        type: Sequelize.CHAR(128),
        field: 'key'
    },
    //小于0 不可见 10或以上漫游可见
    show:{
        type: Sequelize.INTEGER,
        field: 'show'
    },
    links_id:{
        type: Sequelize.TEXT,
        field: 'links_id'
    },
    //{
    //   来源场景id:{
    //      场景id:[评论id,id,id],
    //      场景id:[评论id,id,id]
    //  },
    //  ...
    //}
    comments_id:{
        type: Sequelize.TEXT,
        field: 'comments_id'
    },
    //场景id数组
    scenes_id:{
        type: Sequelize.TEXT,
        field: 'scenes_id'
    },
    maps_id:{
        type: Sequelize.TEXT,
        field: 'maps_id'
    },
    //保留
    extra:{
        type: Sequelize.TEXT,
        field: 'extra'
    },
    //深圳
    city:{
        type: Sequelize.CHAR(250),
        field: 'city'
    },
    //罗湖
    region:{
        type: Sequelize.CHAR(250),
        field: 'region'
    },
    //小区
    community:{
        type: Sequelize.CHAR(250),
        field: 'community'
    }
}, {
  freezeTableName: true
});
var Orders = sequelize.define('orders', {
    id: {
        type: Sequelize.INTEGER,
        field: 'id',
        primaryKey: true,
        autoIncrement: true
    },
    name:{
        type: Sequelize.CHAR(50),
        field: 'name'
    },
    telephone:{
        type: Sequelize.CHAR(50),
        field: 'telephone'
    },
    qq:{
        type: Sequelize.CHAR(50),
        field: 'QQ'
    },
    wechat:{
        type: Sequelize.CHAR(100),
        field: 'wechat'
    },
    email:{
        type: Sequelize.CHAR(100),
        field: 'email'
    },
    address:{
        type: Sequelize.CHAR(255),
        field: 'address'
    },
    position:{
        type: Sequelize.CHAR(50),
        field: 'position'
    },
    organization:{
        type: Sequelize.CHAR(255),
        field: 'organization'
    },
    mobilephone:{
        type: Sequelize.CHAR(255),
        field: 'mobilephone'
    },
    product:{
        type: Sequelize.CHAR(255),
        field: 'product'
    },
    quantity:{
        type: Sequelize.CHAR(255),
        field: 'quantity'
    },
    deliverdate:{
        type: Sequelize.CHAR(255),
        field: 'deliverdate'
    },
    application:{
        type: Sequelize.CHAR(255),
        field: 'application'
    },
    suggest:{
        type: Sequelize.CHAR(255),
        field: 'suggest'
    },
    deleted: {
        type: Sequelize.INTEGER,
        field: 'deleted'
    }
}, {
  freezeTableName: true
});

var Support = sequelize.define('support', {
    id: {
        type: Sequelize.INTEGER,
        field: 'id',
        primaryKey: true,
        autoIncrement: true
    },
    key: {
        type: Sequelize.CHAR(128),
        field: 'key'
    },
    deviceid: {
        type: Sequelize.CHAR(50),
        field: 'deviceid'
    },
    calibration_2cam_xml_url: {
        type: Sequelize.CHAR(255),
        field: 'calibration_2cam_xml_url'
    },
    camera_xml_url: {
        type: Sequelize.CHAR(255),
        field: 'camera_xml_url'
    },
    type: {
        type: Sequelize.INTEGER,
        field: 'type'
    }
}, {
    freezeTableName: true
});

exports.Maps=Maps;
exports.Scenes=Scenes;
exports.Comments=Comments;
exports.Links=Links;
exports.Binds=Binds;
exports.Apps=Apps;
exports.Users=Users;
exports.Groups=Groups;
exports.Public_groups=Public_groups;
exports.Action_log=Action_log;
exports.Missions=Missions;
exports.MultiPro=MultiPro;
exports.Orders=Orders;
exports.Support=Support;