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

  // 获取记录信息，验证权限
  const record = await db.collection(context.list).where({
    _id: context._id
  }).get()

  if (record.data.length === 0) {
    return { code: 404, msg: '记录不存在' }
  }

  // 如果是完成任务/购买商品，操作人不能是记录创建者
  const item = record.data[0]
  if (context.value === false && item._openid === OPENID) {
    return { code: 403, msg: '不能操作自己创建的记录' }
  }

  return await db.collection(context.list).doc(context._id).update({
    data: {
      available: context.value
    }
  })
}
