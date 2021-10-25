/**
 * IoC
 */
const fs = require('fs-extra')
const os = require('os')
const path = require('path')
const { shell, ipcRenderer } = require('electron')
const remote = require('@electron/remote')

const isDev = process.env.NODE_ENV === 'development'
console.log('isDev: ', isDev)

// 软件包信息，即主进程中解析出package.json数据
// if (isDev) {
//   const packageInfo = remote.getGlobal('packageInfo')
//   console.log('packageInfo: ', packageInfo)
// }

/**
 * 应用路径词典
 *
 * https://www.electronjs.org/docs/latest/api/app#appgetpathname
 */
const appPathDict = {
  config: remote.app.getPath('userData'), // 本地安装路径
  data: path.join(remote.app.getPath('appData'), 'com.kamaslau.AppCoder'), // 本地配置路径
  desktop: remote.app.getPath('desktop'), // 桌面文件夹路径
  documents: remote.app.getPath('documents'), // 用户文档文件夹路径
  downloads: remote.app.getPath('downloads'), // 下载文件夹路径
  recent: os.platform() === 'win32' ? remote.app.getPath('recent') : 'N/A', // 【仅Windows】“最近”文件夹路径
  root: path.join(__dirname, '../../'), // 根路径；即app.js所在路径
  libs: path.join(__dirname, '../../libs'), // 第三方库
  page: path.join(__dirname, '../../page'), // 页面；重构时可以此作为前端框架的组件目录
  static: path.join(__dirname, '../../../static') // 静态资源（图片、样式、字体、模板文件等）
}
console.log('appPathDict: ', appPathDict)

// 应用主配置文件
const appFile = path.join(appPathDict.data, 'config.json') // 生成配置文件

// 检查文件是否存在，若否则迭代创建文件（含路径）
const touchFile = (filePath) => {
  try {
    fs.ensureFileSync(filePath)
  } catch (error) {
    console.error('touchConfig error: ', error)
  }
}

/**
 * 读取目标文件夹下文件列表
 * @param targetDir 目标本地文件夹路径
 * @returns 所有文件的本地路径[]
 */
 const listFilesInDir = async (targetDir = null) => {
  console.log('listFilesInDir: ', targetDir)

  if (targetDir === null) return 

  // Fetch temp demo list
  let result = []
  try {
    result = await fs.readdir(targetDir).then(
      // filter out hidden files that might interfere supposed usage, such as .DS_Store (posibly resides in local macOS dev environments)
      list => list.filter(item => !/(^|\/)\.[^/.]/g.test(item))
    ).then(
      // cancat path root to sole file names
      list => list.map(item => `${targetDir}/${item}`)
    )
  } catch (error) {
    console.error('listFilesInDir error: ', error)
  }
  console.log('result: ', result)

  return result
}

// 遍历并处理路径
const processPath = async (rootPath, fileOp = null, dirOp = null) => {
  console.log('processPath: ', rootPath, typeof fileOp, typeof dirOp)

    // 获取当前路径下的所有文件
    const paths = await listFilesInDir(rootPath)
    if (paths.length === 0) return
  
  try {
    paths.forEach((path) => {
      const pathState = fs.lstatSync(path)

      if (pathState.isDirectory()) {
        // 继续遍历目录
        // console.log(`${path} is a directory`)

        if (typeof dirOp === 'function') dirOp(path)

        processPath(path, fileOp, dirOp) // 迭代子目录
      } else if (pathState.isFile()) {
        // 处理文件
        // console.log(`${path} is a file`)

        if (typeof fileOp === 'function') fileOp(path)
      }
    })
  } catch (error) {
    console.error('clonePath error: ', error)
  }
}

/**
 * 克隆路径
 */
const clonePath = async (
  sourcePath = null,
  targetPath = null
) => {
  console.log('clonePath: ', sourcePath, targetPath)

  if (!sourcePath || !sourcePath) return

  // 文件操作
  const fileOp = (filePath) => {
    // 将待克隆文件相对于目标目录的路径增量部分，作为目标路径的一部分，以保持文件目录结构
    const relativePath = filePath.substring(sourcePath.length)

    fs.copy(
      filePath,
      path.join(
        targetPath,
        relativePath
      )
    )
  }

  // 迭代处理根目录下的路径
  await processPath(sourcePath, fileOp)
}

// 检查配置文件是否存在，若否则迭代创建文件（含路径），一般为初次启动使用
touchFile(appFile)

/* services/index.js */
