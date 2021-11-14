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
    items: [], // 数据列表
    loading: false,
    offset: 0,
    limit: 20
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    console.log('onLoad: ', options)

    this.findMany() // 请求数据
  },

  /**
 * 页面相关事件处理函数--监听用户下拉动作
 */
  onPullDownRefresh: function () {
    console.log('onPullDownRefresh')

    this.resetData() // 重置数据

    wx.stopPullDownRefresh() // 结束下拉动画
  },

  /**
 * 页面上拉触底事件的处理函数
 */
  onReachBottom: function () {
    console.log('onReachBottom: ', this.data.offset, ',', this.data.limit)

    this.setData({
      offset: this.data.offset + this.data.limit
    })

    this.findMany() // 请求数据
  },
  // TODO 用户点击右上角分享给朋友
  onShareAppMessage: function (params) {
    // console.log('onShareAppMessage', params)
  },

  // 用户点击右上角分享到朋友圈
  onShareTimeline: function () {
    // console.log('onShareTimeline')
  },
  resetData () {
    console.log('resetData: ')

    // 清除当前数据
    this.setData({
      items: [],
      offset: 0
    })

    this.findMany() // 请求数据
  }, // end resetData

  // 获取列表数据
  findMany () {
    const that = this
    that.setData({ loading: true })

    // 请求API
    const apiUrl = 'http://localhost:51887/' + that.data.moduleName
    console.log('wx.request: url ', apiUrl)

    wx.request({
      method: 'GET',
      url: apiUrl,
      data: {
        // ...app.globalData.common_params,
        limit: that.data.limit,
        offset: that.data.offset
        // sorter: JSON.stringify(that.data.sorter), // 排序器
        // filter: JSON.stringify(that.data.filter) // 筛选器
      },

      success (result) {
        console.log(result)
        // wx.showToast({title: '网络请求成功'})

        if (result.statusCode === 200) {
          that.setData({
            items: [
              ...that.data.items,
              ...result.data.data
            ]
          })
        } else {
          console.error(result.errMsg)
        }
      },

      fail () {
        console.error('网络请求失败')

        wx.showToast({
          icon: 'none',
          title: '网络请求失败'
        })
      },

      complete () {
        that.setData({ loading: false })
      }
    }) // end wx.request
  } // end findMany
})
