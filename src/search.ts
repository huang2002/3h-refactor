import { readdir, stat } from "fs";
import { join } from "path";

export = function search(path: string, callback: (err: Error | null, files: string[]) => void) {
    readdir(path, (err, items) => {
        if (err) {
            callback(err, []);
        } else if (items.length === 0) {
            callback(null, []);
        } else {

            const ans: string[] = [];
            let rest = items.length,
                errFlag = false;

            function check() {
                if (--rest === 0) {
                    callback(null, ans);
                }
            }

            items.forEach(item => {
                const itemPath = join(path, item);
                stat(itemPath, (err, stats) => {
                    if (!errFlag) {
                        if (err) {
                            callback(err, []);
                            errFlag = true;
                        } else {

                            if (stats.isFile()) {
                                ans.push(item);
                                check();
                            } else {
                                search(itemPath, (err, files) => {
                                    if (err) {
                                        callback(err, []);
                                        errFlag = true;
                                    } else {
                                        ans.push(...files.map(file => join(item, file)));
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
