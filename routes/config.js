var deploy = require('../config/deploy').config;
var local= require('../config/local').config;

var conf=deploy;
for(var i in local){
    conf[i]=local[i];
}

module.exports = conf;
