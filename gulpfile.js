const gulp = require('gulp');

const buildTasks = require('./gulp/build-tasks');

const tasks = Object.assign({}, buildTasks);

gulp.task('build', gulp.parallel(tasks.babel, tasks.flow));
gulp.task('watch', gulp.series(tasks.flow, tasks.babel, tasks.watchBabel));
gulp.task('clean', tasks.clean);
gulp.task('default', gulp.series('watch'));
