const app = getApp()

Page({
  data: {
    creditA: 0,
    creditB: 0,
    userA: '',
    userB: '',
    isLoading: false,
  },

  async onShow() {
    this.setData({
      userA: app.globalData.userA,
      userB: app.globalData.userB,
    })
    await this.loadCredits()
  },

  // 下拉刷新
  async onPullDownRefresh() {
    await this.loadCredits()
    wx.stopPullDownRefresh()
  },

  // 加载双方积分
  async loadCredits() {
    this.setData({ isLoading: true })
    try {
      const resA = await wx.cloud.callFunction({
        name: 'getElementByOpenId',
        data: { list: app.globalData.collectionUserList, _openid: app.globalData._openidA }
      })
      const resB = await wx.cloud.callFunction({
        name: 'getElementByOpenId',
        data: { list: app.globalData.collectionUserList, _openid: app.globalData._openidB }
      })

      this.setData({
        creditA: resA.result.data && resA.result.data[0] ? resA.result.data[0].credit : 0,
        creditB: resB.result.data && resB.result.data[0] ? resB.result.data[0].credit : 0,
      })
    } catch (err) {
      console.error('加载积分失败:', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      this.setData({ isLoading: false })
    }
  },

  // 订阅消息
  async requestSubscribeMessage() {
    const templateId = 'R5sHALA7TKs6jCyH_kwNr9l8vVfWKCU5cXQnFKWlwfA'
    wx.requestSubscribeMessage({
      tmplIds: [templateId],
      success: (res) => {
        if (res[templateId] === 'accept') {
          wx.showToast({ title: '订阅成功', icon: 'success' })
        } else {
          wx.showToast({ title: '订阅失败', icon: 'none' })
        }
      },
      fail: (err) => {
        console.error('订阅失败:', err)
        wx.showToast({ title: '订阅失败', icon: 'none' })
      },
    })
  },
})
