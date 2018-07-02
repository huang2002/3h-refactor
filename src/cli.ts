#! node
import { existsSync } from "fs";
import { relative } from "path";
import Refactor = require('./lib');

const args = process.argv.slice(2);

const refactor = new Refactor();

const rel = (file: string) => relative(refactor.basePath, file);

switch (args.length) {

    case 1:
        if (existsSync(args[0])) {
            refactor.searchReferences(args[0], (err, references) => {
                if (err) {
                    throw err;
                } else {
                    if (references.length === 0) {
                        console.log('No references found.');
                    } else {
                        console.log(`Reference${references.length > 1 ? 's' : ''}:\n`);
                        references.forEach(({ file, statement }) => {
                            console.log(`(${rel(file)}) ${statement}`);
                        });
                    }
                }
            });
        } else {
            throw "The file does not exist!";
        }
        break;

    case 2:
        refactor.move(args[0], args[1], (err, changedFiles) => {
            if (err) {
                throw err;
            } else {
                if (changedFiles.length === 0) {
                    console.log('No changed files.');
                } else {
                    console.log(`Changed file${changedFiles.length > 1 ? 's' : ''}:\n`);
                    changedFiles.forEach(file => {
                        console.log(rel(file));
                    });
                }
            }
        });
        break;

    default:
        console.log(
            'Usage:\n' +
            '  3h-refactor              - Show help info like this.\n' +
            '  3h-refactor <src>        - Show reference(s) to src file.\n' +
            '  3h-refactor <src> <dist> - Change src file to dist file.'
        );
        break;

}
