/**
 * 首页
 * ===
 */

/**
 * 选择源路径
 *
 * @param {*} event
 */
const pickSource = event => {
  console.log('pickSource: ', event)

  const path = pickPath()

  const targetInput = document.querySelector("input[name='source-path']")
  targetInput.value = path ?? ''

  console.log(targetInput.value)
}

/**
 * 选择路径
 */
const pickPath = () => {
  console.log('pickPath: ')

  const result = null
  return result
}

const doClone = () => {}
const doGenerate = () => {}

// 绑定事件监听器
const mapEventListeners = () => {
  document.getElementById('pick-source').addEventListener('click', pickSource)
  // document.getElementById('pick-target').addEventListener('click', pickTarget)

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
