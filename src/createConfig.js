const path = require('path');
const ps = require('child_process');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { DefinePlugin, HashedModuleIdsPlugin, optimize } = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const CssPlugin = require('mini-css-extract-plugin');
const externals = require('webpack-node-externals');
const Fiber = require('fibers');
const sass = require('sass');
const CompressionPlugin = require('compression-webpack-plugin');
const {
  TsConfigPathsPlugin,
  CheckerPlugin,
} = require('awesome-typescript-loader');
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const HashPlugin = require('hash-webpack-plugin');
const FriendlyErrorsPlugin = require('friendly-errors-webpack-plugin');
const LoadablePlugin = require('@loadable/webpack-plugin');

const {
  stringifyEnv,
  getFolder,
  filterEnv,
  findFile,
  readEnv,
  relativeGlob,
} = require('./helpers');

const { LimitChunkCountPlugin } = optimize;

/**
 * Создает экземпляр конфигурации webpack.
 * @param {Object} _env Коллекция переменных окружения, заданных через webpack.
 * @param {Object} args Коллекция флагов коммандной строки.
 * @param {Object} options Коллекция настроек конфигурации.
 */
const createConfig = (_env, args, options = {}) => {
  const mode = process.env.NODE_ENV || 'development';
  const isDevelopment = mode === 'development';

  const target = args.target || 'web';
  const isServer = target === 'node';
  const isClient = target === 'web';

  const isDevServer = process.argv.some(
    (item) => item.indexOf('webpack-dev-server') >= 0
  );

  const defaultOptions = {
    rootPath: process.cwd(),
    publicPath: './public',
    outputPath: './build',
    sourcePath: './src',
    entry: isClient ? 'index' : 'server/index',
    outputFiles: 'files',
    outputHtml: 'index.html',
    outputCss: 'css/[name].css?[contenthash]',
    outputJs: isClient ? 'js/[name].js?[contenthash]' : 'server.js',
    proxy: {},
    port: 8000,
    server: {},
    client: {},
  };

  const opts = {
    ...defaultOptions,
    ...options,
    ...(isServer ? options.server || {} : {}),
    ...(isClient ? options.client || {} : {}),
  };

  const { rootPath: context } = opts;

  const fileEnv = {
    ...readEnv(path.resolve(context, '.env')),
    ...readEnv(path.resolve(context, '.env.local')),
    ...readEnv(path.resolve(context, `.env.${mode}`)),
    ...readEnv(path.resolve(context, `.env.${mode}.local`)),
  };

  const systemEnv = filterEnv(process.env);

  const isPublic = opts.publicPath !== false;

  const tsConfigPath = path.resolve(context, 'tsconfig.json');
  const modulesPath = path.resolve(context, 'node_modules');
  const cachePath = path.resolve(modulesPath, '.cache');
  const sourcePath = path.resolve(context, opts.sourcePath);
  const outputPath = path.resolve(context, opts.outputPath);
  const publicPath = isPublic
    ? path.resolve(context, opts.publicPath)
    : undefined;

  const entryExtensions = ['.tsx', '.ts', '.jsx', '.js', '.json'];
  const entry = findFile(sourcePath, entryExtensions, opts.entry);

  const templateExtensions = ['.html'];
  const template = findFile(sourcePath, templateExtensions, opts.entry);
  const isTemplate = template != null;

  const port = Number(args.port) || opts.port;

  const env = {
    ...fileEnv,
    ...systemEnv,
    NODE_ENV: mode,
    APP_TARGET: target,
    APP_FOLDER: outputPath,
    APP_LISTEN: port,
  };

  const { outputFiles, outputHtml, outputCss, outputJs, proxy } = opts;

  return {
    context,
    target,
    mode,
    entry: { main: entry },
    output: {
      filename: outputJs,
      path: outputPath,
      publicPath: '/',
      ...(isClient
        ? {
            chunkFilename: `${getFolder(outputJs)}[id].js?[contenthash]`,
          }
        : {}),
      ...(isServer
        ? {
            libraryTarget: 'commonjs2',
            library: 'main',
          }
        : {}),
    },
    externals: isServer ? [externals()] : undefined,
    stats: { children: false },
    devtool: isDevelopment && isClient ? 'source-map' : false,
    node: isClient
      ? undefined
      : {
          __dirname: false,
          __filename: false,
          global: false,
        },
    devServer: {
      proxy,
      quiet: true,
      contentBase: isPublic ? publicPath : false,
      historyApiFallback: true,
      host: 'localhost',
      port: isClient ? port : port + 1,
      writeToDisk: true,
      ...(isServer
        ? {
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

                const file = path.resolve(outputPath, outputJs);
                const opts = { silent: true, stdio: [1, 2, 3, 'ipc'] };
                child = ps.fork(file, {}, opts);
              });
            },
          }
        : {}),
    },
    resolve: {
      extensions: entryExtensions,
      modules: [sourcePath, 'node_modules'],
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
      ...(isClient
        ? {
            splitChunks: {
              automaticNameDelimiter: '-',
              chunks: 'all',
              cacheGroups: {
                vendors: {
                  test: /[\\/]node_modules[\\/]/,
                  enforce: true,
                },
              },
            },
          }
        : {}),
    },
    module: {
      rules: [
        {
          test: /.*$/,
          include: sourcePath,
          oneOf: [
            {
              test: /\.tsx?$/,
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
                      relativeGlob(
                        context,
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
              use: [
                {
                  loader: 'babel-loader',
                  options: {},
                },
              ],
            },
            {
              test: /\.json$/,
              use: [],
            },
            {
              test: /\.html$/,
              use: [],
            },
            {
              test: /\.s[ac]ss$/,
              sideEffects: true,
              use: [
                ...(isClient
                  ? [
                      {
                        loader: CssPlugin.loader,
                        options: {
                          hmr: isDevServer,
                        },
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
                        ? '[name]_[local]_[hash:8]'
                        : '[hash:base64]',
                    },
                    onlyLocals: isServer,
                    esModule: true,
                  },
                },
                {
                  loader: 'resolve-url-loader',
                  options: {
                    root: sourcePath,
                    sourceMap: isDevelopment,
                  },
                },
                {
                  loader: 'postcss-loader',
                  options: {
                    sourceMap: true,
                  },
                },
                {
                  loader: 'sass-loader',
                  options: {
                    sourceMap: true,
                    implementation: sass,
                    sassOptions: {
                      fiber: Fiber,
                      includePaths: [sourcePath, modulesPath],
                    },
                  },
                },
              ],
            },
            {
              test: /\.css$/,
              sideEffects: true,
              use: [
                ...(isClient
                  ? [
                      {
                        loader: CssPlugin.loader,
                        options: {
                          hmr: isDevServer,
                        },
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
                        ? '[name]_[local]_[hash:8]'
                        : '[hash:base64]',
                    },
                    onlyLocals: isServer,
                    esModule: true,
                  },
                },
                {
                  loader: 'resolve-url-loader',
                  options: {
                    root: sourcePath,
                  },
                },
                {
                  loader: 'postcss-loader',
                  options: {
                    sourceMap: true,
                  },
                },
              ],
            },
            {
              use: [
                {
                  loader: 'file-loader',
                  options: {
                    outputPath: outputFiles,
                    emitFile: isClient,
                  },
                },
              ],
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
        filename: outputCss,
        ignoreOrder: true,
        esModule: true,
        ...(isClient
          ? {
              chunkFilename: `${getFolder(outputCss)}[id].css?[contenthash]`,
            }
          : {}),
      }),
      ...(isTemplate
        ? [
            new HtmlWebpackPlugin({
              template,
              filename: outputHtml,
              chunks: ['main'],
            }),
          ]
        : []),
      ...(isDevServer
        ? [
            new FriendlyErrorsPlugin({
              compilationSuccessInfo: {
                notes: [`Application is running at http://localhost:${port}\n`],
              },
            }),
          ]
        : []),
      ...(isClient
        ? [
            ...(isPublic
              ? [
                  new CopyWebpackPlugin({
                    patterns: [
                      {
                        from: publicPath,
                        to: outputPath,
                      },
                    ],
                  }),
                ]
              : []),
            new LoadablePlugin(),
            new HashPlugin({
              fileName: 'hash.txt',
              path: outputPath,
            }),
            new CompressionPlugin({ test: /\.(js|css)(\?.*)?$/ }),
          ]
        : []),
      ...(isServer
        ? [
            new LimitChunkCountPlugin({
              maxChunks: 1,
            }),
          ]
        : []),
    ],
  };
};

module.exports = { createConfig };
