'use strict';

// REQUIRED MODULES AND CONFIG
const gulp       = require('gulp');
const del        = require('del');
const concat     = require('gulp-concat');
const uglify     = require('gulp-uglify');
const babel      = require('gulp-babel');
const clean      = require('gulp-clean-css');
const autoprefix = require('gulp-autoprefixer');
const jshint     = require('gulp-jshint');
const csslint    = require('gulp-csslint');
const noop       = require('gulp-noop');
const config     = require('./src/config.json');

// GULP TASK NAMES
const DEFAULT          = 'default';
const WATCH_JS         = 'watch-js';
const WATCH_TWEE       = 'watch-twee';
const BUILD            = 'build';

const LINT_APP_JS      = 'lint-app-js';
const VALIDATE_APP_CSS = 'validate-app-css';

const BUILD_APP        = 'build-app';
const BUILD_APP_JS     = 'build-app-js';
const BUILD_APP_CSS    = 'build-app-css';

const BUILD_VENDOR     = 'build-vendor';
const BUILD_VENDOR_JS  = 'build-vendor-js';
const BUILD_VENDOR_CSS = 'build-vendor-css';

// COMPILE TARGETS
const APP_JS           = 'app-js';
const APP_CSS          = 'app-css';
const VENDOR_JS        = 'vendor-js';
const VENDOR_CSS       = 'vendor-css';
const BROWSERS         = config.browsers;


// GULP TASKS
gulp.task(BUILD_VENDOR_JS,   () => compile(VENDOR_JS));
gulp.task(BUILD_VENDOR_CSS,  () => compile(VENDOR_CSS));
gulp.task(BUILD_VENDOR,      gulp.parallel(BUILD_VENDOR_JS, BUILD_VENDOR_CSS));

gulp.task(LINT_APP_JS,       lintAppJS);
gulp.task(VALIDATE_APP_CSS,  validateAppCSS);
gulp.task(BUILD_APP_JS,     () => compile(APP_JS));
gulp.task(BUILD_APP_CSS,    () => compile(APP_CSS));
gulp.task(BUILD_APP,        gulp.parallel(LINT_APP_JS, VALIDATE_APP_CSS, BUILD_APP_JS, BUILD_APP_CSS));

gulp.task(BUILD,            gulp.parallel(BUILD_VENDOR, BUILD_APP));


/**
 * Convert and minify App and Vendor JS
 * @param dir
 * @param out
 * @param name
 * @returns {*}
 */
function processScripts (dir, out, name) {
    return gulp.src(dir)
        .pipe(concat(name))
        .pipe(config.javascript.transpile ? babel({
            presets : [
                ['@babel/preset-env', {
                    targets : BROWSERS
                }]
            ]
        }) : noop())
        .pipe(config.javascript.minify ?
            uglify().on('error', (e) => {console.log(e);}) : noop())
        .pipe(gulp.dest(out));
}

/**
 * Minify and autoprefix App and Vendor CSS
 * @param dir
 * @param out
 * @param name
 * @returns {*}
 */
function processStyles (dir, out, name) {
    return gulp.src(dir)
        .pipe(concat(name))
        .pipe(config.css.minify ? clean() : noop())
        .pipe(config.css.autoprefix ? autoprefix({
            browsers:BROWSERS
        }) : noop())
        .pipe(gulp.dest(out));
}

/**
 * Lint App JS
 * @returns {*}
 */
function lintAppJS() {
    return gulp.src(config.directories['app-js'])
        .pipe(jshint())
        .pipe(jshint.reporter('default', { beep : true }));
}

/**
 * Validate App CSS
 * @returns {*}
 */
function validateAppCSS() {
    return gulp.src(config.directories['app-css'])
        .pipe(csslint({
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
        }))
        .pipe(csslint.formatter());
}

/**
 * Compile Vendor and App CSS/JS
 * @param what
 * @returns {*}
 */
function compile (target) {
    const dir = config.directories;
    switch (target) {
        case 'vendor-js':
            return processScripts(dir['vendor-js'], dir['out-js'], dir['vendor-min-js']);

        case 'vendor-css':
            return processStyles(dir['vendor-css'], dir['out-css'], dir['vendor-min-css']);

        case 'app-js':
            return processScripts(dir['app-js'], dir['out-js'], dir['app-min-js']);

        case 'app-css':
            return processStyles(dir['app-css'], dir['out-css'], dir['app-min-css']);
    }
}