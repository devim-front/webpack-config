const path = require('path');
const fs = require('fs');
const ps = require('child_process');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { DefinePlugin, HashedModuleIdsPlugin, optimize } = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const CssPlugin = require('mini-css-extract-plugin');
const externals = require('webpack-node-externals');
const Fiber = require('fibers');
const sass = require('sass');
const dotenv = require('dotenv');
const CompressionPlugin = require('compression-webpack-plugin');
const {
  TsConfigPathsPlugin,
  CheckerPlugin,
} = require('awesome-typescript-loader');
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const StatsPlugin = require('webpack-visualizer-plugin');
const HashPlugin = require('hash-webpack-plugin');
const FriendlyErrorsPlugin = require('friendly-errors-webpack-plugin');
const LoadablePlugin = require('@loadable/webpack-plugin');

const { LimitChunkCountPlugin } = optimize;

/**
 * Создает экземпляр конфигурации webpack.
 * @param {Object} _env Коллекция переменных окружения, заданных через webpack.
 * @param {Object} args Коллекция флагов коммандной строки.
 */
const createConfig = (_env, args) => {
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
  };

  const when = (condition, value) => {
    const defaults = Array.isArray(value) ? [] : {};
    return condition ? value : defaults;
  };

  const parseArray = (value) =>
    value.split(',').map((item) => item.replace(/^\s+|\s+$/, ''));

  const parseNumber = (value) =>
    value == null || value === '' || Number.isNaN(Number(value))
      ? undefined
      : Number(value);

  const filterEnv = (env) =>
    Object.keys(env).reduce(
      (previous, key) =>
        key === 'NODE_ENV' || /^APP_\w+$/.test(key)
          ? { ...previous, [key]: env[key] }
          : previous,
      {}
    );

  const parseEnv = (file) =>
    filterEnv(dotenv.config({ path: file }).parsed || {});

  const stringifyEnv = (env) =>
    Object.keys(env).reduce(
      (result, key) => ({
        ...result,
        [`process.env.${key}`]: JSON.stringify(env[key]),
      }),
      {}
    );

  const removeEnvOptions = (env) =>
    Object.keys(env).reduce(
      (result, key) =>
        key in defaultOptions ? result : { ...result, [key]: env[key] },
      {}
    );

  const findFile = (folder, extensions, name) =>
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

  const devListen = parseNumber(options.APP_DEV_LISTEN);
  const listen = parseNumber(options.APP_LISTEN);

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
          before: (_app, _server, compiler) => {
            let child = null;

            compiler.hooks.done.tap('webpack.config.js', (stats) => {
              if (child) {
                child.kill();
                child = null;
              }

              if (stats.hasErrors()) {
                return;
              }

              const file = path.resolve(outputPath, 'server.js');
              const opts = { silent: true, stdio: [1, 2, 3, 'ipc'] };
              child = ps.fork(file, {}, opts);
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
              name: ({ context }) => {
                const pattern = /[\\/]node_modules[\\/](.*?)([\\/]|$)/;
                const [, name] = context.match(pattern);
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
                  fiber: Fiber,
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
      new CssPlugin({
        filename: 'css/[name].[contenthash].css',
        esModule: true,
        ignoreOrder: true,
      }),
      ...when(isDevServer, [
        new FriendlyErrorsPlugin({
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
        new CopyWebpackPlugin({
          patterns: [
            {
              from: publicPath,
              to: outputPath,
            },
          ],
        }),
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

module.exports = { createConfig };
