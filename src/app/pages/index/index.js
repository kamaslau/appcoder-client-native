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
  document.title = document.getElementById('app-name').innerText = document.getElementById('app-name').title = process.env.APP_NAME
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
        pk: '',
        wrapInFolder: true
      },
      bizs: [],

      // 数据结构API
      api: {
        url: process.env.API_URL ?? ''
      },

      // 数据库
      canParseTable: true, // 是否允许解析数据表结构
      db: {
        url: 'mysql://root:123456@localhost:3306/xyz',
        db: ''
      },

      // 模板标签
      templateTags: {
        module: [
          { literal: '[[code]]', label: '业务编码' },
          { literal: '[[name]]', label: '业务名称' },
          { literal: '[[nameLocale]]', label: '业务本地化名称' },
          { literal: '[[table]]', label: '业务表名' },
          { literal: '[[pk]]', label: '业务表的主键名' }
        ],
        names: [
          { literal: '[[name]]', label: '字段名称' },
          { literal: '[[nameLocale]]', label: '字段本地化名称' },
          { literal: '[[namesForm]]', label: '表单型字段内容体' },
          { literal: '[[namesList]]', label: '列表型字段内容体' },
          { literal: '[[namesTable]]', label: '表格型字段内容体' }
        ]
      }
    }
  },

  created () {
    // DEV only
    isDev && this.bizs.push({
      ...this.bizItem,
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
     * 直接创建文件拷贝到目标路径，不处理文件/创建包装文件夹
     */
    async doClone () {
      console.log('doClone: ', this.sourcePath, this.targetPath)

      const errorMessage = this.verifyPaths(this.sourcePath, this.targetPath, false)
      if (errorMessage.length > 0) return window.alert(errorMessage)

      await clonePath(this.sourcePath, this.targetPath)
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
        // （可选）解析数据表以获取字段信息
        if (item.parseTable) {
          const columnsInfo = await this.parseTable(item.name) ?? []

          // 补充字段名称本地化信息
          for (const column of columnsInfo) {
            column.COLUMN_NAME_LOCALE = column.COLUMN_COMMENT.length > 0 ? this.parseNameLocaleFromComment(column.COLUMN_COMMENT) : ''
          }

          // 生成字段内容字符串
          item.contentForm = this.composeFormContent(columnsInfo) ?? ''
          item.contentList = this.composeListContent(columnsInfo) ?? ''
          item.contentTable = this.composeTableContent(columnsInfo) ?? ''
        }

        const folederName = item.wrapInFolder ? item.name : ''

        await clonePath(this.sourcePath, this.targetPath, folederName, item)
      }

      // 上提模板标签说明DOM到视野之内
      this.$refs.templateTagIntro.scrollIntoView({ behavior: 'smooth' })
    },

    /**
     * 解析数据表结构
     *
     * @param {string} tableName 数据表名称
     */
    async parseTable (tableName) {
      console.log('parseTable: ', tableName)

      const apiURL = `${this.api.url}/${tableName}`

      let result = null

      try {
        result = await fetch(apiURL).then(response => {
          console.log(response)

          if (response.status === 200) {
            return response.json().data
          } else {
            window.alert(response.json().message)
          }
        })
      } catch (error) {
        console.error(error)
      }

      console.log(result)

      return result
    },

    // 从字段备注中解析字段名
    parseNameLocaleFromComment (COLUMN_COMMENT) {
      return COLUMN_COMMENT.substring(0, COLUMN_COMMENT.indexOf('；'))
    },

    // 组装表单型内容
    composeFormContent (items) {
      // console.log('composeContent: ', items)

      let result = ''

      const readOnlyNames = ['createdAt', 'updatedAt', 'deletedAt'] // 只读字段

      const formTemplate = '<input class="form-control" name="[[name]]" placeholder="[[nameLocale]]" [[required]] />' + '\r\n' // 表单模板

      for (const item of items) {
        // 跳过部分只读字段
        if (readOnlyNames.includes(item.COLUMN_NAME) || item.COLUMN_KEY === 'PRI') {
          console.log(`${item.COLUMN_NAME} is skipped`)
          continue
        }

        result += formTemplate.replaceAll('[[name]]', item.COLUMN_NAME)
          .replaceAll('[[required]]', (item.IS_NULLABLE === 'YES' ? 'required' : ''))
          .replaceAll('[[nameLocale]]', item.COLUMN_NAME_LOCALE) + '\r\n'
      }

      console.log(result)

      return result
    },

    // 组装列表型内容
    composeListContent (items) {
      // console.log('composeContent: ', items)

      let result = ''

      const formTemplate = '<li title="[[nameLocale]]([[name]])">[[nameLocale]]: {{ [[name]] }}</li>' + '\r\n' // 列表模板

      for (const item of items) {
        result += formTemplate.replaceAll('[[name]]', item.COLUMN_NAME)
          .replaceAll('[[nameLocale]]', item.COLUMN_NAME_LOCALE) + '\r\n'
      }

      console.log(result)

      return result
    },

    // 组装表格型内容
    composeTableContent (items) {
      // console.log('composeContent: ', items)

      let result = ''

      const formTemplate =
      '<tr title="[[nameLocale]]([[name]])">' + '\r\n' +
      '  <td>[[nameLocale]]</td>' + '\r\n' +
      '  <td>{{ [[name]] }}</td>' + '\r\n' +
      '</tr>' + '\r\n' // 表格模板

      for (const item of items) {
        result += formTemplate.replaceAll('[[name]]', item.COLUMN_NAME)
          .replaceAll('[[nameLocale]]', item.COLUMN_NAME_LOCALE) + '\r\n'
      }

      console.log(result)

      return result
    },

    // 拷贝文本内容
    doCopy (content) {
      copyText(content)
    }
  }
}
Vue.createApp(App).mount('#app')
