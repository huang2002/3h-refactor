"use strict";
const path_1 = require("path");
const fs_1 = require("fs");
const search = require("./search");
const thrower = (err) => {
    if (err) {
        throw err;
    }
};
const defaultOptions = {
    include: [
        /\.js$/i,
        /\.jsx$/i,
        /\.mjs$/i,
        /\.ts$/i,
        /\.tsx$/i
    ],
    importStatements: [
        /^import\s*(?:\{.*\}|\*\s*as\s+\w+|\s\w+)\s*from\s*["'].+["'];?$/gm,
        /^import\s*\w+\s*=\s*require\(\s*["'].+["']\s*\);?$/gm,
        /import\(\s*["'].+["']\s*\)/gm,
        /import\s*["'].+["']\s*;/gm
    ],
    preserveExt: [
    // /js$/i
    ]
};
class Refactor {
    constructor(options = {}) {
        this.basePath = process.cwd();
        this.encoding = 'utf8';
        this.include = defaultOptions.include;
        this.importStatements = defaultOptions.importStatements;
        this.useForwardSlash = true;
        this.preserveExt = defaultOptions.preserveExt;
        Object.assign(this, options);
    }
    searchIncludedFiles(callback) {
        const { basePath } = this;
        search(basePath, (err, files) => {
            if (err) {
                callback(err, []);
            }
            else {
                const { include } = this;
                callback(null, files.map(file => path_1.resolve(path_1.join(basePath, file)))
                    .filter(file => include.some(regExp => regExp.test(file))));
            }
        });
        return this;
    }
    searchImportStatements(file, callback) {
        fs_1.readFile(file, this.encoding, (err, content) => {
            if (err) {
                callback(err, [], '');
            }
            else {
                const ans = [];
                this.importStatements.forEach(importStatement => {
                    const statements = content.match(importStatement);
                    if (statements) {
                        statements.forEach(statement => {
                            statement.match(/["'](.+)["']/g);
                            const path = RegExp.$1;
                            ans.push({ statement, src: path });
                        });
                    }
                });
                callback(null, ans, content);
            }
        });
        return this;
    }
    searchReferences(src, callback) {
        const srcPath = path_1.join(this.basePath, src), srcExt = path_1.extname(src), resolvedSrc = path_1.resolve(srcPath), resolvedSrcDir = path_1.dirname(resolvedSrc), resolvedSrcFilename = path_1.basename(src, srcExt), ans = [];
        this.searchIncludedFiles((err, files) => {
            if (err) {
                callback(err, []);
            }
            else {
                let rest = files.length, errFlag = false;
                function check() {
                    if (--rest === 0) {
                        callback(null, ans);
                    }
                }
                files.forEach(file => {
                    if (file === resolvedSrc) {
                        return check();
                    }
                    const fileDir = path_1.dirname(file);
                    this.searchImportStatements(file, (err, statements) => {
                        if (!errFlag) {
                            if (err) {
                                callback(err, []);
                                errFlag = true;
                            }
                            else {
                                statements.forEach(statement => {
                                    const thatSrc = statement.src, thatSrcExt = path_1.extname(thatSrc);
                                    if (thatSrc.startsWith("\.") &&
                                        path_1.dirname(path_1.resolve(path_1.join(fileDir, thatSrc))) === resolvedSrcDir &&
                                        path_1.basename(thatSrc, thatSrcExt) === resolvedSrcFilename &&
                                        (thatSrcExt === '' || thatSrcExt === srcExt)) {
                                        ans.push({ ...statement, file });
                                    }
                                });
                                check();
                            }
                        }
                    });
                });
            }
        });
        return this;
    }
    formatPath(src, target) {
        const { preserveExt } = this;
        let dist = path_1.normalize(path_1.relative(path_1.dirname(src), target)), distExt = path_1.extname(dist);
        if (!preserveExt.some(regExp => regExp.test(distExt))) {
            dist = path_1.join(path_1.dirname(dist), path_1.basename(dist, distExt));
        }
        if (!dist.startsWith('.')) {
            dist = '.' + path_1.sep + dist;
        }
        if (this.useForwardSlash) {
            dist = dist.replace(/\\/g, '/');
        }
        return dist;
    }
    searchReplacements(src, target, callback) {
        this.searchReferences(src, (err, references) => {
            if (err) {
                callback(err, []);
            }
            else {
                callback(null, references.map(reference => {
                    return { ...reference, dist: this.formatPath(reference.file, target) };
                }));
            }
        });
        return this;
    }
    move(srcFile, target, callback = thrower) {
        if (!fs_1.existsSync(path_1.join(this.basePath, srcFile))) {
            process.nextTick(() => {
                callback(new Error('The file does not exist!'), []);
            });
        }
        else {
            let errFlag = false;
            const error = (err) => {
                if (!errFlag) {
                    callback(err, []);
                    errFlag = true;
                }
            };
            const targetDir = path_1.dirname(target);
            if (!fs_1.existsSync(targetDir)) {
                fs_1.mkdir(targetDir, err => {
                    if (err) {
                        error(err);
                    }
                });
            }
            const changedFiles = [], actions = [];
            function next() {
                const action = actions.shift();
                if (action) {
                    action();
                }
                else {
                    callback(null, changedFiles);
                }
            }
            const { encoding } = this;
            this.searchReplacements(srcFile, target, (err, replacements) => {
                if (err) {
                    error(err);
                }
                else {
                    changedFiles.push(...replacements.map(replacement => replacement.file));
                    replacements.forEach(({ file, statement, src, dist }) => {
                        actions.push(() => {
                            fs_1.readFile(file, encoding, (err, data) => {
                                if (err) {
                                    error(err);
                                }
                                else {
                                    fs_1.writeFile(file, data.replace(statement, statement.replace(src, dist)), encoding, err => {
                                        if (err) {
                                            error(err);
                                        }
                                        else {
                                            next();
                                        }
                                    });
                                }
                            });
                        });
                    });
                    const srcFileDir = path_1.dirname(srcFile);
                    actions.push(() => {
                        this.searchImportStatements(srcFile, (err, statements, content) => {
                            if (err) {
                                error(err);
                            }
                            else {
                                if (statements.length > 0) {
                                    changedFiles.push(srcFile);
                                    statements.forEach(({ statement, src }) => {
                                        content = content.replace(statement, statement.replace(src, this.formatPath(target, path_1.join(srcFileDir, src))));
                                    });
                                    fs_1.writeFile(srcFile, content, encoding, err => {
                                        if (err) {
                                            error(err);
                                        }
                                        else {
                                            fs_1.rename(srcFile, target, err => {
                                                if (err) {
                                                    error(err);
                                                }
                                                else {
                                                    next();
                                                }
                                            });
                                        }
                                    });
                                }
                                else {
                                    next();
                                }
                            }
                        });
                    });
                    next();
                }
            });
        }
        return this;
    }
}
Refactor.defaultOptions = defaultOptions;
module.exports = Refactor;
