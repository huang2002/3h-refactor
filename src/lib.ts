import { resolve, relative, normalize, join, dirname, basename, extname, sep } from "path";
import { readFile, writeFile, existsSync, rename, mkdir } from "fs";
import search = require('./search');
import defaultOptions = require('./defaultOptions');

const thrower = (err: Error | null) => {
    if (err) {
        throw err;
    }
};

interface Statement {
    statement: string;
    src: string;
}

interface Reference extends Statement {
    file: string;
}

interface Replacement extends Reference {
    dist: string;
}

interface RefactorOptions {
    basePath?: string;
    encoding?: string;
    include?: RegExp[];
    importStatements?: RegExp[];
    useForwardSlash?: boolean;
    preserveExt?: RegExp[];
    ignoreExt?: RegExp[];
}

class Refactor implements Required<RefactorOptions> {

    constructor(options: RefactorOptions = {}) {
        Object.assign(this, options);
    }

    static readonly defaultOptions = defaultOptions;

    basePath = process.cwd();
    encoding = 'utf8';
    include = defaultOptions.include;
    importStatements = defaultOptions.importStatements;
    useForwardSlash = true;
    preserveExt = defaultOptions.preserveExt;
    ignoreExt = defaultOptions.ignoreExt;

    searchIncludedFiles(callback: (err: Error | null, files: string[]) => void) {
        const { basePath } = this;
        search(basePath, (err, files) => {
            if (err) {
                callback(err, []);
            } else {
                const { include } = this;
                callback(
                    null,
                    files.map(file => resolve(join(basePath, file)))
                        .filter(file => include.some(regExp => regExp.test(file)))
                );
            }
        });
        return this;
    }

    searchImportStatements(
        file: string,
        callback: (err: Error | null, statements: Statement[], content: string) => void
    ) {
        readFile(file, this.encoding, (err, content) => {
            if (err) {
                callback(err, [], '');
            } else {

                const ans: Statement[] = [];

                this.importStatements.forEach(importStatement => {
                    const statements = content.match(importStatement);
                    if (statements) {
                        statements.forEach(statement => {
                            statement.match(importStatement);
                            ans.push({ statement, src: RegExp.$1 });
                        });
                    }
                });

                callback(null, ans, content);

            }
        });
        return this;
    }

    searchReferences(
        src: string,
        callback: (err: Error | null, references: Reference[]) => void
    ) {

        const srcPath = join(this.basePath, src),
            srcExt = extname(src),
            resolvedSrc = resolve(srcPath),
            resolvedSrcDir = dirname(resolvedSrc),
            resolvedSrcFilename = basename(src, srcExt),
            ans: Reference[] = [];

        this.searchIncludedFiles((err, files) => {
            if (err) {
                callback(err, []);
            } else {

                let rest = files.length,
                    errFlag = false;
                function check() {
                    if (--rest === 0) {
                        callback(null, ans);
                    }
                }

                files.forEach(file => {

                    if (file === resolvedSrc) {
                        return check();
                    }

                    const fileDir = dirname(file);

                    this.searchImportStatements(file, (err, statements) => {
                        if (!errFlag) {
                            if (err) {
                                callback(err, []);
                                errFlag = true;
                            } else {

                                const { ignoreExt } = this;
                                statements.forEach(statement => {

                                    const thatSrc = statement.src,
                                        thatSrcExt = extname(thatSrc);

                                    if (
                                        thatSrc.startsWith("\.") &&
                                        dirname(resolve(join(fileDir, thatSrc))) === resolvedSrcDir &&
                                        basename(thatSrc, thatSrcExt) === resolvedSrcFilename &&
                                        (thatSrcExt === srcExt || (
                                            thatSrcExt === '' &&
                                            ignoreExt.some(ie => ie.test(srcExt))
                                        ))
                                    ) {
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

    formatPath(src: string, target: string) {
        const { preserveExt } = this;
        let dist = normalize(relative(dirname(src), target)),
            distExt = extname(dist);
        if (!preserveExt.some(regExp => regExp.test(distExt))) {
            dist = join(dirname(dist), basename(dist, distExt));
        }
        if (!dist.startsWith('.')) {
            dist = '.' + sep + dist;
        }
        if (this.useForwardSlash) {
            dist = dist.replace(/\\/g, '/');
        }
        return dist;
    }

    searchReplacements(
        src: string, target: string,
        callback: (err: Error | null, replacements: Replacement[]) => void
    ) {

        this.searchReferences(src, (err, references) => {
            if (err) {
                callback(err, []);
            } else {
                callback(
                    null,
                    references.map(reference => {
                        return { ...reference, dist: this.formatPath(reference.file, target) };
                    })
                );
            }
        });

        return this;
    }

    move(
        srcFile: string, target: string,
        callback: (err: Error | null, changedFiles: string[]) => void = thrower
    ) {
        if (!existsSync(join(this.basePath, srcFile))) {
            process.nextTick(() => {
                callback(new Error('The file does not exist!'), []);
            });
        } else {

            let errFlag = false;
            const error = (err: Error) => {
                if (!errFlag) {
                    callback(err, []);
                    errFlag = true;
                }
            };

            const targetDir = dirname(target);
            if (!existsSync(targetDir)) {
                mkdir(targetDir, err => {
                    if (err) {
                        error(err);
                    }
                });
            }

            const changedFiles = new Set<string>(),
                actions: (() => void)[] = [];
            function next() {
                const action = actions.shift();
                if (action) {
                    action();
                } else {
                    callback(null, [...changedFiles]);
                }
            }

            const { encoding } = this;

            this.searchReplacements(srcFile, target, (err, replacements) => {
                if (err) {
                    error(err);
                } else {

                    replacements.forEach(replacement => {
                        changedFiles.add(replacement.file);
                    });

                    replacements.forEach(({ file, statement, src, dist }) => {

                        actions.push(() => {
                            readFile(file, encoding, (err, data) => {
                                if (err) {
                                    error(err);
                                } else {
                                    writeFile(
                                        file,
                                        data.replace(
                                            statement,
                                            statement.replace(src, dist)
                                        ),
                                        encoding,
                                        err => {
                                            if (err) {
                                                error(err);
                                            } else {
                                                next();
                                            }
                                        }
                                    );
                                }
                            });
                        });

                    });

                    const srcFileDir = dirname(srcFile);
                    actions.push(() => {

                        this.searchImportStatements(srcFile, (err, statements, content) => {
                            if (err) {
                                error(err);
                            } else {

                                if (statements.length > 0) {

                                    changedFiles.add(srcFile);

                                    statements.forEach(({ statement, src }) => {
                                        if (existsSync(join(srcFileDir, src))) {
                                            content = content.replace(
                                                statement,
                                                statement.replace(
                                                    src,
                                                    this.formatPath(
                                                        target,
                                                        join(srcFileDir, src)
                                                    )
                                                )
                                            );
                                        }
                                    });

                                    writeFile(srcFile, content, encoding, err => {
                                        if (err) {
                                            error(err);
                                        } else {

                                            rename(srcFile, target, err => {
                                                if (err) {
                                                    error(err);
                                                } else {
                                                    next();
                                                }
                                            });

                                        }
                                    });

                                } else {
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

export = Refactor;
