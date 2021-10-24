/**
 * 首页
 */
window.onload = () => {
  console.log('page/index/index window.onload at ', new Date().toLocaleString())
  // 通知主进程已完成HTML、CSS加载
  if (ipcRenderer) {
    ipcRenderer.send('pageOnload', { page: 'index' })
  }
}
