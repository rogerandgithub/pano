var value = {
	// "110000":"北京",
	// "bj":"北京市区",

	// "120000":"天津",
	// "tj":"天津市区",

	// "130000":"河北",
	// "sjz":"石家庄","ts":"唐山","qhd":"秦皇岛","hd":"邯郸","xt":"邢台","bd":"保定","zjk":"张家口","chengde":"承德","cangzhou":"沧州","lf":"廊坊","hs":"衡水","wuan":"武安","qa":"迁安","sanhe":"三河","xinji":"辛集","jinzhoushi":"晋州","hbbazhou":"霸州","zunhua":"遵化","gc":"藁城","shahe":"沙河","gbd":"高碑店","huanghua":"黄骅","luquan":"鹿泉","zhuozhou":"涿州","luannan":"滦南","chengdexian":"承德县","laoting":"乐亭","luanxian":"滦县","caofeidian":"曹妃甸","zhengding":"正定","yongnian":"永年","dingzhou":"定州","luancheng":"栾城","cixian":"磁县","shexian":"涉县","linzhang":"临漳","feixiang":"肥乡","chengan":"成安","changli":"昌黎","yixian":"易县","anping":"安平","ningjin":"宁晋","zhaoxian":"赵县","gaoyang":"高阳","xinle":"新乐","pingshan":"平山","renqiu":"任丘","pingquan":"平泉","fengning":"丰宁","kuancheng":"宽城","weichang":"围场","qinghe":"清河","longyao":"隆尧","neiqiu":"内丘","nangong":"南宫",

	// "140000":"山西",
	// "ty":"太原","dt":"大同","yq":"阳泉","changzhi":"长治","jincheng":"晋城","shuozhou":"朔州","jz":"晋中","yuncheng":"运城","xinzhou":"忻州","linfen":"临汾","lvliang":"吕梁","houma":"侯马","yongji":"永济","hj":"河津","gaoping":"高平","xiaoyi":"孝义","jiexiu":"介休","yp":"原平","huozhou":"霍州","fenyang":"汾阳","gujiao":"古交","yangcheng":"阳城","xiangyuan":"襄垣","lingshi":"灵石","taigu":"太谷","huairen":"怀仁","hongtong":"洪洞","linyixian":"临猗","lingchuan":"陵川",

	// "150000":"内蒙古",
	// "hu":"呼和浩特","bt":"包头","wuhai":"乌海","chifeng":"赤峰","tongliao":"通辽","erds":"鄂尔多斯","hlbe":"呼伦贝尔","byne":"巴彦淖尔","wlcb":"乌兰察布","xan":"兴安盟","xlgl":"锡林郭勒","als":"阿拉善盟","eegn":"额尔古纳","mzl":"满洲里","wltqq":"乌拉特前旗","dalateqi":"达拉特旗","tmtyq":"土默特右旗","zhungeerqi":"准格尔旗","yjhlq":"伊金霍洛旗",

	// "210000":"辽宁",
	// "sy":"沈阳","dl":"大连","as":"鞍山","fushun":"抚顺","benxi":"本溪","dandong":"丹东","jinzhou":"锦州","yk":"营口","fx":"阜新","liaoyang":"辽阳","pj":"盘锦","tl":"铁岭","cy":"朝阳","hld":"葫芦岛","haicheng":"海城","donggang":"东港","zhuanghe":"庄河","xinmin":"新民","dsq":"大石桥","gaizhou":"盖州","xingcheng":"兴城","dbs":"调兵山","dengta":"灯塔","fengcheng":"凤城","linghai":"凌海","taihe":"太和","suizhong":"绥中","dawa":"大洼",

	// "220000":"吉林",
	// "cc":"长春","jl":"吉林","sp":"四平","liaoyuan":"辽源","th":"通化","baishan":"白山","songyuan":"松原","bc":"白城","yanbian":"延边","huadian":"桦甸","mhk":"梅河口","gzl":"公主岭","tn":"洮南","shulan":"舒兰","jianshi":"集安","linjiang":"临江","jiaohe":"蛟河","panshi":"磐石","liuhe":"柳河","fusong":"抚松","huinan":"辉南",

	// "230000":"黑龙江",
	// "hrb":"哈尔滨","qqhr":"齐齐哈尔","jixi":"鸡西","hegang":"鹤岗","sys":"双鸭山","dq":"大庆","yich":"伊春","jms":"佳木斯","qth":"七台河","mdj":"牡丹江","heihe":"黑河","suihua":"绥化","dxal":"大兴安岭","mh":"漠河","mishan":"密山","shangzhi":"尚志","nehe":"讷河","hl":"海林",

	// "310000":"上海",
	// "sh":"上海市区",

	// "320000":"江苏",
	// "nj":"南京","wx":"无锡","xz":"徐州","cz":"常州","su":"苏州","nt":"南通","lyg":"连云港","ha":"淮安","yancheng":"盐城","yz":"扬州","zj":"镇江","taizhou":"泰州","suqian":"宿迁","kunshan":"昆山","jiangyin":"江阴","liyang":"溧阳","yixing":"宜兴","jintan":"金坛","jingjiang":"靖江","wj":"吴江","taicang":"太仓","df":"大丰","dongtai":"东台","changshu":"常熟","danyang":"丹阳","pz":"邳州","qidong":"启东","rg":"如皋","jr":"句容","xh":"兴化","taixing":"泰兴","hm":"海门","gaoyou":"高邮","yizheng":"仪征","shuyang":"沭阳","sheyang":"射阳","binhai":"滨海","xiangshui":"响水","fn":"阜宁","jianhu":"建湖","zjg":"张家港","xinyi":"新沂","yangzhong":"扬中","baoying":"宝应","zhouzhuang":"周庄","haian":"海安","guanyun":"灌云","guannan":"灌南","ganyu":"赣榆","donghai":"东海","siyang":"泗阳","sihong":"泗洪","peixian":"沛县","xuyi":"盱眙","pingjiang":"平江","suiningxian":"睢宁",

	// "330000":"浙江",
	// "hz":"杭州","nb":"宁波","wz":"温州","jx":"嘉兴","huzhou":"湖州","sx":"绍兴","jh":"金华","quzhou":"衢州","zhoushan":"舟山","tz":"台州","lishui":"丽水","yiwu":"义乌","chx":"长兴","cixi":"慈溪","dongyang":"东阳","shangyu":"上虞","wenling":"温岭","yongkang":"永康","yuyao":"余姚","linhai":"临海","deqing":"德清","zhuji":"诸暨","ruian":"瑞安","yueqing":"乐清","tx":"桐乡","lx":"兰溪","js":"嘉善","haining":"海宁","aj":"安吉","jiangshan":"江山","shengsi":"嵊泗","nh":"宁海","ph":"平湖","shengzhou":"嵊州","fenghua":"奉化","linan":"临安","wuzhen":"乌镇","xitang":"西塘","fuyangfy":"富阳","jd":"建德","cangnan":"苍南","ca":"淳安","xiangshan":"象山","yh":"玉环","haiyan":"海盐","pujiang":"浦江","xianju":"仙居","tiantai":"天台","sanmen":"三门","hengdian":"横店","suichang":"遂昌","xinchang":"新昌","longquan":"龙泉","jinyun":"缙云","qingtian":"青田","longyou":"龙游",

	// "340000":"安徽",
	// "hf":"合肥","wuhu":"芜湖","bengbu":"蚌埠","hn":"淮南","mas":"马鞍山","huaibei":"淮北","tongling":"铜陵","anqing":"安庆","huangshan":"黄山","chuzhou":"滁州","fy":"阜阳","suzhousz":"宿州","ch":"巢湖","la":"六安","bozhou":"亳州","chizhou":"池州","xuancheng":"宣城","mg":"明光","tianchang":"天长","tongcheng":"桐城","datongshi":"大通","wuweiww":"无为","wuhuxian":"芜湖县","fanchang":"繁昌","nanling":"南陵","guangde":"广德","ningguo":"宁国","hanshan":"含山","hexian":"和县","quanjiao":"全椒",

	// "350000":"福建",
	// "fz":"福州","xm":"厦门","pt":"莆田","sm":"三明","qz":"泉州","zhangzhou":"漳州","np":"南平","ly":"龙岩","nd":"宁德","fuqing":"福清","changle":"长乐","jinjiang":"晋江","ss":"石狮","lh":"龙海","na":"南安","zhangpu":"漳浦","jianyangjy":"建阳","pingtan":"平潭","xiapu":"霞浦","huian":"惠安","anxi":"安溪","lianjiangxian":"连江","gulangyu":"鼓浪屿",

	// "360000":"江西",
	// "nc":"南昌","jdz":"景德镇","px":"萍乡","jj":"九江","xinyu":"新余","yingtan":"鹰潭","ganzhou":"赣州","ja":"吉安","yichun":"宜春","fuz":"抚州","sr":"上饶","wy":"婺源","lushan":"庐山","jgs":"井冈山","sqs":"三清山","lp":"乐平","rj":"瑞金","ruichang":"瑞昌","zhangshu":"樟树","poyang":"鄱阳","fch":"丰城","gaoan":"高安","gongqingcheng":"共青城","shanggao":"上高","yushan":"玉山",

	// "370000":"山东",
	// "jn":"济南","qd":"青岛","zb":"淄博","zaozhuang":"枣庄","dy":"东营","yt":"烟台","wf":"潍坊","jining":"济宁","ta":"泰安","weihai":"威海","rizhao":"日照","lw":"莱芜","linyi":"临沂","dz":"德州","lc":"聊城","bz":"滨州","heze":"菏泽","yanzhou":"兖州","huangdao":"黄岛","zhangqiu":"章丘","lk":"龙口","shouguang":"寿光","qingzhou":"青州","rc":"荣成","wd":"文登","rs":"乳山","zp":"邹平","xintai":"新泰","zhucheng":"诸城","changyi":"昌邑","laizhou":"莱州","lq":"临清","gr":"广饶","fc":"肥城","tengzhou":"滕州","laiyang":"莱阳","haiyang":"海阳","pd":"平度","jiaozhou":"胶州","zhaoyuan":"招远","penglai":"蓬莱","aq":"安丘","gm":"高密","yucheng":"禹城","ll":"乐陵","laixi":"莱西","jimo":"即墨","qihe":"齐河","xiajin":"夏津","changlecl":"昌乐","dongping":"东平","linqu":"临朐","pingyuan":"平原","ningyang":"宁阳","ningjinnj":"宁津","shanxian":"单县","zoucheng":"邹城","muping":"牟平","boxing":"博兴","chiping":"茌平","yanggu":"阳谷","kenli":"垦利","hekou":"河口","juye":"巨野","caoxian":"曹县","yunchengxian":"郓城","chengyang":"城阳","liangshanxian":"梁山","weishan":"微山","wenshang":"汶上","jiaxiang":"嘉祥","jinxiang":"金乡","lijin":"利津","wucheng":"武城","linyily":"临邑","qixia":"栖霞","feixian":"费县","xuecheng":"薛城","shidao":"石岛","lanling":"兰陵","yishui":"沂水","junan":"莒南","tancheng":"郯城","yinan":"沂南","mengyin":"蒙阴",

	// "410000":"河南",
	// "zz":"郑州","kaifeng":"开封","luoyang":"洛阳","pds":"平顶山","ay":"安阳","hb":"鹤壁","xx":"新乡","jiaozuo":"焦作","puyang":"濮阳","xc":"许昌","luohe":"漯河","smx":"三门峡","ny":"南阳","sq":"商丘","xy":"信阳","zk":"周口","zmd":"驻马店","jiyuan":"济源","yichuan":"伊川","yanshi":"偃师","yongcheng":"永城","gongyi":"巩义","xiangcheng":"项城","xingyang":"荥阳","xinzheng":"新郑","xinmi":"新密","lingbao":"灵宝","dengfeng":"登封","yuzhou":"禹州","rz":"汝州","cg":"长葛","qy":"沁阳","dengzhou":"邓州","wg":"舞钢","mengzhou":"孟州","xw":"修武","wenxian":"温县","wuzhi":"武陟","boai":"博爱","qingfeng":"清丰","nanle":"南乐","fanxian":"范县","taiqian":"台前","suixian":"睢县","huaiyang":"淮阳","baofeng":"宝丰","yexian":"叶县","jiaxian":"郏县","lushanls":"鲁山","changyuan":"长垣","huixian":"辉县","yiyangyy":"宜阳","linzhou":"林州","huaxian":"滑县","tangyin":"汤阴","xinan":"新安","zhongmou":"中牟","weihui":"卫辉","fengqiu":"封丘","xinxiangxian":"新乡县","yuanyang":"原阳","dancheng":"郸城","mengjin":"孟津","luyi":"鹿邑","shenqiu":"沈丘","puyangxian":"濮阳县","xiayi":"夏邑","zhecheng":"柘城","yuchengxian":"虞城","minquan":"民权","fengxian":"丰县","xunxian":"浚县","qixian":"淇县","mianchi":"渑池","xiping":"西平","shangcai":"上蔡","biyang":"泌阳","luanchuan":"栾川","xihua":"西华","fugou":"扶沟",

	// "420000":"湖北",
	// "wh":"武汉","hshi":"黄石","shiyan":"十堰","yc":"宜昌","xf":"襄阳","ez":"鄂州","jingmen":"荆门","xiaogan":"孝感","jingzhou":"荆州","hg":"黄冈","xianning":"咸宁","suizhou":"随州","es":"恩施","xiantao":"仙桃","qianjiang":"潜江","tm":"天门","sanx":"三峡","wds":"武当山","snj":"神农架","dangyang":"当阳","zaoyang":"枣阳","daye":"大冶","zx":"钟祥","yicheng":"宜城","yingcheng":"应城","songzi":"松滋","cb":"赤壁","zhijiang":"枝江","lichuan":"利川","yidu":"宜都","lhk":"老河口","wuxue":"武穴","mc":"麻城","huarong":"华容","jianli":"监利","gongan":"公安","jingshan":"京山","honghu":"洪湖",

	// "430000":"湖南",
	// "chs":"长沙","zhuzhou":"株洲","xiangtan":"湘潭","hy":"衡阳","shaoyang":"邵阳","yy":"岳阳","changde":"常德","zjj":"张家界","yiyang":"益阳","chenzhou":"郴州","yongzhou":"永州","hh":"怀化","ld":"娄底","xiangxi":"湘西","fh":"凤凰","leiyang":"耒阳","nx":"宁乡","xiangyin":"湘阴","jishou":"吉首","shaoshan":"韶山","ml":"汨罗","lsj":"冷水江","xiangxiang":"湘乡","liuyang":"浏阳","liling":"醴陵","yuanjiang":"沅江","hongjiang":"洪江","xinhua":"新化","shaodong":"邵东",

	// "440000":"广东",
	// "gz":"广州","sg":"韶关","sz":"深圳","zh":"珠海","st":"汕头","fs":"佛山","jm":"江门","zhanjiang":"湛江","mm":"茂名","zq":"肇庆","huizhou":"惠州","mz":"梅州","sw":"汕尾","heyuan":"河源","yj":"阳江","qingyuan":"清远","dg":"东莞","zs":"中山","chaozhou":"潮州","jy":"揭阳","yf":"云浮","sd":"顺德","huidong":"惠东","zc":"增城","kp":"开平","taishan":"台山","heshan":"鹤山","lechang":"乐昌","yd":"英德","pn":"普宁","ns":"南沙","conghua":"从化","xingning":"兴宁","lufeng":"陆丰","wc":"吴川","huadu":"花都","lianjiang":"廉江","gaozhou":"高州","sihui":"四会","huazhou":"化州","lianzhou":"连州","nanxiong":"南雄","xinyixy":"信宜","kaixian":"开县","dianbai":"电白","xuwen":"徐闻","fogang":"佛冈","leizhou":"雷州",

	// "450000":"广西",
	// "nn":"南宁","liuzhou":"柳州","gl":"桂林","wuzhou":"梧州","bh":"北海","fcg":"防城港","qinzhou":"钦州","gg":"贵港","yulin":"玉林","baise":"百色","hezhou":"贺州","hc":"河池","lb":"来宾","chongzuo":"崇左","yangshuo":"阳朔","gp":"桂平","dongxing":"东兴","lingshan":"灵山","beiliu":"北流","cenxi":"岑溪","tengxian":"藤县",

	// "460000":"海南",
	// "haikou":"海口","sanya":"三亚","qh":"琼海","danzhou":"儋州","wenchang":"文昌","wanning":"万宁","dongfang":"东方","lingshui":"陵水",

	// "500000":"重庆",
	// "cq":"重庆市区","wanzhou":"万州","beipei":"北碚","hechuan":"合川","yongchuan":"永川","fl":"涪陵","yunyang":"云阳","jiangjin":"江津","bishan":"璧山","tongliang":"铜梁",

	// "510000":"四川",
	// "cd":"成都","zg":"自贡","panzhihua":"攀枝花","luzhou":"泸州","deyang":"德阳","my":"绵阳","guangyuan":"广元","suining":"遂宁","scnj":"内江","ls":"乐山","nanchong":"南充","ms":"眉山","yb":"宜宾","ga":"广安","dazhou":"达州","ya":"雅安","bazhong":"巴中","zy":"资阳","ab":"阿坝","ganzi":"甘孜","liangshan":"凉山","ems":"峨眉山","jzg":"九寨沟","djy":"都江堰","pengzhou":"彭州","gh":"广汉","jianyang":"简阳","langzhong":"阆中","chongzhou":"崇州","ql":"邛崃","anyue":"安岳","renshou":"仁寿","shawan":"沙湾","jintang":"金堂","longchang":"隆昌","fushunxian":"富顺","mianzhu":"绵竹","dazhu":"大竹","jiangyou":"江油",

	// "520000":"贵州",
	// "gy":"贵阳","lps":"六盘水","zunyi":"遵义","anshun":"安顺","tr":"铜仁","qxn":"黔西南","bijie":"毕节","qdn":"黔东南","qn":"黔南","kl":"凯里","rh":"仁怀","panxian":"盘县",

	// "530000":"云南",
	// "km":"昆明","qj":"曲靖","yx":"玉溪","bs":"保山","zt":"昭通","lj":"丽江","pe":"普洱","lincang":"临沧","cx":"楚雄","honghe":"红河","ws":"文山","bn":"西双版纳","dali":"大理","dh":"德宏","nujiang":"怒江","diqing":"迪庆","tengchong":"腾冲","xgll":"香格里拉","gj":"个旧","xuanwei":"宣威","anning":"安宁",

	// "540000":"西藏",
	// "lasa":"拉萨","changdu":"昌都","sn":"山南","rkz":"日喀则","nq":"那曲","al":"阿里","linzhi":"林芝",

	// "610000":"陕西",
	// "xa":"西安","tc":"铜川","baoji":"宝鸡","xianyang":"咸阳","wn":"渭南","yanan":"延安","hanzhong":"汉中","yl":"榆林","ankang":"安康","sl":"商洛","huayin":"华阴","xp":"兴平","hanyin":"汉阴","shenmu":"神木","huxian":"户县","lintong":"临潼","lantian":"蓝田","shiquan":"石泉","yanliang":"阎良","hancheng":"韩城","dalixian":"大荔","pucheng":"蒲城","meixian":"眉县","fufeng":"扶风","gaoling":"高陵","xixiang":"西乡","chenggu":"城固","binxian":"彬县","yangling":"杨凌",

	// "620000":"甘肃",
	// "lz":"兰州","jyg":"嘉峪关","jinchang":"金昌","by":"白银","tianshui":"天水","wuwei":"武威","zhangye":"张掖","pl":"平凉","jq":"酒泉","qingyang":"庆阳","dx":"定西","ln":"陇南","linxia":"临夏","gn":"甘南","huating":"华亭",

	// "630000":"青海",
	// "xn":"西宁","haidong":"海东","haibei":"海北","huangnan":"黄南","hnz":"海南州","guoluo":"果洛","ys":"玉树","hx":"海西","geermu":"格尔木",

	// "640000":"宁夏",
	// "yinchuan":"银川","szs":"石嘴山","wuzhong":"吴忠","guyuan":"固原","zw":"中卫",

	// "650000":"新疆",
	// "xj":"乌鲁木齐","klmy":"克拉玛依","tlf":"吐鲁番","hami":"哈密","changji":"昌吉","betl":"博尔塔拉","baz":"巴州","aks":"阿克苏","kz":"克州","ks":"喀什","ht":"和田","yili":"伊犁","tac":"塔城","alt":"阿勒泰","shz":"石河子","krl":"库尔勒","yn":"伊宁","kt":"奎屯","fukang":"阜康","wusu":"乌苏",

	// "710000":"台湾",
	// "tb":"台北","xinbei":"新北","taizhong":"台中","tainan":"台南","gaoxiong":"高雄","taidong":"台东","yilan":"宜兰","hualian":"花莲","nantou":"南投","pingdong":"屏东","miaoli":"苗栗","taoyuan":"桃园","jilong":"基隆","yunlin":"云林","xinzhushi":"新竹市","xinzhuxian":"新竹县","jiayi":"嘉义市","jiayixian":"嘉义县","zhanghua":"彰化","penghu":"澎湖","jinmen":"金门","taiwanlianjiang":"台湾连江",

	"810000":"香港",
	"hk":"香港",

	"820000":"澳门",
	"am":"澳门"
};

module.exports = value;