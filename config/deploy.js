exports.config={
    localImagesPath:'images/',
    cdnImagesPath:'http://qncdn.sz-sti.com/images',    //qiniu
    cdnPath:'http://qncdn.sz-sti.com',    //qiniu cdn
    domainImagesPath:'http://wx.sz-sti.com',    //domain
    //cdnImagesPath:'http://suteng.oss-cn-shenzhen.aliyuncs.com/images',//aliyun
    cdnJsPath:'http://suteng.oss-cn-shenzhen.aliyuncs.com/js',
    cdnCssPath:'http://suteng.oss-cn-shenzhen.aliyuncs.com/css',
    version:'2015-11-25',
    libVersion:'2015-4-19',

    domain:'localhost',
    AppSecret:'8fe6339d6a4aedf353d89d15063eca35',
    AppID:'wx4f50446382062f4e',

    dbHost:'localhost',
    //dbHost:'120.76.27.228',
    dbUser:'root',
    dbPassword:'root',
    dbDatabase:'suteng',
    cdnHttpsDomain:'https://ohpltmm4t.qnssl.com',
    getcdndomain: function (istrust){
        return istrust ? this.cdnHttpsDomain : this.cdnPath;
    }
}
