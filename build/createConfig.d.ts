import { Compiler } from 'webpack';
import sass from 'sass';
import OptimizeCssAssetsPlugin from 'optimize-css-assets-webpack-plugin';
import TerserPlugin from 'terser-webpack-plugin';
/**
 * Коллекция переменных.
 */
declare type Collection = Record<string, string>;
/**
 * Создает конфигурацию webpack.
 * @param _env Коллекция переменных среды, объявленных через webpack.
 * @param args Коллекция аргументов командной строки.
 */
export declare const createConfig: (_env: Collection, args: Collection) => {
    resolve: {
        extensions: string[];
        modules: string[];
        plugins: import("awesome-typescript-loader/dist/paths-plugin").PathPlugin[];
    };
    optimization: {
        runtimeChunk: string;
        splitChunks: {
            chunks: string;
            maxInitialRequests: number;
            minSize: number;
            cacheGroups: {
                vendor: {
                    test: RegExp;
                    name: (module: any) => string;
                };
            };
        };
        usedExports: boolean;
        minimizer: (OptimizeCssAssetsPlugin | TerserPlugin)[];
    };
    module: {
        rules: ({
            test: RegExp;
            include: string;
            use: ({
                loader: string;
                options: {
                    silent?: undefined;
                    useBabel?: undefined;
                    babelCore?: undefined;
                    useCache?: undefined;
                    cacheDirectory?: undefined;
                    reportFiles?: undefined;
                    forceIsolatedModules?: undefined;
                };
            } | {
                loader: string;
                options: {
                    silent: boolean;
                    useBabel: boolean;
                    babelCore: string;
                    useCache: boolean;
                    cacheDirectory: string;
                    reportFiles: string[];
                    forceIsolatedModules: boolean;
                };
            })[];
            sideEffects?: undefined;
        } | {
            test: RegExp;
            include: string;
            sideEffects: boolean;
            use: ({
                loader: string;
                options: {
                    sourceMap?: undefined;
                    localsConvention?: undefined;
                    modules?: undefined;
                    onlyLocals?: undefined;
                    esModule?: undefined;
                    implementation?: undefined;
                    sassOptions?: undefined;
                };
            } | {
                loader: string;
                options: {
                    sourceMap: boolean;
                    localsConvention: string;
                    modules: {
                        localIdentName: string;
                    };
                    onlyLocals: boolean;
                    esModule: boolean;
                    implementation?: undefined;
                    sassOptions?: undefined;
                };
            } | {
                loader: string;
                options: {
                    sourceMap: boolean;
                    localsConvention?: undefined;
                    modules?: undefined;
                    onlyLocals?: undefined;
                    esModule?: undefined;
                    implementation?: undefined;
                    sassOptions?: undefined;
                };
            } | {
                loader: string;
                options: {
                    sourceMap: boolean;
                    implementation: typeof sass;
                    sassOptions: {
                        fiber: any;
                        includePaths: string[];
                    };
                    localsConvention?: undefined;
                    modules?: undefined;
                    onlyLocals?: undefined;
                    esModule?: undefined;
                };
            })[];
        } | {
            test: RegExp;
            include: string;
            use: {
                loader: string;
                options: {
                    outputPath: string;
                    emitFile: boolean;
                };
            }[];
            sideEffects?: undefined;
        })[];
    };
    plugins: any[];
    devServer: {
        before: (_app: any, _server: any, compiler: Compiler) => void;
        quiet: boolean;
        contentBase: string;
        historyApiFallback: boolean;
        host: string;
        port: number;
        writeToDisk: boolean;
        proxy: {};
    };
    target: string;
    mode: string;
    context: string;
    entry: (string | undefined)[];
    output: {
        libraryTarget: string;
        library: string;
        filename: string;
        path: string;
        publicPath: string;
    };
    externals: import("webpack").ExternalsFunctionElement[] | undefined;
    stats: {
        children: boolean;
    };
    devtool: string | undefined;
};
export {};
