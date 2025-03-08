const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: './src/index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'build'),
    publicPath: '/'
  },
  resolve: {
    alias: {
      'three': path.resolve('./node_modules/three')
    }
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
      },
      {
        test: /\.(glb|gltf)$/,
        type: 'asset/resource',
        generator: {
          filename: 'assets/models/[name][ext]'
        }
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: '2.5D Shooter Game',
      template: './src/index.html'
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'assets/models/', to: 'assets/models/' }
      ]
    })
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, './'),
      watch: true
    },
    compress: true,
    port: 9000,
    devMiddleware: {
      writeToDisk: true,
    }
  },
}; 