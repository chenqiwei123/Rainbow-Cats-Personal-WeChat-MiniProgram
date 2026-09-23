// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

// 允许读取的集合白名单
const ALLOWED_LISTS = ['UserList', 'MissionList', 'MarketList', 'StorageList']

exports.main = async (context) => {
  const { OPENID } = cloud.getWXContext()

  // 安全校验：集合名必须在白名单内
  if (!ALLOWED_LISTS.includes(context.list)) {
    return { code: 403, msg: '非法集合读取' }
  }

  // 安全校验：只能查询自己的信息
  if (context._openid && context._openid !== OPENID) {
    return { code: 403, msg: '无权查询他人信息' }
  }

  return await db.collection(context.list).where({
    _openid: OPENID
  }).get()
}
