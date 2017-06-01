'use strict';
var fs = require('fs'),
    gulp = require("gulp"),
    gulpLoadPlugins = require('gulp-load-plugins'),
    plugins = gulpLoadPlugins(),
    clean   = require('gulp-clean'),
    script  = require('./gulp-tasks/script').init(gulp),
    dealImg = script.dealImg;
    
var srcPath    = 'crm2/',
    distPath   = 'crm-dist/',
    tplConfig  = 'tpl_config';

var moudlePath = srcPath + 'modules/';


/** 
 * @desc 统一任务错误提示处理函数
 * @param {{err}} 错误信息
 * @param {{name}} 任务名称
 */
function onError(err, name) {
    plugins.notify.onError({
        title:    'Gulp',
        subtitle: name + ' Failure!',
        message:  name + ' error: <%= error.message %>',
        sound: 'Beep'
    })(err);
};    
 
/**
 * @desc 成功提示
 */
function onSuccess(name) {
    return {
        title:    'Gulp',
        subtitle: 'success',
        message:  name + ' OK',
        sound:    'Pop'
	};
}


/**
 * =================================================
 * less处理
 *
 * ================================================
 */
var allLess = [
    srcPath + 'assets/style/all.less',
    srcPath + 'assets/js/**/*.less',
    srcPath + 'assets/widget/**/*.less',
    srcPath + 'modules/components/**/*.less',
    srcPath + 'modules/common/**/*.less',
	srcPath + 'modules/action/**/*.less',
	srcPath + 'modules/detail/**/*.less',
	srcPath + 'modules/detail2/**/*.less'
];

/**
 * @desc 公用处理less方法
 * fiels 文件
 * name  生成文件名称
 * task  任务
 * dist  是否为发布目录
 */
function parseLess(files, name, task, dist) {
    var dest = (dist ? distPath : srcPath) + 'assets/style/';
    return gulp.src(files)
        .pipe(plugins.plumber({
            errorHandler: function(err) {
                onError(err, task);
            }
        }))
        .pipe(plugins.concat(name + '.css'))
        .pipe(gulp.dest(dest))
        .pipe(plugins.lessImportany((dist ? distPath : srcPath) + 'assets/style/mixins/mixins.less'))
        .pipe(plugins.less())
        .pipe(plugins.minifyCss())
        .pipe(gulp.dest(dest))
}

/**
 * @desc 样式重载函数
 */
function cssLive(name, files) {
    files = files || srcPath + 'modules/' + name + '/**/*.less';
    var stream = parseLess(files,  name, 'less-' + name);
    stream.pipe(plugins.notify(onSuccess('less-' + name)))
          .pipe(plugins.livereload());        
}

gulp.task('less-all',     function() {return parseLess(allLess, 'all', 'less-all');});
gulp.task('less-page',    function() {return parseLess(srcPath + 'modules/page/**/*.less',    'page',   'less-page');});
gulp.task('less-setting', function() {return parseLess(srcPath + 'modules/setting/**/*.less', 'setting','less-setting');});
gulp.task('less-remind',  function() {return parseLess(srcPath + 'modules/remind/**/*.less',  'remind', 'less-remind');});
gulp.task('less', ['less-all', 'less-page', 'less-setting', 'less-remind']);


/**
 * @desc 发布时的less任务
 */
gulp.task('less-dist', function() {
    parseLess([
        distPath + 'assets/style/all.less',
        distPath + 'assets/js/**/*.less',
        distPath + 'assets/widget/**/*.less',
        distPath + 'modules/components/**/*.less',
        distPath + 'modules/common/**/*.less',
        distPath + 'modules/action/**/*.less',
        distPath + 'modules/detail/**/*.less',
        distPath + 'modules/detail2/**/*.less'
    ], 'all', 'less-all', true);
    parseLess(distPath + 'modules/page/**/*.less',    'page',   'less-page',    true);
    parseLess(distPath + 'modules/setting/**/*.less', 'setting','less-setting', true);
    parseLess(distPath + 'modules/remind/**/*.less',  'remind', 'less-remind',  true);
});

/**
 * =================================================
 * @desc 模板编译
 * html 转化为jst 并做cmd
 * =================================================
 */
function parseHtml(files, task, dest) {
    dest = dest || srcPath;
    return gulp.src(files, {base: dest})
        .pipe(plugins.plumber({
            errorHandler: function(err) {
                onError(err, task);
            }
        }))
        .pipe(plugins.cmdJst({
            templateSettings: {
                evaluate: /##([\s\S]+?)##/g,
                interpolate: /\{\{(.+?)\}\}/g,
                escape: /\{\{\{\{-([\s\S]+?)\}\}\}\}/g
            },
            processContent: function(src) {
                return src.replace(/(^\s+|\s+$)/gm, '');
            },
            prettify: true,
            cmd: true
        }))
        .pipe(plugins.rename({
            suffix: '-html'
        }))
        .pipe(gulp.dest(dest));    
}

gulp.task('jst', function() { return parseHtml(srcPath + '**/*.html', 'jst');}); 
gulp.task('jst-dist', function() { 
    return  gulp.src( 'crm-dist/**/*.html' )
                .pipe(plugins.cmdJst({
                    templateSettings: {
                        evaluate: /##([\s\S]+?)##/g,
                        interpolate: /\{\{(.+?)\}\}/g,
                        escape: /\{\{\{\{-([\s\S]+?)\}\}\}\}/g
                    },
                    processName: function(filename) {
                        var moudle = filename.slice(0, filename.indexOf('/'))
                        return moudle + '-' + filename.slice(filename.lastIndexOf('/') + 1, filename.lastIndexOf('.'));
                    },
                    processContent: function(src) {
                        return src.replace(/(^\s+|\s+$)/gm, '');
                    },
                    prettify: true,
                    cmd: true
                }))
                .pipe(plugins.rename({
                    suffix: '-html'
                }))
                .pipe(gulp.dest( 'crm-dist/'))
 });


/**
 * =================================================
 * @desc 检测js语法
 * =================================================
 */
var allJsPath = [srcPath + '**/*.js', '!'+ srcPath + '**/*-html.js'];

function jsHint(files, task) {
    return gulp.src(files)
        .pipe(plugins.plumber({
            errorHandler: function(err) {
                onError(err, task);
            }
        }))
        .pipe(plugins.jshint())
        .pipe(plugins.jshint.reporter(function (result, data, opt) {
            if (result) {
                console.log( result );
            }
            return result;
        }))
        .pipe(plugins.jshint.reporter('fail'))
}

gulp.task('jsHint', function() { return jsHint(allJsPath, 'jsHint');});
gulp.task('jshint-dist', function() {
    return gulp.src([
            distPath + '/**/*.js',
            '!' + distPath + '/**/*-html.js'
        ])
        .pipe(plugins.jshint())
        .pipe(plugins.jshint.reporter(function (result, data, opt) {
            if (result) {
                console.log(result);
            }
            return result;
        }))
        .pipe(plugins.jshint.reporter('fail'));    
    
});


/**
 * =========================================
 * @desc Transport
 * CMD 规范
 * ========================================
 */
gulp.task('cmd', function() {
    return gulp.src([distPath + '/**/*.js'])
        .pipe(plugins.plumber())
        .pipe(plugins.cmdTransit({
            dealIdCallback: function(id) {
                if (/\//.test(id)) {
                    return 'crm-' + id;
                } else {
                    return 'crm/' + id;
                }
                
            }
        }))
        .pipe(gulp.dest(distPath))
});


/**
 * =======================================
 * @desc 图片进行压缩
 * =======================================
 */
var pngquant = require('imagemin-pngquant');
gulp.task('min-image', function() {
    return gulp.src(distPath + '**/*.{png,jpg,gif}')
        .pipe(plugins.imagemin({
            progressive: true,
            svgoPlugins: [{
                removeViewBox: false
            }],
            use: [pngquant()]
        }))
        .pipe(gulp.dest(distPath));
});



/**
 * ==================================================
 * @desc 业务级modules文件夹指定路径合并 merge
 * 合并modules下的js
 * ================================================
 */
var buildFileTask = [];
gulp.task('merge', function() {
    var json = require('./' + distPath + 'buildRoute.json');
    if (!json) return;
    for (var o in json) {
        buildFileTask.push(o);
    }
    buildFileTask.forEach(function(fileName) {
        gulp.task(fileName, function() {
            if (fs.lstatSync(distPath + fileName).isDirectory()) {
                return gulp.src(distPath + fileName + "/**/*.js")
                .pipe(plugins.order([distPath + fileName + "/**/*.js"]))
                .pipe(plugins.plumber())
                .pipe(clean())
                .pipe(plugins.concat(json[fileName] + ".js"))
                .pipe(gulp.dest(distPath + fileName + "/"))
            }else{
                return gulp.src(distPath + fileName)
                .pipe(plugins.plumber())
                .pipe(gulp.dest(distPath + json[fileName]))
            }
            
        });
    });
});

/**
 * ======================================
 * @desc 把assets/js目录中的所有js 合并到app.js
 * 页面首次引入
 * ======================================
 */
gulp.task('merge-app', function() {
    return  gulp.src([distPath + 'assets/js/**/*.js', distPath + 'app.js'])
                .pipe(plugins.order())
                .pipe(plugins.plumber())
                .pipe(clean())
                .pipe(plugins.concat('app.js'))
                .pipe(gulp.dest(distPath))
});


/**
 * ======================================
 * @desc 压缩所有js
 * 压缩所有js
 * ======================================
 */
gulp.task('uglify', function() {
    return  gulp.src([distPath + '/**/*.js'])
                .pipe(plugins.uglify({
                    mangle: true,
                    compress: {
                        drop_console: true
                    }
                }))
                .pipe(gulp.dest(distPath))
});



/**
 * =========================================
 * @desc 图片文件进行md5加密处理
 *
 * =========================================
 */
gulp.task('md5-img', function() {
    return gulp.src([distPath + '**/*.{png,jpg,gif}'])
        .pipe(clean())
        .pipe(plugins.rev())
        .pipe(gulp.dest(distPath))
        .pipe(plugins.rev.manifest('rev-imgmanifest.json'))
        .pipe(gulp.dest(distPath))
});


/**
 * =========================================
 * @desc 替换js css 文件中的md5地址
 * =========================================
 */                

var merge = require('merge-stream');
gulp.task("dealJsCssImg",function () {
    var json = require('./' + distPath + 'rev-imgmanifest.json');
    if (!json) return;
    var imgArr = [];
    for (var o in json) {
        if (/assets\/images/.test(o)) {
            imgArr.push(
               o.match(/images\/.*/).toString()+ "imgToMd5s" +json[o].match(/images\/.*/).toString()
            );
        }
    }
    var cssStream = gulp.src([distPath + 'assets/style/all.css',
            distPath + 'assets/style/page.css',
            distPath + 'assets/style/setting.css',
            distPath + 'assets/style/remind.css'
        ])
       .pipe(plugins.minifyCss())
       .pipe(dealImg(imgArr))
       .pipe(gulp.dest(distPath + 'assets/style/'));
    var htmlStream = gulp.src(distPath + 'modules/common/map/container.html')
	    .pipe(dealImg(imgArr))
	    .pipe(gulp.dest(distPath + 'modules/common/map/'));
    var jsStream = gulp.src([distPath + '**/*.js'])
        .pipe(dealImg(imgArr))
        .pipe(gulp.dest(distPath));
    return merge(cssStream, htmlStream, jsStream);
});


/**
 * =========================================
 * @desc css js md5
 * =========================================
 */
gulp.task('md5-css-js', function() {
    return gulp.src([distPath + '**/*.js', distPath + '**/*.css', '!' + distPath + 'app.js'])
        .pipe(clean())
        .pipe(plugins.rev())
        .pipe(gulp.dest(distPath))
        .pipe(plugins.rev.manifest())
        .pipe(gulp.dest(distPath))
});


/**
 * =========================================
 * @desc mapping 文件处理
 * 统一合并到app.js中
 * =========================================
 */
function transportJson() {
    var json = require('./' + distPath + 'rev-manifest.json');
    if (!json) return;
    var backJson = '[';
    for (var o in json) {
        backJson += '["crm-dist/' + o.replace(/-revfile/, '') + '","crm-dist/' + json[o] + '"],';
    }
    backJson = backJson.substr(0, backJson.length - 1) + ']';
    return 'seajs.config({map:' + backJson + '});'
}
gulp.task('jsmap', function() {
    var json = require('./' + distPath + 'rev-manifest.json');
    if (!json) return;
    var strs = transportJson();
    var fs = require("fs");
    //读取md5后的app.js
    var data = fs.readFileSync('./' + distPath + 'app.js', 'utf8');
    //先写入map（也就是seajs.config）
    fs.writeFileSync('./' + distPath + 'app.js', strs + '\n' + data);
    //md5 写入map后的app.js文件
    return gulp.src( [distPath + 'app.js'])
        .pipe(plugins.rev())
        .pipe(gulp.dest(distPath))
        .pipe(plugins.rev.manifest('rev-jsappmanifest.json'))
        .pipe(gulp.dest(distPath));
});

/**
 * =========================================
 * @desc 生成all.js all.css的配置文件，用于模板页
 * =========================================
 */
gulp.task('config-tpl', function(){
	var json = require('./' + distPath + 'rev-manifest.json'),
		jsjson = require('./' + distPath + 'rev-jsappmanifest.json'),
		js_app,
		css_all;
	if(!json) {
		console.error('error: file rev-manifest.json not found or content blank');
		this.emit('end');
	}
	if(!jsjson) {
		console.error('error: file rev-jsappmanifest.json not found or content blank');
		this.emit('end');
	}
	css_all = json["assets/style/all.css"].replace('assets/style/', '');
    js_app = jsjson["app.js"]
	if(!css_all || !js_app) {
		console.log("not found tpl configs: css or js_app");
		this.emit('end');
	}
	var content = 'crm_css_all:' + css_all + '\n' + 'crm_js_app:' + js_app + '\n';
	fs.writeFile('./' + distPath + tplConfig, content, function(err) {
        if (err) {
            console.error(err);
            this.emit('end');
        } else {
        	console.log('write ' + content + ' ok');
        }
    });
});



/**
 * ======================================
 * @desc 清空dist目录文件
 * ======================================
 */
gulp.task('clean', function() {
    return gulp.src(distPath, {
            read: false
        })
        .pipe(plugins.rimraf());
});

/**
 * =======================================
 * @desc 复制所有原文件到dist目录
 * ======================================
 */
gulp.task('copy', function() {
    return gulp.src([
        srcPath + '**/*.*',
        '!' + srcPath + '**/*.css',
        '!' + srcPath + '**/*-html.js'
    ])
    .pipe(gulp.dest(distPath))
});


/**
 * ============================
 * @desc 上线时删除冗余文件
 * ===========================
 */
var del = require('del');

function walk(path) {  
    var dirList = fs.readdirSync(path);
    if (dirList.length == 0) {
        fs.rmdir(path);
    }
    dirList.forEach(function(item){
        if (fs.statSync(path + '/' + item).isDirectory()) {
            walk(path + '/' + item);
        }
    });
}

gulp.task('del-files', function() {
    del([distPath + '*.json',distPath + '**/*.less', distPath + '**/*.html', '!' + distPath + 'modules/common/map/container.html',distPath + 'assets/js/**/*.*']);
    walk(distPath);
});



/**
 * =======================================
 * @desc 开发过程中 less 模板  js语法变化检测
 *
 * =====================================
 */
gulp.task('look', function() {
    plugins.livereload.listen();
    
    // 样式的变化
    gulp.watch(allLess.concat(srcPath + 'assets/style/src/*.less')).on('change', function() { cssLive('all', allLess);});
    gulp.watch([srcPath + 'modules/page/**/*.less']).on('change', function() { cssLive('page');});
    gulp.watch([srcPath + 'modules/remind/**/*.less']).on('change', function() { cssLive('remind');});
    gulp.watch([srcPath + 'modules/setting/**/*.less']).on('change', function() { cssLive('setting');});
    gulp.watch([srcPath + 'assets/style/mixins/*.less'], ['less']);
    
    // 模板编译
    gulp.watch([srcPath + '**/*.html']).on('change', function(e) {
        var stream = parseHtml(e.path, 'jst');
        stream.pipe(plugins.notify(onSuccess('jst')))
              .pipe(plugins.livereload());
    });
    
    
    // 语法检测
    gulp.watch(allJsPath).on('change', function(e) {
        var stream = jsHint(e.path, 'jsHint');
        stream.pipe(plugins.notify(onSuccess('jsHint-complete')))
    });
});



/**
 * @desc 开发默认执行
 */
gulp.task('default', ['less', 'jst', 'look'], function() { 
    gulp.src(srcPath +'assets/style/all.css')  // 完成提示
        .pipe(plugins.notify(onSuccess('default')))
});


/**
 * @desc 上线部署
 */
gulp.task('build-md5', function(cb) {
    plugins.sequence(
        'clean',
        'copy',
        'jshint-dist',
        'less-dist',
        'jst-dist',
        'cmd',
        'merge',
        buildFileTask,
        'merge-app',
        'uglify',
        'md5-img',
        'dealJsCssImg',
        'md5-css-js',
        'jsmap',
        'config-tpl',
        'del-files',
    cb);
});
