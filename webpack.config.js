const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const isDev = process.env.NODE_ENV === 'development';

const isWebTarget = process.env.WEB_TARGET === 'web';

const createRendererConfig = () => {
  const outputPath = isWebTarget
    ? path.resolve(__dirname, 'dist/web')
    : path.resolve(__dirname, 'dist');

  return {
    mode: isDev ? 'development' : 'production',
    entry: './src/renderer/index.tsx',
    target: isWebTarget ? 'web' : 'electron-renderer',
    devtool: isDev ? 'source-map' : false,
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
        {
          test: /\.(png|jpe?g|gif|svg)$/i,
          type: 'asset/resource',
        },
      ],
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
      alias: Object.assign(
        {
          '@': path.resolve(__dirname, 'src'),
        },
        isWebTarget
          ? {
              electron: false,
              'electron-store': false,
              'electron-updater': false,
              'node-forge': false,
              'node-rsa': false,
            }
          : {}
      ),
    },
    output: {
      filename: isWebTarget
        ? 'static/js/renderer.[contenthash].js'
        : 'renderer.[contenthash].js',
      chunkFilename: isWebTarget
        ? 'static/js/[name].[contenthash].js'
        : 'chunks/[name].[contenthash].js',
      path: outputPath,
      publicPath: isWebTarget ? '/' : './',
      clean: true,
      globalObject: 'globalThis',
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './src/renderer/index.html',
        filename: 'index.html',
      }),
    ],
   optimization: {
      splitChunks: isWebTarget
        ? {
            chunks: 'all',
            cacheGroups: {
              vendor: {
                test: /[\\/]node_modules[\\/]/,
                name: 'vendors',
                chunks: 'all',
              },
            },
          }
        : false,
      runtimeChunk: isWebTarget ? 'single' : false,
    },
    devServer: {
      port: 3000,
      hot: true,
      historyApiFallback: true,
      static: {
        directory: outputPath,
      },
    },
  };
};

const rendererConfig = createRendererConfig();

const mainConfig = {
  mode: isDev ? 'development' : 'production',
  entry: './src/main/main.ts',
  target: 'electron-main',
  devtool: isDev ? 'source-map' : false,
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
    clean: false,
  },
  node: {
    __dirname: false,
    __filename: false,
  },
};

const preloadConfig = {
  mode: isDev ? 'development' : 'production',
  entry: './src/main/preload.ts',
  target: 'electron-preload',
  devtool: isDev ? 'source-map' : false,
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  output: {
    filename: 'preload.js',
    path: path.resolve(__dirname, 'dist'),
    clean: false,
  },
  node: {
    __dirname: false,
    __filename: false,
  },
};

module.exports = (env, argv) => {
  if (isWebTarget) {
    return rendererConfig;
  }

  if (process.env.TARGET === 'main') {
    return mainConfig;
  }

  if (process.env.TARGET === 'preload') {
    return preloadConfig;
  }

  return [rendererConfig, mainConfig, preloadConfig];
};
