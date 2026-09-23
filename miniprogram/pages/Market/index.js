const app = getApp()

Page({
  data: {
    search: "",
    credit: 0,
    user: "",
    allItems: [],
    unboughtItems: [],
    boughtItems: [],
    isLoading: false,

    slideButtons: [
      {extClass: 'buyBtn', text: '购买', src: "Images/icon_buy.svg"},
      {extClass: 'starBtn', text: '星标', src: "Images/icon_star.svg"},
      {extClass: 'removeBtn', text: '删除', src: 'Images/icon_del.svg'}
    ],
  },

  async onShow() {
    await Promise.all([this.loadItems(), this.loadCredit()])
    this.setData({ user: app.getCurrentUserName() })
  },

  // 加载商品列表
  async loadItems() {
    this.setData({ isLoading: true })
    try {
      const res = await wx.cloud.callFunction({
        name: 'getList',
        data: { list: app.globalData.collectionMarketList }
      })
      this.setData({ allItems: res.result.data })
      this.filterItem()
    } catch (err) {
      console.error('加载商品失败:', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      this.setData({ isLoading: false })
    }
  },

  // 加载当前用户积分
  async loadCredit() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'getElementByOpenId',
        data: { list: app.globalData.collectionUserList }
      })
      if (res.result.data && res.result.data[0]) {
        this.setData({ credit: res.result.data[0].credit })
      }
    } catch (err) {
      console.error('加载积分失败:', err)
    }
  },

  // 下拉刷新
  async onPullDownRefresh() {
    await Promise.all([this.loadItems(), this.loadCredit()])
    wx.stopPullDownRefresh()
  },

  // 转到商品详情
  toDetailPage(element, isUpper) {
    const itemIndex = element.currentTarget.dataset.index
    const list = isUpper ? this.data.unboughtItems : this.data.boughtItems
    const item = list[itemIndex]
    if (!item) return
    wx.navigateTo({ url: '../MarketDetail/index?id=' + item._id })
  },

  toDetailPageUpper(element) { this.toDetailPage(element, true) },
  toDetailPageLower(element) { this.toDetailPage(element, false) },
  toAddPage() { wx.navigateTo({ url: '../MarketAdd/index' }) },

  // 搜索（加防抖）
  onSearch(element) {
    clear(this.searchTimer)
    this.searchTimer = setTimeout(() => {
      this.setData({ search: element.detail.value })
      this.filterItem()
    }, 300)
  },

  // 过滤商品
  filterItem() {
    let itemList = []
    if (this.data.search !== "") {
      const keyword = this.data.search.toLowerCase()
      itemList = this.data.allItems.filter(item =>
        item.title && item.title.toLowerCase().includes(keyword)
      )
    } else {
      itemList = this.data.allItems
    }

    this.setData({
      unboughtItems: itemList.filter(item => item.available === true),
      boughtItems: itemList.filter(item => item.available === false),
    })
  },

  // 左滑按钮
  slideButtonTapUpper(element) { this.slideButtonTap(element, true) },
  slideButtonTapLower(element) { this.slideButtonTap(element, false) },

  async slideButtonTap(element, isUpper) {
    const { index } = element.detail
    const itemIndex = element.currentTarget.dataset.index
    const list = isUpper === true ? this.data.unboughtItems : this.data.boughtItems
    const item = list[itemIndex]
    if (!item) return

    const currentOpenId = app.globalData.currentOpenId

    // 购买
    if (index === 0) {
      if (isUpper) {
        await this.buyItem(item)
      } else {
        wx.showToast({ title: '物品已被购买', icon: 'none' })
      }
      return
    }

    // 星标 / 删除：只能操作自己创建的
    if (item._openid !== currentOpenId) {
      wx.showToast({ title: '只能编辑自己的商品', icon: 'none' })
      return
    }

    if (index === 1) {
      // 星标
      try {
        await wx.cloud.callFunction({
          name: 'editStar',
          data: { _id: item._id, list: app.globalData.collectionMarketList, value: !item.star }
        })
        item.star = !item.star
        this.setData({
          unboughtItems: this.data.unboughtItems,
          boughtItems: this.data.boughtItems
        })
      } catch (err) {
        wx.showToast({ title: '操作失败', icon: 'none' })
      }
    } else if (index === 2) {
      // 删除（加确认弹窗）
      wx.showModal({
        title: '确认删除',
        content: `确定要删除「${item.title}」吗？`,
        confirmText: '删除',
        confirmColor: '#e64340',
        success: async (res) => {
          if (res.confirm) {
            try {
              await wx.cloud.callFunction({
                name: 'deleteElement',
                data: { _id: item._id, list: app.globalData.collectionMarketList }
              })
              list.splice(itemIndex, 1)
              this.setData({
                unboughtItems: this.data.unboughtItems,
                boughtItems: this.data.boughtItems
              })
              wx.showToast({ title: '已删除', icon: 'success' })
            } catch (err) {
              wx.showToast({ title: '删除失败', icon: 'none' })
            }
          }
        }
      })
    }
  },

  // 购买商品
  async buyItem(item) {
    const currentOpenId = app.globalData.currentOpenId

    // 不能购买自己的物品
    if (item._openid === currentOpenId) {
      wx.showToast({ title: '不能购买自己的物品', icon: 'none' })
      return
    }

    // 积分不足
    if (this.data.credit < item.credit) {
      wx.showToast({ title: '积分不足...', icon: 'none' })
      return
    }

    // 确认购买弹窗
    wx.showModal({
      title: '确认购买',
      content: `确定花费 ${item.credit} 积分购买「${item.title}」吗？`,
      confirmText: '购买',
      success: async (res) => {
        if (!res.confirm) return

        try {
          wx.showLoading({ title: '购买中...' })
          // 1. 标记商品为已购买
          await wx.cloud.callFunction({
            name: 'editAvailable',
            data: { _id: item._id, value: false, list: app.globalData.collectionMarketList }
          })
          // 2. 扣减自己的积分
          await wx.cloud.callFunction({
            name: 'editCredit',
            data: { _openid: currentOpenId, value: -item.credit, list: app.globalData.collectionUserList }
          })
          // 3. 加入自己的仓库
          await wx.cloud.callFunction({
            name: 'addElement',
            data: {
              list: app.globalData.collectionStorageList,
              credit: item.credit,
              title: item.title,
              desc: item.desc,
            }
          })

          wx.hideLoading()
          this.setData({ credit: this.data.credit - item.credit })
          item.available = false
          this.filterItem()
          wx.showToast({ title: '购买成功', icon: 'success' })
        } catch (err) {
          wx.hideLoading()
          console.error('购买失败:', err)
          wx.showToast({ title: '购买失败，请重试', icon: 'none' })
        }
      }
    })
  },
})
