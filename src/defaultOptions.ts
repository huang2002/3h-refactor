const defaultOptions = {
    include: [
        /\.js$/i,
        /\.jsx$/i,
        /\.mjs$/i,
        /\.json$/i,
        /\.ts$/i,
        /\.tsx$/i,
        /\.html$/i,
        /\.htm$/i
    ],
    importStatements: [
        /import\s*(?:\{.*\}|\*\s*as\s+\w+|\s\w+)\s*from\s*["'](.+)["'];?/g,
        /export\s*(?:\{.*\}|\*\s*)\s*from\s*["'](.+)["'];?/g,
        /(?:import\s*\w+\s*=\s*)?require\(\s*["'](.+)["']\s*\);?/g,
        /import\(\s*["'](.+)["']\s*\)/g,
        /import\s*["'](.+)["']\s*;/g,
        /<script [^>]*src="?([\w\.\/\\]+)"?[^>]*><\/script>/g
    ],
    preserveExt: [
        // /\.js$/i
    ] as RegExp[],
    ignoreExt: [
        /\.ts$/i,
        /\.tsx$/i,
    ]
};

export = defaultOptions;
