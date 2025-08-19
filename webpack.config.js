const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const isDev = process.env.NODE_ENV === 'development';

const rendererConfig = {
  mode: isDev ? 'development' : 'production',
  entry: './src/renderer/index.tsx',
  target: 'electron-renderer',
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
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  output: {
    filename: 'renderer.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/renderer/index.html',
      filename: 'index.html',
    }),
  ],
  devServer: {
    port: 3000,
    hot: true,
    historyApiFallback: true,
  },
};

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
  if (process.env.TARGET === 'main') {
    return mainConfig;
  } else if (process.env.TARGET === 'preload') {
    return preloadConfig;
  } else {
    return [rendererConfig, mainConfig, preloadConfig];
  }
};