"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createConfig = void 0;
const path_1 = require("path");
const fs_1 = require("fs");
const child_process_1 = require("child_process");
const html_webpack_plugin_1 = require("html-webpack-plugin");
const webpack_1 = require("webpack");
const copy_webpack_plugin_1 = require("copy-webpack-plugin");
const mini_css_extract_plugin_1 = require("mini-css-extract-plugin");
const webpack_node_externals_1 = require("webpack-node-externals");
const fibers_1 = require("fibers");
const sass_1 = require("sass");
const dotenv_1 = require("dotenv");
const compression_webpack_plugin_1 = require("compression-webpack-plugin");
const awesome_typescript_loader_1 = require("awesome-typescript-loader");
const optimize_css_assets_webpack_plugin_1 = require("optimize-css-assets-webpack-plugin");
const terser_webpack_plugin_1 = require("terser-webpack-plugin");
const webpack_plugin_1 = require("@loadable/webpack-plugin");
const friendly_errors_webpack_plugin_1 = require("friendly-errors-webpack-plugin");
// @ts-ignore
const webpack_visualizer_plugin_1 = require("webpack-visualizer-plugin");
// @ts-ignore
const hash_webpack_plugin_1 = require("hash-webpack-plugin");
// @ts-ignore
const moment_locales_webpack_plugin_1 = require("moment-locales-webpack-plugin");
const { LimitChunkCountPlugin } = webpack_1.optimize;
/**
 * Создает конфигурацию webpack.
 * @param _env Коллекция переменных среды, объявленных через webpack.
 * @param args Коллекция аргументов командной строки.
 */
exports.createConfig = (_env, args) => {
    const defaultOptions = {
        NODE_ENV: 'development',
        APP_TARGET: 'web',
        APP_ROOT_PATH: process.cwd(),
        APP_SOURCE_PATH: './src',
        APP_OUTPUT_PATH: './build',
        APP_PUBLIC_PATH: './public',
        APP_ENTRY_EXTENSIONS: '.tsx,.ts,.jsx,.js,.json',
        APP_CLIENT_ENTRY: 'index',
        APP_SERVER_ENTRY: 'server/index',
        APP_TEMPLATE_EXTENSIONS: '.html,.ejs',
        APP_TEMPLATE: 'index',
        APP_LISTEN: '8000',
        APP_DEV_LISTEN: '3000',
        APP_LOCALES: 'en,de,es',
    };
    const when = (condition, value) => {
        const defaults = Array.isArray(value) ? [] : {};
        return (condition ? value : defaults);
    };
    const parseArray = (value) => value.split(',').map((item) => item.replace(/^\s+|\s+$/, ''));
    const parseNumber = (value) => value == null || value === '' || Number.isNaN(Number(value))
        ? undefined
        : Number(value);
    const filterEnv = (env) => Object.keys(env).reduce((previous, key) => key === 'NODE_ENV' || /^APP_\w+$/.test(key)
        ? Object.assign(Object.assign({}, previous), { [key]: env[key] }) : previous, {});
    const parseEnv = (file) => filterEnv(dotenv_1.default.config({ path: file }).parsed || {});
    const stringifyEnv = (env) => Object.keys(env).reduce((result, key) => (Object.assign(Object.assign({}, result), { [`process.env.${key}`]: JSON.stringify(env[key]) })), {});
    const removeEnvOptions = (env) => Object.keys(env).reduce((result, key) => key in defaultOptions ? result : Object.assign(Object.assign({}, result), { [key]: env[key] }), {});
    const findFile = (folder, extensions, name) => extensions
        .map((ext) => path_1.default.resolve(folder, `${name}${ext}`))
        .find(fs_1.default.existsSync);
    const target = args.target || defaultOptions.APP_TARGET;
    const isServer = target === 'node';
    const isClient = target === 'web';
    const isDevServer = process.argv.some((item) => item.indexOf('webpack-dev-server') >= 0);
    const mode = process.env.NODE_ENV || defaultOptions.NODE_ENV;
    const isDevelopment = mode === 'development';
    const rootPath = defaultOptions.APP_ROOT_PATH;
    const fileEnv = Object.assign(Object.assign(Object.assign(Object.assign({}, parseEnv(path_1.default.resolve(rootPath, '.env'))), parseEnv(path_1.default.resolve(rootPath, '.env.local'))), parseEnv(path_1.default.resolve(rootPath, `.env.${mode}`))), parseEnv(path_1.default.resolve(rootPath, `.env.${mode}.local`)));
    const systemEnv = filterEnv(process.env);
    const options = Object.assign(Object.assign(Object.assign({}, defaultOptions), fileEnv), systemEnv);
    const tsConfigPath = path_1.default.resolve(rootPath, 'tsconfig.json');
    const modulesPath = path_1.default.resolve(rootPath, 'node_modules');
    const cachePath = path_1.default.resolve(modulesPath, '.cache');
    const sourcePath = path_1.default.resolve(rootPath, options.APP_SOURCE_PATH);
    const outputPath = path_1.default.resolve(rootPath, options.APP_OUTPUT_PATH);
    const publicPath = path_1.default.resolve(rootPath, options.APP_PUBLIC_PATH);
    const entryExtensions = parseArray(options.APP_ENTRY_EXTENSIONS);
    const entry = findFile(sourcePath, entryExtensions, isServer ? options.APP_SERVER_ENTRY : options.APP_CLIENT_ENTRY);
    const templateExtensions = parseArray(options.APP_TEMPLATE_EXTENSIONS);
    const template = findFile(sourcePath, templateExtensions, options.APP_TEMPLATE);
    const devListen = parseNumber(options.APP_DEV_LISTEN);
    const listen = parseNumber(options.APP_LISTEN);
    const locales = parseArray(options.APP_LOCALES);
    const env = Object.assign(Object.assign({}, removeEnvOptions(Object.assign(Object.assign({}, fileEnv), systemEnv))), { NODE_ENV: mode, APP_TARGET: target, APP_FOLDER: outputPath, APP_LISTEN: listen });
    return Object.assign(Object.assign({ target,
        mode, context: rootPath, entry: [entry], output: Object.assign({ filename: isClient ? 'js/[name].[contenthash].js' : 'server.js', path: outputPath, publicPath: '/' }, when(isServer, {
            libraryTarget: 'commonjs2',
            library: 'main',
        })), externals: isServer ? [webpack_node_externals_1.default()] : undefined, stats: { children: false }, devtool: isDevelopment && isClient ? 'source-map' : undefined }, when(isDevServer, {
        devServer: Object.assign({ quiet: true, contentBase: publicPath, historyApiFallback: true, host: 'localhost', port: isClient ? devListen : devListen + 1, writeToDisk: true, proxy: {} }, when(isServer, {
            before: (_app, _server, compiler) => {
                let child;
                compiler.hooks.done.tap('webpack.config.js', (stats) => {
                    if (child) {
                        child.kill();
                        child = undefined;
                    }
                    if (stats.hasErrors()) {
                        return;
                    }
                    const file = path_1.default.resolve(outputPath, 'server.js');
                    child = child_process_1.default.fork(file, undefined, {
                        silent: true,
                        stdio: [1, 2, 3, 'ipc'],
                    });
                });
            },
        })),
    })), { resolve: {
            extensions: entryExtensions,
            modules: [sourcePath, modulesPath],
            plugins: [new awesome_typescript_loader_1.TsConfigPathsPlugin({ configFileName: tsConfigPath })],
        }, optimization: Object.assign({ usedExports: true, minimizer: [
                new optimize_css_assets_webpack_plugin_1.default(),
                new terser_webpack_plugin_1.default({
                    parallel: true,
                    cache: false,
                    terserOptions: {
                        output: { comments: false },
                    },
                }),
            ] }, when(isClient, {
            runtimeChunk: 'single',
            splitChunks: {
                chunks: 'all',
                maxInitialRequests: Infinity,
                minSize: 0,
                cacheGroups: {
                    vendor: {
                        test: /[\\/]node_modules[\\/]/,
                        name: (module) => {
                            const context = module.context;
                            const pattern = /[\\/]node_modules[\\/](.*?)([\\/]|$)/;
                            const match = context.match(pattern);
                            if (match == null) {
                                return 'main';
                            }
                            const [, name] = match;
                            return `npm.${name.replace('@', '')}`;
                        },
                    },
                },
            },
        })), module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    include: sourcePath,
                    use: [
                        {
                            loader: 'babel-loader',
                            options: {},
                        },
                        {
                            loader: 'awesome-typescript-loader',
                            options: {
                                silent: true,
                                useBabel: true,
                                babelCore: '@babel/core',
                                useCache: true,
                                cacheDirectory: path_1.default.resolve(cachePath, 'awesome-typescript-loader'),
                                reportFiles: [
                                    path_1.default.relative(rootPath, path_1.default.resolve(sourcePath, '**/*.{tsx,ts}')),
                                ],
                                forceIsolatedModules: true,
                            },
                        },
                    ],
                },
                {
                    test: /\.jsx?$/,
                    include: sourcePath,
                    use: [
                        {
                            loader: 'babel-loader',
                            options: {},
                        },
                    ],
                },
                {
                    test: /\.(s[ac]|c)ss$/,
                    include: sourcePath,
                    sideEffects: true,
                    use: [
                        ...(isClient
                            ? [
                                {
                                    loader: mini_css_extract_plugin_1.default.loader,
                                    options: {},
                                },
                            ]
                            : []),
                        {
                            loader: 'css-loader',
                            options: {
                                sourceMap: isDevelopment,
                                localsConvention: 'camelCase',
                                modules: {
                                    localIdentName: isDevelopment
                                        ? '[hash:base64]_[name]_[local]'
                                        : '[hash:base64]',
                                },
                                onlyLocals: isServer,
                                esModule: true,
                            },
                        },
                        {
                            loader: 'postcss-loader',
                            options: {
                                sourceMap: isDevelopment,
                            },
                        },
                        {
                            loader: 'sass-loader',
                            options: {
                                sourceMap: isDevelopment,
                                implementation: sass_1.default,
                                sassOptions: {
                                    fiber: fibers_1.default,
                                    includePaths: [sourcePath],
                                },
                            },
                        },
                    ],
                },
                {
                    test: /\.(png|svg|jpe?g|gif|eot|ttf|woff|woff2)$/i,
                    include: sourcePath,
                    use: [
                        {
                            loader: 'file-loader',
                            options: {
                                outputPath: 'assets',
                                emitFile: isClient,
                            },
                        },
                    ],
                },
            ],
        }, plugins: [
            new webpack_1.HashedModuleIdsPlugin(),
            new webpack_1.DefinePlugin(stringifyEnv(env)),
            new awesome_typescript_loader_1.CheckerPlugin(),
            new moment_locales_webpack_plugin_1.default({ localesToKeep: locales }),
            new mini_css_extract_plugin_1.default({
                filename: 'css/[name].[contenthash].css',
                esModule: true,
                ignoreOrder: true,
            }),
            ...when(isDevServer, [
                new friendly_errors_webpack_plugin_1.default({
                    // @ts-ignore
                    compilationSuccessInfo: {
                        notes: [
                            isClient
                                ? `Application is running at http://localhost:${devListen}\n`
                                : `Application is running at http://localhost:${listen}\n`,
                        ],
                    },
                }),
            ]),
            ...when(isClient, [
                new copy_webpack_plugin_1.default([
                    {
                        from: publicPath,
                        to: outputPath,
                    },
                ]),
                new html_webpack_plugin_1.default({ template }),
                new compression_webpack_plugin_1.default(),
                new webpack_plugin_1.default(),
                new hash_webpack_plugin_1.default({
                    fileName: 'hash.txt',
                    path: outputPath,
                }),
                ...when(isDevelopment, [new webpack_visualizer_plugin_1.default()]),
            ]),
            ...when(isServer, [
                new LimitChunkCountPlugin({
                    maxChunks: 1,
                }),
            ]),
        ] });
};
//# sourceMappingURL=createConfig.js.map