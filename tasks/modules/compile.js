/// <reference path="../../defs/tsd.d.ts"/>
/// <reference path="./interfaces.d.ts"/>
var path = require('path');
var fs = require('fs');
var _ = require('lodash');
var utils = require('./utils');
var cache = require('./cacheUtils');
var Promise = require('es6-promise').Promise;
exports.grunt = require('grunt');
///////////////////////////
// Helper
///////////////////////////
function executeNode(args) {
    return new Promise(function (resolve, reject) {
        exports.grunt.util.spawn({
            cmd: 'node',
            args: args
        }, function (error, result, code) {
            var ret = {
                code: code,
                // New TypeScript compiler uses stdout for user code errors. Old one used stderr.
                output: result.stdout || result.stderr
            };
            resolve(ret);
        });
    });
}
/////////////////////////////////////////////////////////////////
// Fast Compilation 
/////////////////////////////////////////////////////////////////
// Map to store if the cache was cleared after the gruntfile was parsed
var cacheClearedOnce = {};
function getChangedFiles(files, targetName) {
    files = cache.getNewFilesForTarget(files, targetName);
    _.forEach(files, function (file) {
        exports.grunt.log.writeln(('### Fast Compile >>' + file).cyan);
    });
    return files;
}
function resetChangedFiles(files, targetName) {
    cache.compileSuccessfull(files, targetName);
}
function clearCache(targetName) {
    cache.clearCache(targetName);
    cacheClearedOnce[targetName] = true;
}
/////////////////////////////////////////////////////////////////////
// tsc handling
////////////////////////////////////////////////////////////////////
function resolveTypeScriptBinPath() {
    var ownRoot = path.resolve(path.dirname((module).filename), '../..');
    var userRoot = path.resolve(ownRoot, '..', '..');
    var binSub = path.join('node_modules', 'typescript', 'bin');
    if (fs.existsSync(path.join(userRoot, binSub))) {
        // Using project override
        return path.join(userRoot, binSub);
    }
    return path.join(ownRoot, binSub);
}
function getTsc(binPath) {
    var pkg = JSON.parse(fs.readFileSync(path.resolve(binPath, '..', 'package.json')).toString());
    exports.grunt.log.writeln('Using tsc v' + pkg.version);
    return path.join(binPath, 'tsc');
}
function compileAllFiles(targetFiles, target, task, targetName) {
    // Make a local copy so we can modify files without having external side effects
    var files = _.map(targetFiles, function (file) { return file; });
    var newFiles = files;
    if (task.fast === 'watch') {
        // if this is the first time its running after this file was loaded
        if (cacheClearedOnce[exports.grunt.task.current.target] === undefined) {
            // Then clear the cache for this target 
            clearCache(targetName);
        }
    }
    if (task.fast !== 'never') {
        if (target.out) {
            exports.grunt.log.writeln('Fast compile will not work when --out is specified. Ignoring fast compilation'.cyan);
        }
        else {
            newFiles = getChangedFiles(files, targetName);
            if (newFiles.length !== 0) {
                files = newFiles;
                // If outDir is specified but no baseDir is specified we need to determine one
                if (target.outDir && !target.baseDir) {
                    target.baseDir = utils.findCommonPath(files, '/');
                }
            }
            else {
                exports.grunt.log.writeln('No file changes were detected. Skipping Compile'.green);
                return new Promise(function (resolve) {
                    var ret = {
                        code: 0,
                        fileCount: 0,
                        output: 'No files compiled as no change detected'
                    };
                    resolve(ret);
                });
            }
        }
    }
    // Transform files as needed. Currently all of this logic in is one module
    // transformers.transformFiles(newFiles, targetFiles, target, task);
    // If baseDir is specified create a temp tsc file to make sure that `--outDir` works fine
    // see https://github.com/grunt-ts/grunt-ts/issues/77
    var baseDirFile = '.baseDir.ts';
    var baseDirFilePath;
    if (target.outDir && target.baseDir && files.length > 0) {
        baseDirFilePath = path.join(target.baseDir, baseDirFile);
        if (!fs.existsSync(baseDirFilePath)) {
            exports.grunt.file.write(baseDirFilePath, '// Ignore this file. See https://github.com/grunt-ts/grunt-ts/issues/77');
        }
        files.push(baseDirFilePath);
    }
    // If reference and out are both specified.
    // Then only compile the updated reference file as that contains the correct order
    if (target.reference && target.out) {
        var referenceFile = path.resolve(target.reference);
        files = [referenceFile];
    }
    // Quote the files to compile. Needed for command line parsing by tsc
    files = _.map(files, function (item) { return '"' + path.resolve(item) + '"'; });
    var args = files.slice(0);
    // boolean options
    if (task.sourceMap) {
        args.push('--sourcemap');
    }
    if (task.declaration) {
        args.push('--declaration');
    }
    if (task.removeComments) {
        args.push('--removeComments');
    }
    if (task.noImplicitAny) {
        args.push('--noImplicitAny');
    }
    if (task.noResolve) {
        args.push('--noResolve');
    }
    if (task.noEmitOnError) {
        args.push('--noEmitOnError');
    }
    if (task.preserveConstEnums) {
        args.push('--preserveConstEnums');
    }
    if (task.suppressImplicitAnyIndexErrors) {
        args.push('--suppressImplicitAnyIndexErrors');
    }
    // string options
    args.push('--target', task.target.toUpperCase());
    args.push('--module', task.module.toLowerCase());
    // Target options:
    if (target.out) {
        args.push('--out', target.out);
    }
    if (target.outDir) {
        if (target.out) {
            console.warn('WARNING: Option "out" and "outDir" should not be used together'.magenta);
        }
        args.push('--outDir', target.outDir);
    }
    if (target.dest && (!target.out) && (!target.outDir)) {
        if (utils.isJavaScriptFile(target.dest)) {
            args.push('--out', target.dest);
        }
        else {
            if (target.dest === 'src') {
                console.warn(('WARNING: Destination for target "' + targetName + '" is "src", which is the default.  If you have' + ' forgotten to specify a "dest" parameter, please add it.  If this is correct, you may wish' + ' to change the "dest" parameter to "src/" or just ignore this warning.').magenta);
            }
            if (Array.isArray(target.dest)) {
                if (target.dest.length === 0) {
                }
                else if (target.dest.length > 0) {
                    console.warn((('WARNING: "dest" for target "' + targetName + '" is an array.  This is not supported by the' + ' TypeScript compiler or grunt-ts.' + ((target.dest.length > 1) ? '  Only the first "dest" will be used.  The' + ' remaining items will be truncated.' : ''))).magenta);
                    args.push('--outDir', target.dest[0]);
                }
            }
            else {
                args.push('--outDir', target.dest);
            }
        }
    }
    if (task.sourceRoot) {
        args.push('--sourceRoot', task.sourceRoot);
    }
    if (task.mapRoot) {
        args.push('--mapRoot', task.mapRoot);
    }
    // Locate a compiler
    var tsc;
    if (task.compiler) {
        exports.grunt.log.writeln('Using the custom compiler : ' + task.compiler);
        tsc = task.compiler;
    }
    else {
        tsc = getTsc(resolveTypeScriptBinPath());
    }
    // To debug the tsc command
    if (task.verbose) {
        console.log(args.join(' ').yellow);
    }
    else {
        exports.grunt.log.verbose.writeln(args.join(' ').yellow);
    }
    // Create a temp last command file and use that to guide tsc.
    // Reason: passing all the files on the command line causes TSC to go in an infinite loop.
    var tempfilename = utils.getTempFile('tscommand');
    if (!tempfilename) {
        throw (new Error('cannot create temp file'));
    }
    fs.writeFileSync(tempfilename, args.join(' '));
    // Execute command
    return executeNode([tsc, '@' + tempfilename]).then(function (result) {
        if (task.fast !== 'never' && result.code === 0) {
            resetChangedFiles(newFiles, targetName);
        }
        result.fileCount = files.length;
        fs.unlinkSync(tempfilename);
        exports.grunt.log.writeln(result.output);
        return Promise.cast(result);
    }, function (err) {
        fs.unlinkSync(tempfilename);
        throw err;
    });
}
exports.compileAllFiles = compileAllFiles;
//# sourceMappingURL=compile.js.map