"use strict";
const fs_1 = require("fs");
const path_1 = require("path");
function search(path, callback) {
    fs_1.readdir(path, (err, items) => {
        if (err) {
            callback(err, []);
        }
        else if (items.length === 0) {
            callback(null, []);
        }
        else {
            const ans = [];
            let rest = items.length, errFlag = false;
            function check() {
                if (--rest === 0) {
                    callback(null, ans);
                }
            }
            items.forEach(item => {
                const itemPath = path_1.join(path, item);
                fs_1.stat(itemPath, (err, stats) => {
                    if (!errFlag) {
                        if (err) {
                            callback(err, []);
                            errFlag = true;
                        }
                        else {
                            if (stats.isFile()) {
                                ans.push(item);
                                check();
                            }
                            else {
                                search(itemPath, (err, files) => {
                                    if (err) {
                                        callback(err, []);
                                        errFlag = true;
                                    }
                                    else {
                                        ans.push(...files.map(file => path_1.join(item, file)));
                                        check();
                                    }
                                });
                            }
                        }
                    }
                });
            });
        }
    });
}
module.exports = search;
