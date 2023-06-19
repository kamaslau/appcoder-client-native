/**
 * IoC
 */
const { clipboard, shell, ipcRenderer } = require("electron");
const fetch = require("node-fetch");
const fs = require("fs-extra");
const JSZip = require("jszip"); // https://stuk.github.io/jszip/documentation/examples.htmls
const os = require("node:os");
const path = require("node:path");
const remote = require("@electron/remote");
const Historit = require("../../utils/historit");

const isDev = process.env.NODE_ENV === "development";
console.log("isDev: ", isDev);

/**
 * 应用路径词典
 *
 * https://www.electronjs.org/docs/latest/api/app#appgetpathname
 */
const appPathDict = {
  config: remote.app.getPath("userData"), // 本地安装路径
  data: path.join(remote.app.getPath("appData"), "com.kamaslau.AppCoder"), // 本地配置路径
  desktop: remote.app.getPath("desktop"), // 桌面文件夹路径
  documents: remote.app.getPath("documents"), // 用户文档文件夹路径
  downloads: remote.app.getPath("downloads"), // 下载文件夹路径
  recent: os.platform() === "win32" ? remote.app.getPath("recent") : null, // 【仅Windows】“最近”文件夹路径
  root: path.join(__dirname, "../../"), // 根路径；即app.js所在路径
  libs: path.join(__dirname, "../../libs"), // 第三方库
  page: path.join(__dirname, "../../page"), // 页面；重构时可以此作为前端框架的组件目录
  static: path.join(__dirname, "../../static"), // 静态资源（图片、样式、字体、模板文件等）
};
// console.log('appPathDict: ', appPathDict)

// 应用主配置文件
const appFile = path.join(appPathDict.data, "config.json"); // 生成配置文件

// 检查文件是否存在，若否则迭代创建文件（含路径）
const touchFile = (filePath) => {
  try {
    fs.ensureFileSync(filePath);
  } catch (error) {
    console.error("touchConfig error: ", error);
  }
};

/**
 * 替换内容中的占位字符串为实际值
 *
 * @param {string} context 内容
 * @param {string} searchValue 占位内容
 * @param {string} replaceValue 目标值
 */
const replaceMatchedString = (context, searchValue, replaceValue) => {
  // console.log('replaceMatchedString: ', context, searchValue, replaceValue)

  let result = "";

  try {
    result = context.replaceAll(searchValue, replaceValue);
  } catch (error) {
    console.error(error);
  }

  return result;
};

/**
 * 读取目标文件夹下文件列表
 *
 * @param {string} targetDir 目标本地文件夹路径
 * @returns 所有文件的本地路径[]
 */
const listFilesInDir = async (targetDir = null) => {
  // console.log('listFilesInDir: ', targetDir)

  if (targetDir === null) return;

  // Fetch temp demo list
  let result = [];
  try {
    result = await fs
      .readdir(targetDir)
      .then(
        // filter out hidden files that might interfere supposed usage, such as .DS_Store (posibly resides in local macOS dev environments)
        (list) => list.filter((item) => !/(^|\/)\.[^/.]/g.test(item))
      )
      .then(
        // cancat path root to sole file names
        (list) => list.map((item) => path.join(targetDir, item))
      );
  } catch (error) {
    console.error("listFilesInDir error: ", error);
  }
  // console.log('result: ', result)

  return result;
};

// 遍历并处理路径
const processPath = async (
  rootPath,
  fileOp = async () => {},
  dirOp = async () => {}
) => {
  // console.log('processPath: ', rootPath, typeof fileOp, typeof dirOp)

  // 获取当前路径下的所有文件
  const paths = (await listFilesInDir(rootPath)) ?? [];

  if (paths.length === 0) return;

  try {
    for (const path of paths) {
      const pathState = fs.lstatSync(path);

      if (pathState.isDirectory()) {
        // 继续遍历目录
        // console.log(`${path} is a directory`)

        if (typeof dirOp === "function") await dirOp(path);

        await processPath(path, fileOp, dirOp); // 迭代子目录
      } else if (pathState.isFile()) {
        // 处理文件
        // console.log(`${path} is a file`)

        if (typeof fileOp === "function") await fileOp(path);
      }
    }
  } catch (error) {
    console.error("processPath error: ", error);
  }
};

/**
 * 打包路径
 */
const packPath = async (sourcePath, targetPath) => {
  console.log(`packPath: ${sourcePath} -> ${targetPath}`);

  if (!sourcePath || !sourcePath) return;

  const zip = new JSZip();
  // zip.file('ziptest.txt', 'zip content') // DEMO only

  // 文件操作
  const fileOp = async (filePath) => {
    // console.log('create zip file item')

    // 将待克隆文件相对于目标目录的路径增量部分，作为目标路径的一部分，以保持文件目录结构
    const relativePath = filePath.substring(sourcePath.length).substring(1); // 移除开头的冗余"/"字符

    // 读取当前文件内容
    const pageContent = await fs.readFile(filePath, "utf8");

    // 将文件内容添加到zip实例
    zip.file(relativePath, pageContent);
    console.log("zip is now: ", zip);
  };

  // 迭代处理根目录下的路径
  await processPath(sourcePath, fileOp);

  // 在内存中生成zip文件
  const zipFileContent = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
  });
  // console.log(zip.files)

  // 写入新文件到目标路径
  const targetFilePath = `${targetPath}/${path.basename(
    sourcePath
  )}_clone_packed.zip`;

  try {
    fs.ensureFile(targetFilePath)
      .then(() => {
        fs.writeFile(targetFilePath, zipFileContent);
      })
      .then(() => {
        console.log("zip file path is targetFilePath: ", targetFilePath);
        shell.openPath(targetPath); // 在文件管理器中打开目标路径
      });
  } catch (error) {
    console.error(error);
  }
};

/**
 * 克隆路径
 */
const clonePath = async (
  sourcePath = null,
  targetPath = null,
  renameFile = true,
  folderName = "",
  payload = null
) => {
  console.log(`clonePath: ${sourcePath} -> ${targetPath}`, payload);

  if (!sourcePath || !sourcePath) return;

  // 文件操作
  const fileOp = async (filePath) => {
    const fileExtname = path.extname(filePath);

    // 将待克隆文件相对于目标目录的路径增量部分，作为目标路径的一部分，以保持文件目录结构
    const relativePath = filePath.substring(sourcePath.length);
    let targetFilePath = path.join(targetPath, folderName, relativePath);

    // 若不以文件夹进行分组，则需应用业务名称为文件名
    if (renameFile === true) {
      targetFilePath = replaceMatchedString(
        targetFilePath,
        path.basename(targetFilePath, fileExtname),
        payload.name
      );
    }
    console.log("targetFilePath: ", targetFilePath);

    if (payload === null) {
      // 创建镜像
      console.log("create mirror");

      try {
        fs.copy(filePath, targetFilePath);
      } catch (error) {
        console.error(error);
      }
    } else {
      // 创建新文件
      console.log("create product");

      // 读取当前文件内容为模板
      let pageContent = await fs.readFile(filePath, "utf8");

      // 处理特定后缀名的文件
      const supportedExtnames = [
        "html",
        "js",
        "json",
        "php",
        "ts",
        "text",
        "vue",
        "wxml",
        "wxss",
      ].map((item) => "." + item);
      if (supportedExtnames.includes(fileExtname)) {
        // 替换模板中的变量标识（[[变量名]]）为实际值
        Object.keys(payload).forEach((name) => {
          console.log("try mapping ", name);
          if (!payload[name]) return;

          pageContent = replaceMatchedString(
            pageContent,
            `[[${name}]]`,
            payload[name]
          );
        });
      } else {
        console.warn(`${fileExtname} files are not supported now.`);
      }

      // console.log('pageContent: ', pageContent)

      // 创建并写入文件
      try {
        fs.ensureFile(targetFilePath).then(() => {
          fs.writeFile(targetFilePath, pageContent);
        });
      } catch (error) {
        console.error(error);
      }
    }
  };

  // 迭代处理根目录下的路径
  await processPath(sourcePath, fileOp);

  shell.openPath(targetPath); // 在文件管理器中打开目标路径
};

/** 拷贝文字内容 */
const copyText = (content) => {
  try {
    clipboard.writeText(content);
    console.log("text copied: ", clipboard.readText());
  } catch (error) {
    console.error("copyText error: ", error);
  }
};

// 检查配置文件是否存在，若否则迭代创建文件（含路径），一般为初次启动使用
touchFile(appFile);

// 初始化历史记录类
const historyKeys = ["path", "url"];
const historyFileName = "history.json";
const historyFilePath = path.join(appPathDict.data, historyFileName);
const historit = new Historit(historyFilePath, historyKeys);

/* services/index.js */
