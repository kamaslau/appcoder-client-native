const Vue = require('vue')
/**
 * 首页
 * ===
 */

/**
 * 数据
 */
// 路径
let sourcePath = isDev ? appPathDict[process.env.SOURCE_DIR] : ''
let targetPath = isDev ? appPathDict[process.env.TARGET_DIR] : ''
// 业务
const biz = {
  'class-code': null,
  'class-name': null,
  'class-name-locale': null
}
// 数据库
const db = {
  url: null, db: null, table: null, pk: null
}

// 选择源路径
const pickSource = async () => {
  console.log('pickSource: ')

  sourcePath = await pickPath()

  if (sourcePath !== null) setInput('source-path', sourcePath) // 更新字段值
}

// 选择目标路径
const pickTarget = async () => {
  console.log('pickTarget: ')

  targetPath = await pickPath()

  if (targetPath !== null) document.querySelector("input[name='target-path']").value = targetPath // 更新字段值
}

/**
 * 选择路径
 */
const pickPath = async () => {
  console.log('pickPath: ')

  let path = null

  await remote.dialog
    .showOpenDialog({
      title: '请指定源文件夹',
      buttonLabel: '选择文件夹',
      properties: ['openDirectory', 'createDirectory', 'promptToCreate'],
      message: '请指定源文件所在的目录；该目录下的所有文件将被克隆' // [macOS]显示在输入框上方
    })
    .then((result) => {
      if (!result.canceled) {
        path = result.filePaths[0]
      } else {
        console.warn('用户取消选择')
      }
    })
    .catch((error) => {
      console.error('pickPath: ', error)
    })

  console.log('path: ', path)
  return path
}

// 更新字段值
const setInput = (name, value = '') => {
  document.querySelector(`input[name='${name}']`).value = value
}

// 获取字段值
const getInput = (name) => document.querySelector(`input[name='${name}']`).value

// 渲染页面内容
const renderContent = () => {
  document.getElementById('app-name').innerText = document.getElementById('app-name').title = process.env.NAME
  document.getElementById('app-version').innerText = process.env.VERSION

  const dataMap = { 'source-path': sourcePath, 'target-path': targetPath }
  for (const name of Object.keys(dataMap)) setInput(name, dataMap[name])
}

// 绑定事件监听器
const bindEventListeners = () => {
  // document.getElementById('sample-source-path').innerText = appPathDict.documents
  // document.getElementById('target-source-path').innerText = appPathDict.desktop

  // document.getElementById('pick-source').addEventListener('click', async (event) => await pickSource())
  // document.getElementById('pick-target').addEventListener('click', async (event) => await pickTarget())

  // document.getElementById('do-pack').addEventListener('click', async (event) => await doPack())
  // document.getElementById('do-clone').addEventListener('click', async (event) => await doClone())
  // document.getElementById('do-generate').addEventListener('click', async (event) => await doGenerate())
}

window.onload = () => {
  console.log('page/index/index window.onload at ', new Date().toLocaleString())

  // 通知主进程已完成HTML、CSS加载
  if (ipcRenderer) ipcRenderer.send('pageOnload', { page: 'index' })

  renderContent()

  // bindEventListeners()
}

/**
 * Vue 单页应用
 */
const App = {
  data () {
    return {
      // 路径
      sourcePath: isDev ? appPathDict[process.env.SOURCE_DIR] : '',
      sourcePathSample: appPathDict[process.env.SOURCE_DIR],
      targetPath: isDev ? appPathDict[process.env.TARGET_DIR] : '',
      targetPathSample: appPathDict[process.env.TARGET_DIR],

      // 业务
      bizItem: {
        code: '',
        name: '',
        nameLocale: ''
      },
      bizs: [],

      // 数据库
      db: {
        url: 'mysql://root:123456@localhost:3306/xyz',
        db: '',
        table: '',
        pk: ''
      }
    }
  },

  methods: {
    // 选择源路径
    pickSource: async () => {
      console.log('pickSource: ')

      sourcePath = await pickPath()

      if (sourcePath !== null) setInput('source-path', sourcePath) // 更新字段值
    },

    // 选择目标路径
    pickTarget: async () => {
      console.log('pickTarget: ')

      targetPath = await pickPath()

      if (targetPath !== null) document.querySelector("input[name='target-path']").value = targetPath // 更新字段值
    },

    /**
     * 打包
     *
     * 直接创建压缩包到目标路径，不处理文件
     */
    doPack: async () => {
      console.log('doPack: ')

      if (!sourcePath || !sourcePath) window.alert('需要指定源&目标路径')

      await packPath(sourcePath, targetPath)
    },

    /**
     * 克隆
     *
     * 直接创建文件拷贝到目标路径，不处理文件
     */
    doClone: async () => {
      console.log('doClone: ')

      if (!sourcePath || !sourcePath) window.alert('需要指定源&目标路径')

      await clonePath(sourcePath, targetPath)
    },

    /**
     * 生成
     *
     * 使用源文件作为模板来生成新文件
     */
    doGenerate: async () => {
      console.log('doClone: ')

      if (!sourcePath || !sourcePath) window.alert('需要指定源&目标路径')

      Object.keys(biz).forEach(name => { biz[name] = getInput(name) })

      await clonePath(sourcePath, targetPath, biz)
    // const result = await clonePath(sourcePath, targetPath)
    // console.log(result)
    }
  },

}
Vue.createApp(App).mount('#app')
