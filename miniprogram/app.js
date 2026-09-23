App({
  async onLaunch() {
    this.initcloud()
    await this.initUserInfo()

    this.globalData = {
      // 你们俩的 openid（部署时改成自己的）
      _openidA: 'YOUR_OPENID_A_HERE',
      _openidB: 'YOUR_OPENID_B_HERE',

      // 你们俩的昵称（部署时改成自己的）
      userA: '宝A',
      userB: '宝B',

      // 当前登录用户的 openid（自动获取，不用改）
      currentOpenId: '',

      // 用于存储待办记录的集合名称
      collectionMissionList: 'MissionList',
      collectionMarketList: 'MarketList',
      collectionStorageList: 'StorageList',
      collectionUserList: 'UserList',

      // 最多单次交易积分
      maxCredit: 500,
    }
  },

  flag: false,

  /**
   * 初始化云开发环境
   */
  async initcloud() {
    const normalinfo = require('./envList.js').envList || []
    if (normalinfo.length != 0 && normalinfo[0].envId != null) {
      wx.cloud.init({
        traceUser: true,
        env: normalinfo[0].envId
      })
      this.cloud = () => {
        return wx.cloud
      }
    } else {
      this.cloud = () => {
        wx.showModal({
          content: '无云开发环境',
          showCancel: false
        })
        throw new Error('无云开发环境')
      }
    }
  },

  /**
   * 初始化用户信息：获取当前用户的 openid 并缓存
   */
  async initUserInfo() {
    try {
      const res = await wx.cloud.callFunction({ name: 'getOpenId' })
      this.globalData.currentOpenId = res.result
      console.log('当前用户 openid:', res.result)
    } catch (err) {
      console.error('获取用户 openid 失败:', err)
      wx.showToast({
        title: '登录失败，请重试',
        icon: 'none'
      })
    }
  },

  /**
   * 获取当前用户的显示名称
   */
  getCurrentUserName() {
    const openid = this.globalData.currentOpenId
    if (openid === this.globalData._openidA) return this.globalData.userA
    if (openid === this.globalData._openidB) return this.globalData.userB
    return '未知用户'
  },

  /**
   * 获取对方的 openid
   */
  getPartnerOpenId() {
    const openid = this.globalData.currentOpenId
    if (openid === this.globalData._openidA) return this.globalData._openidB
    if (openid === this.globalData._openidB) return this.globalData._openidA
    return ''
  },

  // 获取云数据库实例
  async database() {
    return (await this.cloud()).database()
  },
})
