/**
 * IoC
 */
const fs = require('fs-extra')
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
 */
const appPathDict = {
  config: remote.app.getPath('userData'), // 本地安装路径
  data: path.join(remote.app.getPath('appData'), 'com.kamaslau.AppCoder'), // 本地配置路径
  root: path.join(__dirname, '../../'), // 根路径；即app.js所在路径
  libs: path.join(__dirname, '../../libs'), // 第三方库
  page: path.join(__dirname, '../../page'), // 页面；重构时可以此作为前端框架的组件目录
  static: path.join(__dirname, '../../../static') // 静态资源（图片、样式、字体、模板文件等）
}

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
  // console.log('result: ', result)

  return result
}

/**
 * TODO 迭代创建路径下所有目录及文件的副本，并移动到目标路径
 */
const clonePath = async (
  sourcePath,
  targetPath
) => {
  // 获取当前路径下的所有文件
  const files = listFilesInDir(sourcePath)
  if (files.length === 0) return

  // 迭代创建路径下所有目录及文件的副本，并移动到目标路径
  try {
    files.forEach((file) => {
      // 文件名即为该文件的创建时间戳
      if (parseInt(file) < minTimestamp) fse.remove(path.join(paths.generateDir, dir, file)).catch(error => console.log('pruneTemp error on fse.remove: ', error))
    })
  } catch (error) {
    console.error(
      'clonePath error: ',
      error
    )
  }

}

// 检查配置文件是否存在，若否则迭代创建文件（含路径），一般为初次启动使用
touchFile(appFile)

/* services/index.js */
