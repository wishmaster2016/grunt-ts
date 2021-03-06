
interface ITargetOptions {
    src: string[]; // input files  // Note : this is a getter and returns a new "live globbed" array 
    reference: string; // path to a reference.ts e.g. './approot/'
    out: string; // if sepecified e.g. 'single.js' all output js files are merged into single.js using tsc --out command     
    outDir: string; // if sepecified e.g. '/build/js' all output js files are put in this location
    baseDir: string; // If specified. outDir files are made relative to this. 
    html: string[];  // if specified this is used to generate typescript files with a single variable which contains the content of the html
    htmlOutDir: string; // if specified with html, the generated typescript file will be produce in the directory
    htmlOutDirFlatten: boolean; // if specified with htmlOutDir, the files will be flat in the htmlOutDir
    watch: string; // if specified watches all files in this directory for changes. 
    amdloader: string;  // if specified creates a js file to load all the generated typescript files in order using requirejs + order
    templateCache: {
        src: string[]; // if search through all the html files at this location
        dest: string;
        baseUrl: string;
    };
}

/**
 * Version 0.9.5.0
 *
 * Bare Options Supported:
 * --allowbool                   Allow 'bool' as a synonym for 'boolean'.
 * --allowimportmodule           Allow 'module(...)' as a synonym for 'require(...)'.
 * --declaration                 Generates corresponding .d.ts file
 * --mapRoot LOCATION            Specifies the location where debugger should locate map files instead of generated locations.
 * --module KIND                 Specify module code generation: "commonjs" or "amd"
 * --noImplicitAny               Warn on expressions and declarations with an implied 'any' type.
 * --noResolve                   Skip resolution and preprocessing
 * --removeComments              Do not emit comments to output
 * --sourcemap                   Generates corresponding .map file
 * --sourceRoot LOCATION         Specifies the location where debugger should locate TypeScript files instead of source locations.
 * --target VERSION              Specify ECMAScript target version: "ES3" (default), or "ES5"
 */
interface ITaskOptions {
    allowBool: boolean;
    allowImportModule: boolean;
    declaration: boolean;
    mapRoot: string;
    module: string; // amd, commonjs
    noImplicitAny: boolean;
    noResolve: boolean;
    comments: boolean; // false to remove comments
    removeComments: boolean; // true to remove comments
    sourceMap: boolean;
    sourceRoot: string;
    target: string; // es3 , es5
    failOnTypeErrors: boolean;

    verbose: boolean;
    compile: boolean;
    fast: string; // never | always | watch (default)

    htmlModuleTemplate: string;
    htmlVarTemplate: string;
    htmlOutDir: string;
    htmlOutDirFlatten: boolean;
}
