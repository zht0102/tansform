const type = require("@babel/types");
const traverse = require("@babel/traverse").default;
const parser = require("@babel/parser");
const generator = require("@babel/generator").default;
const fs = require("fs");
const path = require("path");

const ignoreExp = /^constructor$|^render$|^component(Did|Will)*/;

function transform(filePath) {
	const content = fs.readFileSync(path.resolve(filePath), "utf-8");
	// console.log("content", content);
	try {
		const vast = parser.parse(content, {
			sourceType: "module",
			plugins: ["classProperties", "jsx", "decorators-legacy"],
		});
		// console.log("vast", vast);


		traverse(vast, {
			ClassBody(classPath) {

				classPath.traverse({
					// ClassMethod(funcPath) {
					// 	console.log({funcPath});
					// },
					ClassMethod(methodPath) {

						const key = methodPath.node.key.name;

						if (key && !ignoreExp.test(key)) {
							const isAsync = methodPath.node.async;
							methodPath.replaceWith(
								type.assignmentExpression(
									"=",
									type.identifier(key),
									type.arrowFunctionExpression(methodPath.node.params, methodPath.node.body, isAsync),
								),
							);
						}
					},
				});
			},
		});
		const code = generator(vast).code;
		fs.writeFileSync(filePath, [code]);
		console.log("success!");
	} catch (err) {
		console.log(err);
	}
}

function mapDir(dir, callback, finish) {
	fs.readdir(dir, function (err, files) {
		if (err) {
			console.error(err);
			return;
		}
		files.forEach((filename, index) => {
			let pathname = path.join(dir, filename);

			fs.stat(pathname, (err, stats) => { // 读取文件信息
				if (err) {
					console.log("获取文件stats失败");
					return;
				}
				if (stats.isDirectory()) {
					mapDir(pathname, callback, finish);
				} else if (stats.isFile()) {
					if ([".js"].includes(path.extname(pathname))) {  // 处理 目录下的 js 文件
						// console.log("js pathname", pathname);
						callback && callback(pathname, "js");
					}

					if ([".scss"].includes(path.extname(pathname))) {  // 处理 目录下的 scss 文件
						callback && callback(pathname, "scss");
					}

				}
			});

			if (index === files.length - 1) {
				finish && finish();
			}
		});
	});
}


function main(argv) {
	let filePath;
	if (!argv[2]) {
		filePath = path.resolve(process.env.INIT_CWD);
		mapDir(filePath,
			function (file, type) {
				// 读取文件后的处理
				console.log("TCL: file", file);
				console.log("type", type);
				switch (type) {
					case "js":
						transform(file);
						break;
					case "scss":
						writeScssFile(file);
						break;
				}

			},
			function () {
				// console.log('xxx文件目录遍历完了')
			},
		);
	} else {
		filePath = path.resolve(process.env.INIT_CWD, argv[2]);
		if ([".js"].includes(path.extname(filePath))) {  // 处理 目录下的 js 文件
			transform(filePath);
		}

		if ([".scss"].includes(path.extname(filePath))) {  // 处理 目录下的 scss 文件
			writeScssFile(filePath);
		}

	}
}

function writeScssFile(pathname) {

	try {
		const data = fs.readFileSync(pathname);
		const strIndex = data.indexOf("@import '@styles/common.scss'");
		if (strIndex !== -1) {
			return;
		}
		const importBuffer = new Buffer("@import '@styles/common.scss';");

		const newBuffer = importBuffer + data;

		fs.open(pathname, "a", function (err, fd) {
			if (err) {
				return console.error(err);
			}
			console.log("文件打开成功！", fd);
			fs.write(fd, newBuffer, 0, function (err) {
				if (err) {
					console.log(err);
				}
				console.log("文件write成功！");
			});
			// 关闭文件
			fs.close(fd, function (err) {
				if (err) {
					console.log(err);
				}
				console.log("文件关闭成功！");
			});
		});
	}
	catch (e) {

	}

}

main(process.argv);
