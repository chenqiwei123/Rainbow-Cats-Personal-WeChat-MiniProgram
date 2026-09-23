// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

// 允许操作的集合白名单
const ALLOWED_LISTS = ['UserList']

exports.main = async (context) => {
  const { OPENID } = cloud.getWXContext()

  // 安全校验：集合名必须在白名单内
  if (!ALLOWED_LISTS.includes(context.list)) {
    return { code: 403, msg: '非法集合操作' }
  }

  // 安全校验：只能修改自己的积分
  if (context._openid !== OPENID) {
    return { code: 403, msg: '无权修改他人积分' }
  }

  // 安全校验：积分变动范围限制
  const value = Number(context.value)
  if (isNaN(value) || Math.abs(value) > 10000) {
    return { code: 400, msg: '积分变动不合法' }
  }

  return await db.collection(context.list).where({
    _openid: OPENID
  }).update({
    data: {
      credit: db.command.inc(value)
    }
  })
}
