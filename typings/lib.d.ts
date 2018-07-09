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
declare class Refactor implements Required<RefactorOptions> {
    constructor(options?: RefactorOptions);
    static readonly defaultOptions: {
        include: RegExp[];
        importStatements: RegExp[];
        preserveExt: RegExp[];
        ignoreExt: RegExp[];
    };
    basePath: string;
    encoding: string;
    include: RegExp[];
    importStatements: RegExp[];
    useForwardSlash: boolean;
    preserveExt: RegExp[];
    ignoreExt: RegExp[];
    searchIncludedFiles(callback: (err: Error | null, files: string[]) => void): this;
    searchImportStatements(file: string, callback: (err: Error | null, statements: Statement[], content: string) => void): this;
    searchReferences(src: string, callback: (err: Error | null, references: Reference[]) => void): this;
    formatPath(src: string, target: string): string;
    searchReplacements(src: string, target: string, callback: (err: Error | null, replacements: Replacement[]) => void): this;
    move(srcFile: string, target: string, callback?: (err: Error | null, changedFiles: string[]) => void): this;
}
export = Refactor;
