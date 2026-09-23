// 云函数入口文件：消息推送
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const { OPENID } = cloud.getWXContext()
    console.log('发送通知，当前用户:', OPENID)

    // 从 UserList 读取两个用户的 openid（不再硬编码）
    const userRes = await db.collection('UserList').get()
    const userList = userRes.data
    if (userList.length < 2) {
      console.error('UserList 中用户数量不足')
      return { code: 500, msg: '用户配置不完整' }
    }

    // 确定通知接收人：如果是 A 操作就通知 B，反之亦然
    let targetOpenId
    if (OPENID === userList[0]._openid) {
      targetOpenId = userList[1]._openid
    } else if (OPENID === userList[1]._openid) {
      targetOpenId = userList[0]._openid
    } else {
      console.error('未知用户:', OPENID)
      return { code: 403, msg: '无权发送通知' }
    }

    // 获取最新任务标题
    let taskName = '叮咚～任务更新提醒'
    try {
      const missionRes = await db.collection('MissionList')
        .orderBy('date', 'desc')
        .limit(1)
        .get()
      if (missionRes.data.length > 0) {
        taskName = missionRes.data[0].title
      }
    } catch (err) {
      console.error('获取任务标题失败:', err)
    }

    const result = await cloud.openapi.subscribeMessage.send({
      touser: targetOpenId,
      data: {
        thing6: {
          value: taskName
        },
        thing9: {
          value: '你的宝r更新了任务哦'
        }
      },
      templateId: event.templateId,
      miniprogramState: 'formal', // 上线用 formal，开发调试用 developer
      page: 'pages/MainPage/index'
    })

    console.log('消息发送成功:', result)
    return { code: 200, msg: '发送成功' }
  } catch (err) {
    console.error('消息发送失败:', err)
    return { code: 500, msg: err.message || '发送失败' }
  }
}
