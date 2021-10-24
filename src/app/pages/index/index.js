/**
 * 首页
 * ===
 */

/**
 * 数据
 */
let sourcePath = null
let targetPath = null

// 选择源路径
const pickSource = async () => {
  console.log('pickSource: ')

  sourcePath = await pickPath()

  if (sourcePath !== null) document.querySelector("input[name='source-path']").value = sourcePath // 更新字段值
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

// 克隆
const doClone = () => {
  console.log(listFilesInDir(sourcePath))
}

// 生成
const doGenerate = () => {}

// 绑定事件监听器
const mapEventListeners = () => {
  document.getElementById('pick-source').addEventListener('click', async (event) => await pickSource())
  document.getElementById('pick-target').addEventListener('click', async (event) => await pickTarget())

  document.getElementById('do-clone').addEventListener('click', doClone)
  document.getElementById('do-generate').addEventListener('click', doGenerate)
}

window.onload = () => {
  console.log('page/index/index window.onload at ', new Date().toLocaleString())

  // 通知主进程已完成HTML、CSS加载
  if (ipcRenderer) {
    ipcRenderer.send('pageOnload', { page: 'index' })
  }

  mapEventListeners()
}
