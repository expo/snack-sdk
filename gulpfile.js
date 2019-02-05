const path = require('path');
const gulp = require('gulp');
const babel = require('gulp-babel');
const changed = require('gulp-changed');
const plumber = require('gulp-plumber');
const rename = require('gulp-rename');
const del = require('del');
const shell = require('gulp-shell');
const sourcemaps = require('gulp-sourcemaps');

const paths = {
  source: {
    js: 'src1/**/*.js',
  },
  build: {
    node: 'dist',
    esm: 'esm',
  },
};

const transpile = (destination, config) =>
  gulp
    .src(paths.source.js)
    .pipe(changed(destination))
    .pipe(plumber())
    .pipe(sourcemaps.init({ identityMap: true }))
    .pipe(babel(config))
    .pipe(sourcemaps.write('__sourcemaps__', { sourceRoot: '/snack-sdk/src1' }))
    .pipe(gulp.dest(destination));

const flow = destination =>
  gulp
    .src(paths.source.js)
    .pipe(rename({ extname: '.js.flow' }))
    .pipe(gulp.dest(destination));

const build = (destination, config) =>
  gulp.parallel(() => transpile(destination, config), () => flow(destination));

gulp.task('build:node', build(paths.build.node));
gulp.task('build:esm', build(paths.build.esm, require('./.babelrc.esm.json')));

gulp.task('clean', () => del([paths.build.node, paths.build.esm]));
gulp.task('build', gulp.series('clean', gulp.parallel('build:node', 'build:esm')));
gulp.task('watch', gulp.series('build', () => gulp.watch(paths.source.js, gulp.series('build'))));

gulp.task('default', gulp.series('watch'));
