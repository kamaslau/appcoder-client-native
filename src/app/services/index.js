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

// 检查配置文件是否存在，若否则迭代创建文件（含路径），一般为初次启动使用
const touchConfig = () => {
  try {
    fs.ensureFileSync(appFile)
  } catch (error) {
    console.error('touchConfig error: ', error)
  }
}

touchConfig()

/* services/index.js */
