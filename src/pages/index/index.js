const Vue = require('vue')
/**
 * 首页
 * ===
 */
window.onload = () => {
  console.log(
    'page/index/index window.onload at ',
    new Date().toLocaleString()
  )

  // 通知主进程已完成HTML、CSS加载
  if (ipcRenderer) ipcRenderer.send('pageOnload', { page: 'index' })
}

/**
 * Vue 单页应用
 */
const App = {
  data() {
    return {
      // 输入记录
      inputLog: null,

      showTagTemplateInfo: false, // 显示模板标签说明？

      // 路径
      sourcePath: isDev
        ? appPathDict[process.env.SOURCE_DIR]
        : window.localStorage.getItem('recentSourcePath'),
      sourcePathSample: appPathDict[process.env.SOURCE_DIR],
      targetPath: isDev
        ? appPathDict[process.env.TARGET_DIR]
        : window.localStorage.getItem('recentTargetPath'),
      targetPathSample: appPathDict[process.env.TARGET_DIR],

      // 业务
      bizConfigGlobal: {
        wrapInFolder: false,
        renameFile: true,
        parseTable: false
      },
      bizItem: {
        code: '',
        name: '',
        nameLocale: '',
        wrapInFolder: false,
        renameFile: true,
        parseTable: false,
        table: '',
        pk: 'id'
      },
      bizs: [],

      // 数据结构API
      api: {
        url: process.env.API_URL ?? ''
      },
      parsedTableContent: [],

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

  created() {
    console.log('created: ')

    // 加载输入历史
    this.inputLog = historit.findMany()

    // DEV only
    isDev && this.mapDemoBizItem()
  },

  mounted() {
    console.log('mounted: ')
  },

  methods: {
    // 添加演示性业务配置项
    mapDemoBizItem() {
      console.log('mapDemoBizItem: ')

      this.bizs.push({
        ...this.bizItem,
        ...this.bizConfigGlobal,

        code: 'USR',
        name: 'user',
        nameLocale: '用户',
        parseTable: true,
        table: 'user'
      })
    },

    /**
     * 选择路径
     */
    async pickPath() {
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

            this.inputLog = historit.create('path', path)
          } else {
            console.warn('用户取消选择')
          }
        })
        .catch((error) => {
          console.error('pickPath: ', error)
        })

      console.log('path: ', path)

      return path
    },

    changeInput(dataName, value) {
      console.log('changeInput: ', dataName, value)

      this[dataName] = value
    },

    // 选择源路径
    async pickSource() {
      console.log('pickSource: ')

      this.sourcePath = (await this.pickPath()) ?? this.sourcePath

      window.localStorage.setItem('recentSourcePath', this.sourcePath)
    },

    // 选择目标路径
    async pickTarget() {
      console.log('pickTarget: ')

      this.targetPath = (await this.pickPath()) ?? this.targetPath

      window.localStorage.setItem('recentTargetPath', this.targetPath)
    },

    // 移除输入历史项
    removeInputHistoryItem(key, index) {
      this.inputLog[key].splice(index, 1)
      historit.update(key, this.inputLog[key])
    },

    // 添加一组业务配置
    addBiz() {
      // 延续部分配置；最近一个业务项，或者默认项
      const referenceItem =
        this.bizs.length > 0 ? this.bizs[this.bizs.length - 1] : this.bizConfigGlobal

      this.bizs.push({
        ...this.bizItem,
        ...this.bizConfigGlobal
      })
    },

    // 转换业务编码为大写
    upperBizCode(index) {
      console.log('upperBizCode: ', this.bizs[index])

      this.bizs[index].code = this.bizs[index].code.toUpperCase()
    },

    // 填写默认值
    mapBizDefaults(index) {
      console.log('mapBizDefaults: ', this.bizs[index])

      this.bizs[index].table = this.bizs[index].name
      this.bizs[index].pk = this.bizs[index].name + '_id'
    },

    // 添加一组业务配置
    removeBiz(index) {
      this.bizs.splice(index, 1)
    },

    // 验证路径格式
    verifyPaths(sourcePath, targetPath, allowSelf = true) {
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
     * 解析
     *
     * 解析数据表内容
     */
    async doParse() {
      // console.log('doParse: ', this.bizs)

      this.parsedTableContent = []

      // 遍历业务配置项，生成相应页面，并装载到以业务名称为名的文件夹中
      for (const item of this.bizs) {
        // 解析数据表以获取字段信息
        const columnsInfo = (await this.parseTable(item.name)) ?? []
        if (columnsInfo === null) return window.alert('解析错误')

        // 补充字段名称本地化信息
        for (const column of columnsInfo) {
          column.COLUMN_NAME_LOCALE =
            column.COLUMN_COMMENT.length > 0
              ? this.parseNameLocaleFromComment(column.COLUMN_COMMENT)
              : ''
        }

        // 生成内容字符串
        const content = {
          contentCSV: this.composeCSV(columnsInfo, '\n') ?? '',
          contentForm: this.composeForm(columnsInfo) ?? '',
          contentList: this.composeList(columnsInfo) ?? '',
          contentTable: this.composeTable(columnsInfo) ?? ''
        }
        console.log(content)

        this.parsedTableContent[item.name] = content
      }
    },

    /**
     * 打包
     *
     * 直接创建压缩包到目标路径，不处理文件
     */
    async doPack() {
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
    async doClone() {
      console.log('doClone: ', this.sourcePath, this.targetPath)

      const errorMessage = this.verifyPaths(
        this.sourcePath,
        this.targetPath,
        false
      )
      if (errorMessage.length > 0) return window.alert(errorMessage)

      await clonePath(this.sourcePath, this.targetPath)
    },

    /**
     * 生成
     *
     * 使用源文件作为模板来生成新文件
     */
    async doGenerate() {
      console.log('doClone: ', this.sourcePath, this.targetPath)

      const errorMessage = this.verifyPaths(this.sourcePath, this.targetPath)
      if (errorMessage.length > 0) return window.alert(errorMessage)

      // 遍历业务配置项，生成相应页面，并装载到以业务名称为名的文件夹中
      for (const item of this.bizs) {
        // （可选）解析数据表以获取字段信息
        if (item.parseTable) {
          const columnsInfo = (await this.parseTable(item.name)) ?? []

          // 补充字段名称本地化信息
          for (const column of columnsInfo) {
            column.COLUMN_NAME_LOCALE =
              column.COLUMN_COMMENT.length > 0
                ? this.parseNameLocaleFromComment(column.COLUMN_COMMENT)
                : ''
          }

          // 生成字段内容字符串
          item.contentCSV = this.composeCSV(columnsInfo) ?? ''
          item.contentForm = this.composeForm(columnsInfo) ?? ''
          item.contentList = this.composeList(columnsInfo) ?? ''
          item.contentTable = this.composeTable(columnsInfo) ?? ''
        }

        // console.log("biz item: ", item);

        const folderName = item.wrapInFolder ? item.name : ''

        await clonePath(this.sourcePath, this.targetPath, this.renameFile, folderName, item)
      }

      // 上提模板标签说明DOM到视野之内
      this.showTagTemplateInfo = true
      // this.$refs.templateTagIntro.scrollIntoView({ behavior: 'smooth' })
    },

    /**
     * 解析数据表结构
     *
     * @param {string} tableName 数据表名称
     */
    async parseTable(tableName) {
      // console.log('parseTable: ', tableName)

      const apiURL = `${this.api.url}/${tableName}`

      let result = null

      try {
        result = await fetch(apiURL).then(async (response) => {
          const json = await response.json()
          // console.log(json)

          if (response.status === 200) {
            return json.data
          } else {
            console.error(json.message)
            window.alert(json.message)
          }
        })
      } catch (error) {
        console.error(error)
      }

      console.log(result)
      return result
    },

    // 从字段备注中解析字段名
    parseNameLocaleFromComment(COLUMN_COMMENT) {
      return COLUMN_COMMENT.substring(0, COLUMN_COMMENT.indexOf('；'))
    },

    // 组装CSV内容
    composeCSV(items, breaker = ',', seperator = ':') {
      console.log('composeCSV: ', items, seperator, breaker)

      let result = ''

      const template =
        '[[name]]' + seperator + breaker // 模板

      for (const item of items) {
        result += template.replaceAll('[[name]]', item.COLUMN_NAME)
      }

      console.log(result)

      return result
    },

    // 组装表单型内容
    composeForm(items) {
      // console.log('composeContent: ', items)

      let result = ''

      const readOnlyNames = ['createdAt', 'updatedAt', 'deletedAt'] // 只读字段

      const template =
        '<input class="form-control" name="[[name]]" placeholder="[[nameLocale]]" [[required]] />' +
        '\n' // 模板

      for (const item of items) {
        // 跳过部分只读字段
        if (
          readOnlyNames.includes(item.COLUMN_NAME) ||
          item.COLUMN_KEY === 'PRI'
        ) {
          console.log(`${item.COLUMN_NAME} is skipped`)
          continue
        }

        result +=
          template
            .replaceAll('[[name]]', item.COLUMN_NAME)
            .replaceAll(
              '[[required]]',
              item.IS_NULLABLE === 'YES' ? 'required' : ''
            )
            .replaceAll('[[nameLocale]]', item.COLUMN_NAME_LOCALE) + '\n'
      }

      console.log(result)

      return result
    },

    // 组装列表型内容
    composeList(items) {
      // console.log('composeContent: ', items)

      let result = ''

      const template =
        '<li title="[[nameLocale]]([[name]])">[[nameLocale]]: {{ [[name]] }}</li>' +
        '\n' // 模板

      for (const item of items) {
        result +=
          template
            .replaceAll('[[name]]', item.COLUMN_NAME)
            .replaceAll('[[nameLocale]]', item.COLUMN_NAME_LOCALE) + '\n'
      }

      console.log(result)

      return result
    },

    // 组装表格型内容
    composeTable(items) {
      // console.log('composeContent: ', items)

      let result = ''

      const template =
        '<tr title="[[nameLocale]]([[name]])">' +
        '\n' +
        '  <td>[[nameLocale]]</td>' +
        '\n' +
        '  <td>{{ [[name]] }}</td>' +
        '\n' +
        '</tr>' +
        '\n' // 模板

      for (const item of items) {
        result +=
          template
            .replaceAll('[[name]]', item.COLUMN_NAME)
            .replaceAll('[[nameLocale]]', item.COLUMN_NAME_LOCALE) + '\n'
      }

      console.log(result)

      return result
    },

    // 拷贝文本内容到操作系统剪贴板
    doCopy(content) {
      copyText(content)
    }
  }
}
Vue.createApp(App).mount('#app')

/**
 * 页首
 */
const Header = {
  data() {
    return {
      appName: process.env.APP_NAME,
      appVersion: process.env.VERSION
    }
  },

  created() {
    this.renderMeta()
  },

  methods: {
    // 打开程序数据目录
    openAppDataFolder() {
      console.log('openAppDataFolder: ', appPathDict.data)

      try {
        shell.openPath(appPathDict.data)
      } catch (error) {
        console.error('openAppDirectory error: ', error)
      }
    },

    // 打开网页
    openWebPage(event) {
      console.log('openWebPage: ', event.currentTarget.href)

      try {
        shell.openPath(event.currentTarget.href)
      } catch (error) {
        console.error('openWebPage error: ', error)
      }
    },

    // 渲染页面元信息
    renderMeta() {
      document.title = this.appName
    }
  }
}
Vue.createApp(Header).mount('#header')
