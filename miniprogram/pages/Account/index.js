const app = getApp()

Page({
  data: {
    search: "",
    allItems: [],
    unusedItems: [],
    usedItems: [],
    isLoading: false,

    slideButtons: [
      {extClass: 'useBtn', text: '使用', src: "Images/icon_use.svg"},
      {extClass: 'starBtn', text: '星标', src: "Images/icon_star.svg"},
      {extClass: 'removeBtn', text: '删除', src: 'Images/icon_del.svg'}
    ],
  },

  async onShow() {
    await this.loadItems()
  },

  // 加载仓库物品
  async loadItems() {
    this.setData({ isLoading: true })
    wx.showLoading({ title: '加载中...' })
    try {
      const res = await wx.cloud.callFunction({
        name: 'getElementByOpenId',
        data: { list: app.globalData.collectionStorageList }
      })
      this.setData({ allItems: res.result.data || [] })
      this.filterItem()
    } catch (err) {
      console.error('加载仓库失败:', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      this.setData({ isLoading: false })
      wx.hideLoading()
    }
  },

  // 下拉刷新
  async onPullDownRefresh() {
    await this.loadItems()
    wx.stopPullDownRefresh()
  },

  // 转到物品详情
  toDetailPage(element, isUpper) {
    const itemIndex = element.currentTarget.dataset.index
    const list = isUpper ? this.data.unusedItems : this.data.usedItems
    const item = list[itemIndex]
    if (!item) return
    wx.navigateTo({ url: '../ItemDetail/index?id=' + item._id })
  },

  toDetailPageUpper(element) { this.toDetailPage(element, true) },
  toDetailPageLower(element) { this.toDetailPage(element, false) },

  // 搜索（加防抖）
  onSearch(element) {
    clear(this.searchTimer)
    this.searchTimer = setTimeout(() => {
      this.setData({ search: element.detail.value })
      this.filterItem()
    }, 300)
  },

  // 过滤物品
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
      unusedItems: itemList.filter(item => item.available === true),
      usedItems: itemList.filter(item => item.available === false),
    })
  },

  // 左滑按钮
  slideButtonTapUpper(element) { this.slideButtonTap(element, true) },
  slideButtonTapLower(element) { this.slideButtonTap(element, false) },

  async slideButtonTap(element, isUpper) {
    const { index } = element.detail
    const itemIndex = element.currentTarget.dataset.index
    const list = isUpper === true ? this.data.unusedItems : this.data.usedItems
    const item = list[itemIndex]
    if (!item) return

    const currentOpenId = app.globalData.currentOpenId

    // 使用物品
    if (index === 0) {
      if (isUpper) {
        await this.useItem(item)
      } else {
        wx.showToast({ title: '物品已被使用', icon: 'none' })
      }
      return
    }

    // 星标 / 删除：只能操作自己的
    if (item._openid !== currentOpenId) {
      wx.showToast({ title: '只能编辑自己的物品', icon: 'none' })
      return
    }

    if (index === 1) {
      // 星标
      try {
        await wx.cloud.callFunction({
          name: 'editStar',
          data: { _id: item._id, list: app.globalData.collectionStorageList, value: !item.star }
        })
        item.star = !item.star
        this.setData({
          unusedItems: this.data.unusedItems,
          usedItems: this.data.usedItems
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
                data: { _id: item._id, list: app.globalData.collectionStorageList }
              })
              list.splice(itemIndex, 1)
              this.setData({
                unusedItems: this.data.unusedItems,
                usedItems: this.data.usedItems
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

  // 使用物品
  async useItem(item) {
    wx.showModal({
      title: '确认使用',
      content: `确定要使用「${item.title}」吗？使用后不可逆哦`,
      confirmText: '使用',
      success: async (res) => {
        if (!res.confirm) return

        try {
          wx.showLoading({ title: '提交中...' })
          await wx.cloud.callFunction({
            name: 'editAvailable',
            data: { _id: item._id, value: false, list: app.globalData.collectionStorageList }
          })
          wx.hideLoading()
          item.available = false
          this.filterItem()
          wx.showToast({ title: '已使用', icon: 'success' })
        } catch (err) {
          wx.hideLoading()
          wx.showToast({ title: '操作失败', icon: 'none' })
        }
      }
    })
  },
})
