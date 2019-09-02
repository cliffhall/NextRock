'use strict';

// REQUIRED MODULES AND CFG
const gulp       = require('gulp');
const concat     = require('gulp-concat');
const uglify     = require('gulp-uglify');
const babel      = require('gulp-babel');
const clean      = require('gulp-clean-css');
const autoprefix = require('gulp-autoprefixer');
const jshint     = require('gulp-jshint');
const csslint    = require('gulp-csslint');
const noop       = require('gulp-noop');

// CONFIGURATION
const CFG = {

    JS: {
        MINIFY: true,
        TRANSPILE: true,
        LINT: {
            esversion: 6
        }
    },

    CSS: {
        MINIFY: true,
        AUTOPREFIX: true,
        LINT: {
            'box-model' : false,
            'adjoining-classes' : false,
            'box-sizing' : false,
            'compatible-vendor-prefixes' : false,
            'gradients' : false,
            'text-indent' : false,
            'vendor-prefix' : false,
            'fallback-colors' : false,
            'bulletproof-font-face' : false,
            'font-faces' : false,
            'import' : false,
            'regex-selectors' : false,
            'unqualified-attributes' : false,
            'overqualified-elements' : false,
            'shorthand' : false,
            'duplicate-background-images' : false,
            'floats' : false,
            'font-sizes' : false,
            'ids' : false,
            'order-alphabetical' : false,
            'qualified-headings' : false,
            'unique-headings' : false
        }
    },

    SRC: {
        VENDOR_JS: "./src/vendor/**/*.js",
        VENDOR_CSS: "./src/vendor/**/*.css",
        APP_JS: "./src/app/**/*.js",
        APP_CSS: "./src/app/**/*.css",
    },

    OUT: {
        MODULES: "./project/modules",
        VENDOR_MIN_JS: "vendor.min.js",
        VENDOR_MIN_CSS: "vendor.min.css",
        APP_MIN_JS: "app.min.js",
        APP_MIN_CSS: "app.min.css",

    },

    BROWSERS: [
        "> 1%",
        "last 3 versions",
        "last 10 Chrome versions",
        "last 10 Firefox versions",
        "IE >= 9",
        "Opera >= 12"
    ],

    TASKS: {
        DEFAULT: 'default',
        WATCH_SOURCE: 'watch-src',

        BUILD: 'build',

        BUILD_APP: 'build-app',
        BUILD_APP_JS: 'build-app-js',
        BUILD_APP_CSS: 'build-app-css',
        LINT_APP_JS: 'lint-app-js',
        VALIDATE_APP_CSS: 'validate-app-css',

        BUILD_VENDOR: 'build-vendor',
        BUILD_VENDOR_JS: 'build-vendor-js',
        BUILD_VENDOR_CSS: 'build-vendor-css'
    }

};

/**
 * Convert and MINIFY App and Vendor JS
 * @param src
 * @param target
 * @returns {*}
 */
function processJS (src, target) {
    return gulp.src(src)
        .pipe(concat(target))
        .pipe(CFG.JS.TRANSPILE ? babel({
            presets : [
                ['@babel/preset-env', {
                    targets : CFG.BROWSERS
                }]
            ]
        }) : noop())
        .pipe(CFG.JS.MINIFY ?
            uglify().on('error', (e) => {console.log(e);}) : noop())
        .pipe(gulp.dest(CFG.OUT.MODULES));
}

/**
 * MINIFY and AUTOPREFIX App and Vendor CSS
 * @param src
 * @param out
 * @param target
 * @returns {*}
 */
function processCSS (src, target) {
    return gulp.src(src)
        .pipe(concat(target))
        .pipe(CFG.CSS.MINIFY ? clean() : noop())
        .pipe(CFG.CSS.AUTOPREFIX ? autoprefix({
            browsers: CFG.BROWSERS
        }) : noop())
        .pipe(gulp.dest(CFG.OUT.MODULES));
}

/**
 * Lint App JS
 * @returns {*}
 */
function lintAppJS() {
    return gulp.src(CFG.SRC.APP_JS)
        .pipe(jshint(CFG.JS.LINT))
        .pipe(jshint.reporter('default', { beep : true }));
}

/**
 * Validate App CSS
 * @returns {*}
 */
function validateAppCSS() {
    return gulp.src(CFG.SRC.APP_CSS)
        .pipe(csslint(CFG.CSS.LINT))
        .pipe(csslint.formatter());
}

/**
 * Compile the vendor JS
 */
function compileVendorJS() {
    return processJS(CFG.SRC.VENDOR_JS, CFG.OUT.VENDOR_MIN_JS);
}

/**
 * Compile the vendor CSS
 */
function compileVendorCSS() {
    return processCSS(CFG.SRC.VENDOR_CSS, CFG.OUT.VENDOR_MIN_CSS);
}

/**
 * Compile the app JS
 */
function compileAppJS() {
    return processJS(CFG.SRC.APP_JS, CFG.OUT.APP_MIN_JS)
}

/**
 * Compile the app CSS
 */
function compileAppCSS() {
    return processCSS(CFG.SRC.APP_CSS, CFG.OUT.APP_MIN_CSS);
}

/**
 * Watch the APP and VENDOR source files for changes
 */
function watchSourceFiles() {
    gulp.watch([CFG.SRC.APP_JS, CFG.SRC.APP_CSS], exports[CFG.TASKS.BUILD_APP]);
    gulp.watch([CFG.SRC.VENDOR_JS, CFG.SRC.VENDOR_CSS], exports[CFG.TASKS.BUILD_VENDOR]);
}

// -----------------
// EXPORT GULP TASKS
// -----------------

// LINT APP JS
exports[CFG.TASKS.LINT_APP_JS] = lintAppJS;

// VALIDATE APP CSS
exports[CFG.TASKS.VALIDATE_APP_CSS] = validateAppCSS;

// BUILD APP JS
exports[CFG.TASKS.BUILD_APP_JS] = compileAppJS;

// BUILD APP CSS
exports[CFG.TASKS.BUILD_APP_CSS] = compileAppCSS;

// BUILD VENDOR JS
exports[CFG.TASKS.BUILD_VENDOR_JS] = compileVendorJS;

// BUILD VENDOR CSS
exports[CFG.TASKS.BUILD_VENDOR_CSS] = compileVendorCSS;

// WATCH SOURCE
exports[CFG.TASKS.WATCH_SOURCE] = watchSourceFiles;

// BUILD VENDOR CODE
exports[CFG.TASKS.BUILD_VENDOR] = gulp.parallel(
    exports[CFG.TASKS.BUILD_VENDOR_JS],
    exports[CFG.TASKS.BUILD_VENDOR_CSS]
);

// BUILD APP CODE
exports[CFG.TASKS.BUILD_APP] = gulp.parallel(
    exports[CFG.TASKS.LINT_APP_JS],
    exports[CFG.TASKS.VALIDATE_APP_CSS],
    exports[CFG.TASKS.BUILD_APP_JS],
    exports[CFG.TASKS.BUILD_APP_CSS]
);

// BUILD ALL
exports[CFG.TASKS.BUILD] = gulp.parallel(
    exports[CFG.TASKS.BUILD_VENDOR],
    exports[CFG.TASKS.BUILD_APP]
);

// DEFAULT
exports[CFG.TASKS.DEFAULT] = gulp.series(
    exports[CFG.TASKS.BUILD],
    exports[CFG.TASKS.WATCH_SOURCE]
);