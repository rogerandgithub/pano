module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('grunt_package.json'),
        uglify: {
            options: {
                         banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
                     },
            build:{
                      files:{
                                'public/js/zepto-tween-xss-pano.min.js':[
        'public/js/zepto.min.js','public/js/tween.min.js','public/js/xss.min.js','front_source/js/sti-pano-utils.js','front_source/js/sti-pano-css.js'],
    'public/js/sti-pano-webgl.min.js':[
        'front_source/js/sti-pano-webgl.js'
        ],
    'public/js/sti-pano-utils.min.js':[
        'front_source/js/sti-pano-utils.js'
        ],
    'public/js/sti-common.min.js':[
        'front_source/js/sti-common.js'
        ]
                        }
            }
            //build: {
            //           src: 'src/<%= pkg.name %>.js',
            //            dest: 'build/<%= pkg.name %>.min.js'
            //       }
        }
    });

    // Load the plugin that provides the "uglify" task.
    grunt.loadNpmTasks('grunt-contrib-uglify');

    // Default task(s).
    grunt.registerTask('default', ['uglify']);

};
