const { default: axios } = require('axios')
const Vue = require('vue')
/**
 * 首页
 * ===
 */
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

// 渲染页面基本内容
const renderContent = () => {
  document.title = document.getElementById('app-name').innerText = document.getElementById('app-name').title = process.env.NAME
  document.getElementById('app-version').innerText = process.env.VERSION
}

window.onload = () => {
  console.log('page/index/index window.onload at ', new Date().toLocaleString())

  // 通知主进程已完成HTML、CSS加载
  if (ipcRenderer) ipcRenderer.send('pageOnload', { page: 'index' })

  renderContent()
}

/**
 * Vue 单页应用
 */
const App = {
  data () {
    return {
      // 路径
      sourcePath: isDev ? appPathDict[process.env.SOURCE_DIR] : window.localStorage.getItem('recentSourcePath'),
      sourcePathSample: appPathDict[process.env.SOURCE_DIR],
      targetPath: isDev ? appPathDict[process.env.TARGET_DIR] : window.localStorage.getItem('recentTargetPath'),
      targetPathSample: appPathDict[process.env.TARGET_DIR],

      // 业务
      bizItem: {
        code: '',
        name: '',
        nameLocale: '',
        parseTable: false,
        table: '',
        pk: ''
      },
      bizs: [],

      // 数据结构API
      api: {
        url: process.env.API_URL ?? ''
      },

      // 数据库
      canParseTable: true, // 是否允许解析数据表结构
      wrapInFolder: true, // 创建业务文件夹
      db: {
        url: 'mysql://root:123456@localhost:3306/xyz',
        db: ''
      }
    }
  },

  created () {
    // DEV only
    isDev && this.bizs.push({
      code: 'USR',
      name: 'user',
      nameLocale: '用户',
      parseTable: true,
      table: 'user',
      pk: 'userID'
    })
  },

  methods: {
    // 选择源路径
    async pickSource () {
      console.log('pickSource: ')

      this.sourcePath = await pickPath() ?? this.sourcePath

      window.localStorage.setItem('recentSourcePath', this.sourcePath)
    },

    // 选择目标路径
    async pickTarget () {
      console.log('pickTarget: ')

      this.targetPath = await pickPath() ?? this.targetPath

      window.localStorage.setItem('recentTargetPath', this.targetPath)
    },

    // 添加一组业务配置
    addBiz () {
      this.bizs.push({ ...this.bizItem })
    },

    // 转换业务编码为大写
    upperBizCode (index) {
      console.log('upperBizCode: ', this.bizs[index])

      this.bizs[index].code = this.bizs[index].code.toUpperCase()
    },

    // 填写默认值
    mapBizDefaults (index) {
      console.log('mapBizDefaults: ', this.bizs[index])

      this.bizs[index].table = this.bizs[index].name
      this.bizs[index].pk = this.bizs[index].name + '_id'
    },

    // 添加一组业务配置
    removeBiz (index) {
      this.bizs.splice(index, 1)
    },

    // 验证路径格式
    verifyPaths (sourcePath, targetPath, allowSelf = true) {
      let errorMessage = ''

      if (!sourcePath) errorMessage += '需指定源路径；'
      if (!targetPath) errorMessage += '需指定目标路径；'
      if (sourcePath === targetPath) {
        const message = '源路径与目标路径相同'

        if (allowSelf) {
          console.warn(message)
        } else {
          errorMessage += message
        }
      }

      return errorMessage
    },

    /**
     * 打包
     *
     * 直接创建压缩包到目标路径，不处理文件
     */
    async doPack () {
      console.log('doPack: ', this.sourcePath, this.targetPath)

      const errorMessage = this.verifyPaths(this.sourcePath, this.targetPath)
      if (errorMessage.length > 0) return window.alert(errorMessage)

      await packPath(this.sourcePath, this.targetPath)
    },

    /**
     * 克隆
     *
     * 直接创建文件拷贝到目标路径，不处理文件
     */
    async doClone () {
      console.log('doClone: ', this.sourcePath, this.targetPath)

      const errorMessage = this.verifyPaths(this.sourcePath, this.targetPath, false)
      if (errorMessage.length > 0) return window.alert(errorMessage)

      await clonePath(this.sourcePath, this.targetPath, this.wrapInFolder)
    },

    /**
     * 生成
     *
     * 使用源文件作为模板来生成新文件
     */
    async doGenerate () {
      console.log('doClone: ', this.sourcePath, this.targetPath)

      const errorMessage = this.verifyPaths(this.sourcePath, this.targetPath)
      if (errorMessage.length > 0) return window.alert(errorMessage)

      // 遍历业务配置项，生成相应页面，并装载到以业务名称为名的文件夹中
      for (const item of this.bizs) {
        const columnsInfo = await this.parseTable(item.name) ?? []
        item.columnsContent = this.composeContent(columnsInfo) ?? ''

        await clonePath(this.sourcePath, this.targetPath, this.wrapInFolder, item)
      }
    },

    /**
     * 解析数据表结构3
     *
     * @param {string} tableName 数据表名称
     */
    async parseTable (tableName) {
      console.log('parseTable: ', tableName)

      const apiURL = `${this.api.url}/${tableName}`

      let result = null

      try {
        result = await axios.get(apiURL).then(response => {
          if (response.status === 200) return response.data.data
        })
      } catch (error) {
        console.error(error)
      }

      console.log(result)

      return result
    },

    // 组装字段信息内容
    composeContent (items) {
      // console.log('composeContent: ', items)

      let result = ''

      const readOnlyNames = ['createdAt', 'updatedAt', 'deletedAt'] // 只读字段

      const formTemplate = '<input class="form-control" name="[[name]]" placeholder="[[placeholder]]" [[required]] />' // 表单模板

      for (const item of items) {
        // 跳过部分只读字段
        if (readOnlyNames.includes(item.COLUMN_NAME) || item.COLUMN_KEY === 'PRI') {
          console.log(`${item.COLUMN_NAME} is skipped`)
          continue
        }

        result += formTemplate.replaceAll('[[name]]', item.COLUMN_NAME)
          .replaceAll('[[required]]', (item.IS_NULLABLE === 'YES' ? 'required' : ''))
          .replaceAll('[[placeholder]]', (item.COLUMN_COMMENT.length > 0 ? item.COLUMN_COMMENT : '')) + '\r\n'
      }

      console.log(result)

      return result
    }
  }

}
Vue.createApp(App).mount('#app')
