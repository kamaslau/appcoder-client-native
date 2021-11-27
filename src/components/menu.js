/**
 * 应用程序菜单栏
 *
 * https://www.electronjs.org/docs/api/menu
 * https://www.electronjs.org/docs/api/menu-item
 */

const path = require('path')
const { BrowserWindow, Menu } = require('electron')
const openAboutWindow = require('about-window').default

const windowOpt = {
  width: 800,
  height: 600,
  titleBarStyle: 'hidden',
  show: false,
  darkTheme: true,
  autoHideMenuBar: true,
  backgroundColor: '#121315',
  webPreferences: {
    nodeIntegration: true,
    webSecurity: false
  }
}

const appDir = path.resolve(__dirname, '..') // 应用程序根路径
// console.log('menu.js->appDir: ', appDir)

// 菜单栏配置
const template = [
  {
    label: '文件',
    submenu: [
      {
        label: '关于',
        accelerator: 'F1',
        click: () => {
          openAboutWindow({
            icon_path: path.join(appDir, '/assets/images/logo.png'),
            use_version_info: false
          })
        }
      },
      { type: 'separator' },
      { label: '退出', role: 'quit' }
    ]
  },
  {
    label: '编辑',
    submenu: [
      { label: '复制', role: 'copy' },
      { label: '剪切', role: 'cut' },
      { label: '粘贴', role: 'paste' }
    ]
  },
  {
    label: '窗口',
    submenu: [
      { label: '原始尺寸', role: 'resetzoom' },
      { label: '放大（10%）', role: 'zoomin' },
      { label: '缩小（10%）', role: 'zoomout' },
      { label: '最小化', role: 'minimize' },
      { label: '关闭', role: 'close' },
      { label: '全屏/还原', role: 'togglefullscreen' },
      { type: 'separator' },
      { label: '刷新', role: 'reload' },
      { label: '强制刷新（忽略缓存）', role: 'forcereload' },
      { type: 'separator' },
      {
        role: 'toggleDevTools',
        label: '调试面板',
        accelerator: 'F12'
      }
    ]
  }
]

// 构建菜单栏内容
const menuContent = Menu.buildFromTemplate(template)

/**
 * 主方法
 *
 * @returns void
 */
const main = () => Menu.setApplicationMenu(menuContent)

module.exports = main
