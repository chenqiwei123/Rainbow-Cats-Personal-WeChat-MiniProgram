// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()
const db_date = db.serverDate()

// 允许写入的集合白名单
const ALLOWED_LISTS = ['MissionList', 'MarketList', 'StorageList']

exports.main = async (context) => {
  const { OPENID } = cloud.getWXContext()

  // 安全校验：集合名必须在白名单内
  if (!ALLOWED_LISTS.includes(context.list)) {
    return { code: 403, msg: '非法集合写入' }
  }

  // 参数校验
  const credit = Number(context.credit)
  if (isNaN(credit) || credit < 0 || credit > 10000) {
    return { code: 400, msg: '积分值不合法' }
  }

  if (!context.title || typeof context.title !== 'string' || context.title.length > 50) {
    return { code: 400, msg: '标题不合法' }
  }

  return await db.collection(context.list).add({
    data: {
      _openid: OPENID,
      date: db_date,
      credit: credit,
      title: context.title,
      desc: context.desc || '',
      available: true,
      star: false
    }
  })
}
