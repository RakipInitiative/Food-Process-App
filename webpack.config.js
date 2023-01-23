let path = require('path');
let webpack = require('webpack');
let minimist = require('minimist');

let production = (function(prod) {
    let cliParams = minimist(process.argv.slice(2));
    prod = cliParams.production || cliParams.prod || cliParams.p || process.env.NODE_ENV === 'production' || false;
    return prod;
})({});

let entry = ['./src/js/index.jsx'];
!production && entry.push('webpack-dev-server/client?http://localhost:8080');

const HtmlWebpackPlugin = require("html-webpack-plugin")

module.exports = {
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'development' ,
    entry: {
        bundle: path.resolve(__dirname, 'src/js/index.jsx')
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].[contenthash].js' ,
        assetModuleFilename: '[name][ext]',
        clean: true,
    },
    devServer:{
        static: {
            directory: path.resolve(__dirname, 'dist')
        },
        open: true,
        hot: true,
        compress: true,
        historyApiFallback: true
    },
    devtool: 'source-map',
    module: {
        rules: [
            {
                test: /\.jsx?$/,
                exclude: /(node_modules|bower_components)/,
                use: [
                        { 
                            loader: 'babel-loader',
                            options: {
                                presets: ['@babel/preset-env']
                            },
                        }
                ]
            },
            {
                test: /\.scss$/,
                use: [
                    'style-loader', 
                    { 
                        loader: "css-loader", 
                        options: { 
                            sourceMap: true 
                        } 
                    },
                    { 
                        loader: "postcss-loader", 
                        options: { 
                            sourceMap: true,
                            postcssOptions: {
                                plugins: [
                                  [
                                    "autoprefixer",
                                    {

                                    }
                                  ],
                                ],
                              },
                        } 
                    },
                    { 
                        loader: "sass-loader", 
                        options: { 
                            sourceMap: true,
                            sassOptions: {
                                includePaths: [
                                    'src/scss',
                                    'src/scss/imports',
                                    'node_modules'
                                ]
                            }
                        } 
                    },
            ],
            },
            {
                test: /\.css$/,
                use: [
                    'style-loader', 
                    { 
                        loader: "css-loader", 
                        options: { 
                            sourceMap: true 
                        } 
                    }
            ],
            },
            {
                test: /\.html$/i,
                loader: 'html-loader',
                options: {
                    esModule: false,
                }
            },
            {
                test: /\.woff(\?v=\d+\.\d+\.\d+)?$/,
                use: [
                    {
                        loader: 'url-loader',
                        options :{
                           limit:10000,
                           mimetype:"application/font-woff",
                           esModule: false,
                        },
                    }
                ],
            },
            {
                test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/,
                use: [
                    {
                        loader: 'url-loader',
                        options :{
                           limit:10000,
                           mimetype:"application/font-woff",
                           esModule: false,
                        },
                    }
                ],
            },
            {
                test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/,
                use: [
                    {
                        loader: 'url-loader',
                        options :{
                           limit:10000,
                           mimetype:"application/octet-stream",
                           esModule: false,
                        },
                    }
                ],
            },
            {
                test: /\.eot(\?v=\d+\.\d+\.\d+)?$/,
                use: [
                    {
                      loader: 'file-loader',
                      options: {
                        esModule: false,
                      },
                    },
                  ],
            },
            {
                test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
                type: 'asset/resource',
            },
            {
                test: /\.(png|jpg|jpeg)$/i,
                type: 'asset/resource',
            },
            {
                test: /\.(eot|woff|woff2|ttf)$/i,
                type: 'asset/resource',
                generator: {
                    filename: '[name][ext][query]'
                }
            },
            {
                test: /\.json$/,
                type: 'json',
            },
            {
                test: /\.csv$/,
                use: [
                    {
                        loader: "csv-loader",
                        options: {
                            dynamicTyping: true,
                            header: true,
                            skipEmptyLines: true
                          }
                    }
                ],
            },
            {   
                test: /\.adoc$/, 
                use: [
                    {
                        loader: "html-loader",
                        options: {
                            interpolate: 'require',
                            esModule: false,
                         }
                    },
                    {
                        loader: "asciidoctor-loader",
                        options: {
                            attributes: 'showtitle'
                        }
                    }
                ]
            }
        ]
    },
    plugins: [
        new webpack.NoEmitOnErrorsPlugin(),
        new HtmlWebpackPlugin({
            template: 'index.html',
            filename:'index.html',
            inject: 'body'
        })
    ]
};