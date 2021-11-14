/**
 * [[name]].js
 * 
 * [[nameLocale]]
 *
 * https://developers.weixin.qq.com/miniprogram/dev/reference/api/Page.html
 */

const app = getApp() // 获取应用实例

Page({
  data: {
    moduleName: '[[name]]', // 模块名称
    modelNameLocale: '[[nameLocale]]', // 模块本地化名称
    items: [] // 数据列表
  },
  onLoad: function (options) {
    // Do some initialize when page load.
  },
  onShow: function () {
    // Do something when page show.
  },
  onReady: function () {
    // Do something when page ready.
  },
  onHide: function () {
    // Do something when page hide.
  },
  onUnload: function () {
    // Do something when page close.
  },
  onPullDownRefresh: function () {
    // Do something when pull down.
  },
  onReachBottom: function () {
    // Do something when page reach bottom.
  },
  onShareAppMessage: function () {
    // return custom share data when user share.
  },
  onPageScroll: function () {
    // Do something when page scroll
  },
  onResize: function () {
    // Do something when page resize
  }
})