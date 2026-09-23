// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

// 允许读取的集合白名单
const ALLOWED_LISTS = ['MissionList', 'MarketList', 'StorageList']

exports.main = async (context) => {
  // 安全校验：集合名必须在白名单内
  if (!ALLOWED_LISTS.includes(context.list)) {
    return { code: 403, msg: '非法集合读取' }
  }

  return await db.collection(context.list).doc(context._id).get()
}
