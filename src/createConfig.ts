import path from 'path';
import fs from 'fs';
import ps, { ChildProcess } from 'child_process';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import {
  DefinePlugin,
  HashedModuleIdsPlugin,
  optimize,
  Compiler,
} from 'webpack';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import CssPlugin from 'mini-css-extract-plugin';
import externals from 'webpack-node-externals';
import Fiber from 'fibers';
import sass from 'sass';
import dotenv from 'dotenv';
import CompressionPlugin from 'compression-webpack-plugin';
import { TsConfigPathsPlugin, CheckerPlugin } from 'awesome-typescript-loader';
import OptimizeCssAssetsPlugin from 'optimize-css-assets-webpack-plugin';
import TerserPlugin from 'terser-webpack-plugin';
import LoadablePlugin from '@loadable/webpack-plugin';
import FriendlyErrorsPlugin from 'friendly-errors-webpack-plugin';
// @ts-ignore
import StatsPlugin from 'webpack-visualizer-plugin';
// @ts-ignore
import HashPlugin from 'hash-webpack-plugin';
// @ts-ignore
import MomentPlugin from 'moment-locales-webpack-plugin';

const { LimitChunkCountPlugin } = optimize;

/**
 * Коллекция переменных.
 */
type Collection = Record<string, string>;

/**
 * Необработанная коллекция переменных окружения.
 */
type RawEnv = Record<string, string | undefined>;

/**
 * Обработанная коллекция переменных окружения.
 */
type Env = Record<string, any>;

/**
 * Создает конфигурацию webpack.
 * @param _env Коллекция переменных среды, объявленных через webpack.
 * @param args Коллекция аргументов командной строки.
 */
export const createConfig = (_env: Collection, args: Collection) => {
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

  const when = <T>(condition: boolean, value: T): T => {
    const defaults = Array.isArray(value) ? [] : {};
    return (condition ? value : defaults) as T;
  };

  const parseArray = (value: string) =>
    value.split(',').map((item) => item.replace(/^\s+|\s+$/, ''));

  const parseNumber = (value: string) =>
    value == null || value === '' || Number.isNaN(Number(value))
      ? undefined
      : Number(value);

  const filterEnv = (env: RawEnv): RawEnv =>
    Object.keys(env).reduce(
      (previous, key) =>
        key === 'NODE_ENV' || /^APP_\w+$/.test(key)
          ? { ...previous, [key]: env[key] }
          : previous,
      {} as RawEnv
    );

  const parseEnv = (file: string): RawEnv =>
    filterEnv(dotenv.config({ path: file }).parsed || {});

  const stringifyEnv = (env: Env): Env =>
    Object.keys(env).reduce(
      (result, key) => ({
        ...result,
        [`process.env.${key}`]: JSON.stringify(env[key]),
      }),
      {} as Env
    );

  const removeEnvOptions = (env: RawEnv): RawEnv =>
    Object.keys(env).reduce(
      (result, key) =>
        key in defaultOptions ? result : { ...result, [key]: env[key] },
      {} as RawEnv
    );

  const findFile = (folder: string, extensions: string[], name: string) =>
    extensions
      .map((ext) => path.resolve(folder, `${name}${ext}`))
      .find(fs.existsSync);

  const target = args.target || defaultOptions.APP_TARGET;
  const isServer = target === 'node';
  const isClient = target === 'web';

  const isDevServer = process.argv.some(
    (item) => item.indexOf('webpack-dev-server') >= 0
  );

  const mode = process.env.NODE_ENV || defaultOptions.NODE_ENV;
  const isDevelopment = mode === 'development';

  const rootPath = defaultOptions.APP_ROOT_PATH;

  const fileEnv = {
    ...parseEnv(path.resolve(rootPath, '.env')),
    ...parseEnv(path.resolve(rootPath, '.env.local')),
    ...parseEnv(path.resolve(rootPath, `.env.${mode}`)),
    ...parseEnv(path.resolve(rootPath, `.env.${mode}.local`)),
  };

  const systemEnv = filterEnv(process.env);

  const options = {
    ...defaultOptions,
    ...fileEnv,
    ...systemEnv,
  };

  const tsConfigPath = path.resolve(rootPath, 'tsconfig.json');
  const modulesPath = path.resolve(rootPath, 'node_modules');
  const cachePath = path.resolve(modulesPath, '.cache');
  const sourcePath = path.resolve(rootPath, options.APP_SOURCE_PATH);
  const outputPath = path.resolve(rootPath, options.APP_OUTPUT_PATH);
  const publicPath = path.resolve(rootPath, options.APP_PUBLIC_PATH);

  const entryExtensions = parseArray(options.APP_ENTRY_EXTENSIONS);

  const entry = findFile(
    sourcePath,
    entryExtensions,
    isServer ? options.APP_SERVER_ENTRY : options.APP_CLIENT_ENTRY
  );

  const templateExtensions = parseArray(options.APP_TEMPLATE_EXTENSIONS);

  const template = findFile(
    sourcePath,
    templateExtensions,
    options.APP_TEMPLATE
  );

  const devListen = parseNumber(options.APP_DEV_LISTEN) as number;
  const listen = parseNumber(options.APP_LISTEN) as number;

  const locales = parseArray(options.APP_LOCALES);

  const env = {
    ...removeEnvOptions({
      ...fileEnv,
      ...systemEnv,
    }),
    NODE_ENV: mode,
    APP_TARGET: target,
    APP_FOLDER: outputPath,
    APP_LISTEN: listen,
  };

  return {
    target,
    mode,
    context: rootPath,
    entry: [entry],
    output: {
      filename: isClient ? 'js/[name].[contenthash].js' : 'server.js',
      path: outputPath,
      publicPath: '/',
      ...when(isServer, {
        libraryTarget: 'commonjs2',
        library: 'main',
      }),
    },
    externals: isServer ? [externals()] : undefined,
    stats: { children: false },
    devtool: isDevelopment && isClient ? 'source-map' : undefined,
    ...when(isDevServer, {
      devServer: {
        quiet: true,
        contentBase: publicPath,
        historyApiFallback: true,
        host: 'localhost',
        port: isClient ? devListen : devListen + 1,
        writeToDisk: true,
        proxy: {},
        ...when(isServer, {
          before: (_app: any, _server: any, compiler: Compiler) => {
            let child: ChildProcess | undefined;

            compiler.hooks.done.tap('webpack.config.js', (stats) => {
              if (child) {
                child.kill();
                child = undefined;
              }

              if (stats.hasErrors()) {
                return;
              }

              const file = path.resolve(outputPath, 'server.js');

              child = ps.fork(file, undefined, {
                silent: true,
                stdio: [1, 2, 3, 'ipc'],
              });
            });
          },
        }),
      },
    }),
    resolve: {
      extensions: entryExtensions,
      modules: [sourcePath, modulesPath],
      plugins: [new TsConfigPathsPlugin({ configFileName: tsConfigPath })],
    },
    optimization: {
      usedExports: true,
      minimizer: [
        new OptimizeCssAssetsPlugin(),
        new TerserPlugin({
          parallel: true,
          cache: false,
          terserOptions: {
            output: { comments: false },
          },
        }),
      ],
      ...when(isClient, {
        runtimeChunk: 'single',
        splitChunks: {
          chunks: 'all',
          maxInitialRequests: Infinity,
          minSize: 0,
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: (module: any) => {
                const context = module.context as string;

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
      }),
    },
    module: {
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
                cacheDirectory: path.resolve(
                  cachePath,
                  'awesome-typescript-loader'
                ),
                reportFiles: [
                  path.relative(
                    rootPath,
                    path.resolve(sourcePath, '**/*.{tsx,ts}')
                  ),
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
                    loader: CssPlugin.loader,
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
                implementation: sass,
                sassOptions: {
                  fiber: Fiber as any,
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
    },
    plugins: [
      new HashedModuleIdsPlugin(),
      new DefinePlugin(stringifyEnv(env)),
      new CheckerPlugin(),
      new MomentPlugin({ localesToKeep: locales }),
      new CssPlugin({
        filename: 'css/[name].[contenthash].css',
        esModule: true,
        ignoreOrder: true,
      }),
      ...when(isDevServer, [
        new FriendlyErrorsPlugin({
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
        new CopyWebpackPlugin([
          {
            from: publicPath,
            to: outputPath,
          },
        ]),
        new HtmlWebpackPlugin({ template }),
        new CompressionPlugin(),
        new LoadablePlugin(),
        new HashPlugin({
          fileName: 'hash.txt',
          path: outputPath,
        }),
        ...when(isDevelopment, [new StatsPlugin()]),
      ]),
      ...when(isServer, [
        new LimitChunkCountPlugin({
          maxChunks: 1,
        }),
      ]),
    ],
  };
};
