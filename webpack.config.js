const path = require('path');
const fs = require('fs');

const webpack = require('webpack');

const SRC_PATH = path.resolve(__dirname, 'src');

const DEV_SERVER_PORT = process.env.WEBPACK_DEV_PORT || 9000;

const IS_DEV_SERVER = path.basename(require.main.filename) === 'webpack-dev-server.js';
const PUBLIC_HOST = process.env.PUBLIC_HOST || 'localhost';
const IS_PLAYGROUND = process.env.PLAYGROUND === '1';

let entry = {
};

console.log(path.basename(require.main.filename));

if (IS_DEV_SERVER) {
	entry.main = path.resolve(__dirname, 'dev/index.js');
}

const MODE = IS_PLAYGROUND ? 'production' : (process.env.MODE || 'development');

let config = {
	mode: MODE,
	entry,
	output: (() => {
		let output = {
			filename: '[name]_[contenthash].js',
			path: path.resolve(__dirname, 'dist'),
		};

		if (MODE === 'development' || IS_DEV_SERVER) {
			output.filename = '[name].js';
			output.publicPath = 'http://' + PUBLIC_HOST + ':' + DEV_SERVER_PORT + '/';
		}

		return output;
	})(),

	resolve: {
		alias: {},
		extensions: ['.js'],
	},

	module: {
		rules: (() => {
			let rules = [];

			if (MODE === 'production') {
				// Use Babel only for production

				/*rules.push({
					test: /\.js$/,
					use: [{
						loader: 'babel-loader',
						options: {
							presets: [['@babel/preset-env', {
								targets: {
									'ie': 11
								},
								modules: false,
								loose: true,
							}]]
						}
					}],
				});*/
			}

			return rules;
		})()
	},

	plugins: (() => {
		let plugins = [];

		if (MODE === 'development') {
			plugins.push(new webpack.HotModuleReplacementPlugin());
		}

		return plugins;
	})(),

	devtool: MODE === 'production' ? (process.env.DEVTOOL || 'none') : undefined,

	devServer: {
		contentBase: path.resolve(__dirname, 'dist'),

		host: '0.0.0.0',
		port: DEV_SERVER_PORT,
		disableHostCheck: true,

		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
			'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization',
		},

		hotOnly: MODE === 'development',

		before: function(app, server) {
			let indexHtmlContent = fs.readFileSync(path.resolve(__dirname, 'dev/index.html'), { encoding: 'utf8' });
			indexHtmlContent = indexHtmlContent.replace('dist/main.js', 'http://localhost:' + DEV_SERVER_PORT + '/main.js');

			app.use((req, res, next) => {
				if (req.path !== '/' && req.path !== '/index.html') {
					next();
					return;
				}

				res.setHeader('Content-Type', 'text/html');

				res.end(indexHtmlContent);
			});
		},
	},
};

module.exports = config;
