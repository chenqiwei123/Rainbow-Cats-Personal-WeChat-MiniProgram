// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

// 允许操作的集合白名单
const ALLOWED_LISTS = ['MissionList', 'MarketList', 'StorageList']

exports.main = async (context) => {
  const { OPENID } = cloud.getWXContext()

  // 安全校验：集合名必须在白名单内
  if (!ALLOWED_LISTS.includes(context.list)) {
    return { code: 403, msg: '非法集合操作' }
  }

  // 安全校验：只能编辑自己创建的记录的星标
  const record = await db.collection(context.list).where({
    _id: context._id,
    _openid: OPENID
  }).get()

  if (record.data.length === 0) {
    return { code: 403, msg: '无权编辑此记录或记录不存在' }
  }

  return await db.collection(context.list).doc(context._id).update({
    data: {
      star: !!context.value
    }
  })
}
