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

  // 分页限制，防止一次性拉取太多数据
  const pageSize = Math.min(Number(context.pageSize) || 100, 100)
  const page = Math.max(Number(context.page) || 1, 1)

  return await db.collection(context.list)
    .orderBy('date', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()
}
