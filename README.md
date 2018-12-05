========================================================================
术语解释：

场景    对应一张全景照片
漫游    等价与房源,它包含房源下的所有场景,可以理解为场景组
漫游点  场景与场景之间跳转的热点

========================================================================
常规使用方法:
1)登录 获取cookie
2)获取所有漫游//得到每个房源信息(地址和房型)
              //默认还会附带该房源其中一个场景的信息,可以用来显示缩略图
3)获取漫游详情//得到该房源所有场景信息 客厅，厨房，厕所
4)展示场景


========================================================================
登录接口
    
    post请求:/login
    参数:{
        username:<<STRING>>,
        password:<<STRING>>// sha1(明文密码+'letian'); 小写
        //如 sha1('123letian')=
        //c9864ec14551d5f6a7ad1f5ac12b4fb89f4a4b80
    }

    成功返回结果:{
        msg:'ok',
        code:0
    }

    失败返回结果:{
        msg:'账号不存在或密码错误',
        code:-1
    }
========================================================================
场景url
    
    get请求地址:/scene
    参数:{
        scenekey:<<STRING>>//必填 漫游key
    }
    例子:/scene?scenekey=b3f780bf6ad76e3a26a767837859d178ba231d1e1
========================================================================
漫游编辑url
    
    get请求地址:/scene
    参数:{
        scenekey:<<STRING>>,//必填 漫游key
        mode:<<STRING>>//必填 编辑模式填editor

        type:<<STRING>>//即将遗弃的接口
    }
    例子:/scene?scenekey=b3f780bf6ad76e3a26a767837859d178ba231d1e1&mode=editor

========================================================================
漫游详情接口
    
    get请求地址:/romaing/list?type=json
    参数:{
        groupkey:<<STRING>>,//必填 漫游key
    }
    例子:/romaing/list?type=json&groupkey=b3f780bf6ad76e3a26a767837859d178ba231d1e1

    返回结果:
    {
        "group": {
            "apartment_bathrooms": 1,
            "apartment_halls": 1,
            "apartment_rooms": 1,
            "area": 100,
            "building": "12",
            "business_circle": "\u897f\u4e3d",
            "city": "\u6df1\u5733",
            "comments_id": "{}",
            "community": "\u9633\u5149\u5c0f\u533a",
            "createdAt": "2015-08-03T13:15:14.000Z",
            "extra": "{}",
            "face": "\u4e1c",
            "floor": 1,
            "id": 311,
            "key": "b3f780bf6ad76e3a26a767837859d178ba231d1e1",
            "links_id": "{}",
            "maps_id": "[]",
            "public_group_id": null,
            "region": "\u5357\u5c71",
            "room": "16",
            "scenes_id": "[1669]",
            "show": 11,
            "total_floor": 12,
            "updatedAt": "2015-08-16T08:47:00.000Z",
            "user_id": 1
        },
        "groupkey": "b3f780bf6ad76e3a26a767837859d178ba231d1e1",
        "page": "romaing",
        "permission_logo": 0,
        "permission_prefix": 1,
        "permission_trademark": 1,
        "platform": "iPhone",
        "scenes": [ //场景数组
            {
                "advertisement": null, //底部广告
                "createdAt": "2015-08-03T13:15:10.000Z",
                "extra": "{}",
                "groups_id": "[311]",
                "id": 1669,
                "introduction": null,//房源介绍
                "key": "e5120083c5ee1978d7b871e0119aaeee289b92e9",//场景key 
                                                                  //场景url: wx.sz-sti.com/scene?key={{场景key}}
                                                                  //场景的预览图 http://7xiljm.com1.z0.glb.clouddn.com/images/scenes/{{换成key}}/allinone.jpg?v=&imageMogr2/gravity/NorthWest/crop/!1024x1024a0a0/thumbnail/!20p
                "logo_url": "",
                "name": "\u5ba2\u53852",
                "prefix": "",
                "show": 1,
                "telephone": null, //电话
                "trademark": "", //顶部商标
                "type": 0,
                "updatedAt": "2015-08-16T09:37:27.000Z",
                "user_id": 1,
                "ry": 0,//初始视角
                "visited": 1//访问量
            }
        ],
        "title": "\u6df1\u5733\u5357\u5c71\u9633\u5149\u5c0f\u533a 12 16"
    }
========================================================================
获取所有漫游

    get请求地址:/romaing?type=json
    参数:{
        cur_page:<<INT>>, //可选 当前页数 不填则为1  每页最多返回10个结果
    
        //筛选参数 可选
        max_area:<<INT>>, //最大面积单位平方米
        min_area:<<INT>>, //最小面积
        min_rooms:<<INT>>, //最小房间数
        start_created_time:<<TIME>>, //创建时间区间 如:2015-01-01
        end_created_time:<<TIME>>, //创建时间区间
        start_updated_time:<<TIME>>, //最后更新时间区间
        end_updated_time:<<TIME>>,//最后更新时间区间
    
        //完全匹配
        area:<<INT>>,//面积
        apartment_rooms:<<INT>>,//卧室数
        apartment_halls:<<INT>>,//厅数
        apartment_bathrooms:<<INT>>,//卫生间数
        face:<<FACE>>,//朝向 (东,西,南,北,东南,西北,西南,东北)
        city:<<CITY>>,//城市
        business_circle:<<BUSINESS_CIRCLE>>,//商圈
        community:<<STRING>>,//小区
        region:<<REGION>>,//区域
    
        //模糊匹配
        community_like:<<STRING>>,//小区
    
        //排序 可选
        desc_area:1,//面积降序
        desc_community:1,//小区降序
        desc_created_time:1//创建时间降序
        desc_updated_time:1//更新时间降序
        asc_area:1//面积升序
        asc_community:1//小区升序
        asc_created_time:1//创建时间升序
        asc_updated_time:1//更新时间升序
    
    }
    例子：/romaing?type=json&cur_page=3
    
    返回结果:
    {
        "count": 116, //总数
        "cur_page": 3,//当前页数
        "page": "romaing",
        "platform": "iPhone",//平台
        "romaing": [
            {
                "apartment_bathrooms": 1,
                "apartment_halls": 1,
                "apartment_rooms": 1,
                "area": 100,
                "building": "19", //栋
                "business_circle": "\u897f\u4e3d",
                "city": "\u6df1\u5733",
                "comments_id": "{\"1823\":[51,52,53,54,55,56,62]}",
                "community": "\u901f\u817e\u805a\u521b",
                "createdAt": "2015-08-07T03:37:11.000Z",
                "extra": "{}",
                "face": "\u4e1c",
                "floor": 19,
                "id": 334,
                "key": "25f2ed435347e5e7ea271226f444e3722c1d99f81",     //漫游key
                "links_id": "{\"1823\":[1730,1732],\"1824\":[1728,1729],\"1826\":[1726,1727]}", //链接 {场景id:[链接id]}
                "maps_id": "[]",//沙盘id
                "name": "\u6df1\u5733\u5357\u5c71\u533a\u901f\u817e\u805a\u521b 19 15",
                "prefix": "",
                "privatename": "\u6df1\u5733\u5357\u5c71\u533a\u901f\u817e\u805a\u521b",
                "public_group_id": null,
                "region": "\u5357\u5c71\u533a",
                "room": "15",//房号
                "scene_key": "deb78900e0b744250d8119f728e547e5185cf588", //该漫游的主场景key
                                                                         //该漫游的预览图http://7xiljm.com1.z0.glb.clouddn.com/images/scenes/{{换成key}}/allinone.jpg?v=&imageMogr2/gravity/NorthWest/crop/!1024x1024a0a0/thumbnail/!20p
                "scenes_id": "[1824,1826,1823]",
                "show": 11,
                "total_floor": 19, //总楼层
                "updatedAt": "2015-08-10T07:05:56.000Z",//最后更新时间
                "user_id": 1    //owner id
            },
        ],
        "title": "\u6f2b\u6e38\u5217\u8868"
    }
========================================================================
场景信息

    get请求地址:/scene?type=json
    参数:{
        key:<<SCENE_KEY>> //必选
    }
    
    返回:
    {
        "advertisement": "220.......",//底部广告
        "code": 0,
        "comments": "5B005D00",//评论
        "groupKey": "806963e357872b98dc612fce76b135b3a889c5bc",
        "group_info": {
            "apartment_bathrooms": 1,
            "apartment_halls": 1,
            "apartment_rooms": 1,
            "area": 100,
            "business_circle": null,
            "city": "\u6df1\u5733",
            "community": "\u5357\u56fd\u4e3d\u57ce",
            "face": "\u4e1c",
            "region": "\u5357\u5c71",
            "total_floor": 0
        },
        "hasLogin": true,
        "introduction": null,
        "maps": [//沙盘信息
            {
                "createdAt": "2015-06-05T07:36:14.000Z",
                "extra": "{}",
                "groups_id": "[84]",
                "id": 14,
                "key": "5bd59d71111a9b902ec7e50b75ff1a59a36fe3fb",
                "links": {
                    "154": {
                        "createdAt": "2015-06-05T07:36:31.000Z",
                        "id": 154,
                        "position_x": 49.642,//百分比
                        "position_y": 43.6803,//百分比
                        "position_z": 0,
                        "rx": -41.34474592632965,
                        "ry": 0,
                        "sceneKey": "13a9cc323bfc859f3397eaea6e2d0e4a2622fec8",
                        "scene_id": 301,
                        "text": "\u5927\u5385",
                        "type": 100,
                        "updatedAt": "2015-06-05T07:36:31.000Z",
                        "user_id": 1
                    },
                    "155": {
                        "createdAt": "2015-06-05T07:36:45.000Z",
                        "id": 155,
                        "position_x": 21.2411,
                        "position_y": 25.2788,
                        "position_z": 0,
                        "rx": -49.96056199228367,
                        "ry": 0,
                        "sceneKey": "abdc800ad30c5b83ff8e81171560ffe3713e816d",
                        "scene_id": 305,
                        "text": "\u4e3b\u5367",
                        "type": 100,
                        "updatedAt": "2015-07-08T01:59:25.000Z",
                        "user_id": 1
                    }
                },
                "links_id": [
                    154,
                    155,
                    156,
                    157,
                    158
                ],
                "name": "\u6c99\u76d8",
                "show": 1,
                "updatedAt": "2015-06-05T07:37:29.000Z",
                "user_id": 1
            }
        ],
        "mode": "viewer",
        "msg": "ok",
        "page": "scene",
        "permission_hidetitle": 0,
        "permission_logo": 0,
        "platform": "pc-webkit<<Macintosh; Intel Mac OS X 10_10_2>>",
        "romaing": [//其他房间信息
            {
                "advertisement": "<div>\u901f\u817e\u805a\u521b</div><div>4006325830</div><div></div>",
                "createdAt": "2015-05-29T10:57:00.000Z",
                "extra": "{}",
                "groups_id": "[84]",
                "id": 301,
                "introduction": null,
                "key": "13a9cc323bfc859f3397eaea6e2d0e4a2622fec8",
                "logo_url": "",
                "name": "\u5927\u5385",
                "prefix": "\u901f\u817e\u805a\u521b",
                "show": 1,
                "telephone": "4006325830",
                "trademark": "",
                "type": 0,
                "updatedAt": "2015-09-28T02:48:13.000Z",
                "user_id": 1,
                "ry": 0,
                "visited": 3088
            }
        ],
        "ry": 0,// 初始视角 0度
        "sceneKey": "13a9cc323bfc859f3397eaea6e2d0e4a2622fec8",
        "scene_id": 301,
        "spots": "5B0..................",//漫游点信息 需要通过unicode2Chr 解析
        "telephone": "4006325830",//右下角电话
        "title": "\u901f\u817e\u805a\u521b \u6df1\u5733 \u5357\u5c71 \u5357\u56fd\u4e3d\u57ce \u5927\u5385",
        "trademark": "",
        "track": 0,//返回漫游详情时滚动到第n个
        "visited": 3088
    }
