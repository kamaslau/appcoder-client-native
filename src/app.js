// https://github.com/electron/windows-installer#handling-squirrel-events
if (require('electron-squirrel-startup')) return

/**
 * 环境配置
 * 
 * 载入，并应用env.json、package.json的相关配置项；由于env.json最后加载，所以可在其中对前序内容（若有重复项）进行覆盖。
 */
const mapEnv = (target = process.env) => {
  const _PACKAGE = require('../package.json')
  const _ENV = require('./env.json')
  // console.log('_PACKAGE: ', _PACKAGE)
  // console.log('_ENV: ', _ENV)

  Object.assign(
    target,
    process.env,
    {
      NODE_ENV: process.env.NODE_ENV ?? 'production',
      APP_NAME: _PACKAGE.productName,
      VERSION: _PACKAGE.version,
      DESCRIPTION: _PACKAGE.description,
    },
    _ENV,
  )

  // console.log('process.env: ', process.env)
}
mapEnv()

const isDev = process.env.NODE_ENV === 'development'
const {
  app,
  BrowserWindow,
  ipcMain,
  webContents
} = require('electron')

const remoteMain = require('@electron/remote/main')
const fs = require('fs-extra')
const path = require('path')
const windowStateKeeper = require('electron-window-state') // 记录并恢复窗口状态，如位置、尺寸等

const appPath = path.join(__dirname)
const pageRoot = path.join(appPath, 'app/pages/')

let launched = false // 是否已创建过窗口
const appMenu = require(appPath + '/components/menu.js') // 菜单栏构建方法
let main_window // 主窗口

// 创建窗口
const defaultWindow = {
  minWidth: 1336,
  minHeight: 768,
  backgroundColor: '#000',
  darkTheme: true,
  defaultEncoding: 'utf-8',
  defaultFontFamily: {
    sanserif:
      'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial'
  },
  icon: path.join(appPath, 'app/static/images/logo.png')
}
const createWindow = () => {
  const window_state = windowStateKeeper({
    defaultWidth: undefined,
    defaultHeight: undefined
  })

  main_window = new BrowserWindow({
    ...defaultWindow,
    show: false, // 首次加载时，默认不显示窗口，待渲染完成（ready-to-show 事件被触发）后显示

    width: window_state.width,
    height: window_state.height,
    x: window_state.x,
    y: window_state.y,
    webPreferences: {
      devTools: true,
      nodeIntegration: true,
      contextIsolation: false
      // preload: path.join(__dirname, "preload.js"),
    }
  })
  remoteMain.initialize()
  remoteMain.enable(main_window.webContents)

  // 开发模式
  if (isDev) main_window.webContents.openDevTools() // 主动调起开发者工具

  // 载入主视图；优先尝试PWA模式，若失败则尝试WebView，若再失败则显示错误页面。
  let loadLog = '' // 加载时错误日志
  const loadPWA = () => {
    try {
      main_window.loadFile(pageRoot + 'index/index.html')
      // throw new Error("If PWA fails...");
    } catch (error) {
      loadLog =
        'PWA has went south, let us try webview and god bless. ' +
        error +
        '\r\r'
      loadWebView()
    }
  }
  const loadWebView = () => {
    try {
      main_window.loadURL('https://www.appcoder.io')
      // throw new Error("If WebView also fails...");
    } catch (error) {
      loadLog +=
        'WebView is no good either, trigger catch-all page. ' + error + '\r\r'
      load500()
    }
  }
  const load500 = () => {
    try {
      main_loadFile(pageRoot + 'error/500.html')
      // throw new Error("If catch-all also fails...");
    } catch (error) {
      loadLog += 'Catch-all also fails, this is it.'
    }
  }

  // 主窗口加载内容
  loadPWA()
  if (loadLog !== '') {
    console.error(loadLog)
    loadLog = '' // reset
  }

  // 首次启动时，最大化窗口；否则重置窗口为上次关闭时的尺寸、位置
  if (!launched) {
    main_window.maximize()
    launched = true
  }
  window_state.manage(main_window)
}

app.on('ready', () => {
  // console.log('Electron is almost ready at ', new Date().toLocaleString())
  appMenu() // 状态栏菜单
})
app.whenReady().then(() => {
  // console.log('Electron is really ready at ', new Date().toLocaleString())

  createWindow()

  // 接收页面渲染完成通信
  ipcMain.on('pageOnload', (event, data) => {
    if (!data.page) return

    // 首页完成渲染后，显示窗口
    if (data.page === 'index') {
      console.log('index page onload')
      main_window.show()
    }
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })

  // 获取主窗口页面内容
  const wc = main_window.webContents
  // console.log("webContents: ", wc);

  // 拦截创建新窗口的行为
  wc.on('new-window', (event, url) => {
    // console.log('new-window event: ', event)
    event.preventDefault()
  })

  // 右键菜单
  wc.on('context-menu', (event, params) => {
    // console.log("context-menu: ", event);
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => (process.platform !== 'darwin') && app.quit())

// Error catching
process.on('uncaughtException', error => {
  // TODO Crash log
  // log.error(error.stack || JSON.stringify(error));
  app.exit()
})

/* app.js */
