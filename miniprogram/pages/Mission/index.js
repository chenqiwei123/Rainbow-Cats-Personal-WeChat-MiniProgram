const app = getApp()

Page({
  data: {
    search: "",
    allMissions: [],
    unfinishedMissions: [],
    finishedMissions: [],
    isLoading: false,

    slideButtons: [
      {extClass: 'markBtn', text: '完成', src: "Images/icon_mark.svg"},
      {extClass: 'starBtn', text: '星标', src: "Images/icon_star.svg"},
      {extClass: 'removeBtn', text: '删除', src: 'Images/icon_del.svg'}
    ],
  },

  async onShow() {
    await this.loadMissions()
  },

  // 加载任务列表
  async loadMissions() {
    this.setData({ isLoading: true })
    wx.showLoading({ title: '加载中...' })

    try {
      const res = await wx.cloud.callFunction({
        name: 'getList',
        data: { list: app.globalData.collectionMissionList }
      })
      this.setData({ allMissions: res.result.data })
      this.filterMission()
    } catch (err) {
      console.error('加载任务失败:', err)
      wx.showToast({ title: '加载失败，下拉刷新重试', icon: 'none' })
    } finally {
      this.setData({ isLoading: false })
      wx.hideLoading()
    }
  },

  // 下拉刷新
  async onPullDownRefresh() {
    await this.loadMissions()
    wx.stopPullDownRefresh()
  },

  // 转到任务详情
  toDetailPage(element, isUpper) {
    const missionIndex = element.currentTarget.dataset.index
    const list = isUpper ? this.data.unfinishedMissions : this.data.finishedMissions
    const mission = list[missionIndex]
    if (!mission) return
    wx.navigateTo({ url: '../MissionDetail/index?id=' + mission._id })
  },

  toDetailPageUpper(element) { this.toDetailPage(element, true) },
  toDetailPageLower(element) { this.toDetailPage(element, false) },
  toAddPage() { wx.navigateTo({ url: '../MissionAdd/index' }) },

  // 搜索（加防抖）
  onSearch(element) {
    clear(this.searchTimer)
    this.searchTimer = setTimeout(() => {
      this.setData({ search: element.detail.value })
      this.filterMission()
    }, 300)
  },

  // 过滤任务
  filterMission() {
    let missionList = []
    if (this.data.search !== "") {
      const keyword = this.data.search.toLowerCase()
      missionList = this.data.allMissions.filter(item =>
        item.title && item.title.toLowerCase().includes(keyword)
      )
    } else {
      missionList = this.data.allMissions
    }

    this.setData({
      unfinishedMissions: missionList.filter(item => item.available === true),
      finishedMissions: missionList.filter(item => item.available === false),
    })
  },

  // 左滑按钮
  slideButtonTapUpper(element) { this.slideButtonTap(element, true) },
  slideButtonTapLower(element) { this.slideButtonTap(element, false) },

  async slideButtonTap(element, isUpper) {
    const { index } = element.detail
    const missionIndex = element.currentTarget.dataset.index
    const list = isUpper === true ? this.data.unfinishedMissions : this.data.finishedMissions
    const mission = list[missionIndex]
    if (!mission) return

    const currentOpenId = app.globalData.currentOpenId

    // 完成任务
    if (index === 0) {
      if (isUpper) {
        await this.finishMission(mission)
      } else {
        wx.showToast({ title: '任务已完成', icon: 'none' })
      }
      return
    }

    // 星标 / 删除：只能操作自己创建的
    if (mission._openid !== currentOpenId) {
      wx.showToast({ title: '只能编辑自己的任务', icon: 'none' })
      return
    }

    if (index === 1) {
      // 星标
      try {
        await wx.cloud.callFunction({
          name: 'editStar',
          data: { _id: mission._id, list: app.globalData.collectionMissionList, value: !mission.star }
        })
        mission.star = !mission.star
        this.setData({
          unfinishedMissions: this.data.unfinishedMissions,
          finishedMissions: this.data.finishedMissions
        })
      } catch (err) {
        wx.showToast({ title: '操作失败', icon: 'none' })
      }
    } else if (index === 2) {
      // 删除（加确认弹窗）
      wx.showModal({
        title: '确认删除',
        content: `确定要删除「${mission.title}」吗？删了就找不回来了`,
        confirmText: '删除',
        confirmColor: '#e64340',
        success: async (res) => {
          if (res.confirm) {
            try {
              await wx.cloud.callFunction({
                name: 'deleteElement',
                data: { _id: mission._id, list: app.globalData.collectionMissionList }
              })
              list.splice(missionIndex, 1)
              this.setData({
                unfinishedMissions: this.data.unfinishedMissions,
                finishedMissions: this.data.finishedMissions
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

  // 完成任务
  async finishMission(mission) {
    const currentOpenId = app.globalData.currentOpenId

    // 不能完成自己的任务
    if (mission._openid === currentOpenId) {
      wx.showToast({ title: '不能完成自己的任务', icon: 'none' })
      return
    }

    try {
      wx.showLoading({ title: '提交中...' })
      await wx.cloud.callFunction({
        name: 'editAvailable',
        data: { _id: mission._id, value: false, list: app.globalData.collectionMissionList }
      })
      await wx.cloud.callFunction({
        name: 'editCredit',
        data: { _openid: mission._openid, value: mission.credit, list: app.globalData.collectionUserList }
      })

      mission.available = false
      this.filterMission()
      wx.hideLoading()
      wx.showToast({ title: '任务完成 +' + mission.credit + '分', icon: 'success' })
    } catch (err) {
      wx.hideLoading()
      console.error('完成任务失败:', err)
      wx.showToast({ title: '操作失败，请重试', icon: 'none' })
    }
  },
})
