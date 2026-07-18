const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const MOCK_PARTNER_OPENID = 'mock_partner_test';

// 开发者 openid 白名单 —— 将你自己的 openid 填入此处
// 获取方式：在开发者工具控制台 console.log(wx.cloud.getWXContext()) 或在云函数里打印 OPENID
const DEVELOPER_OPENIDS = [
  // '你的openid'
];

exports.main = async () => {
  const { OPENID } = cloud.getWXContext();
  const db = cloud.database();

  // 鉴权：仅开发者可调用
  if (DEVELOPER_OPENIDS.length === 0) {
    throw new Error('test functions disabled: set DEVELOPER_OPENIDS first');
  }
  if (!DEVELOPER_OPENIDS.includes(OPENID)) {
    throw new Error('forbidden: developer only');
  }

  // 已配对则先解绑
  const users = await db.collection('users').where({ openid: OPENID }).get();
  if (users.data.length > 0 && users.data[0].couple_id) {
    const oldCoupleId = users.data[0].couple_id;
    try {
      await db.collection('couple_rooms').doc(oldCoupleId).update({
        data: { deleted_at: new Date().toISOString() }
      });
    } catch (e) { /* 忽略 */ }
    await db.collection('users').where({ openid: OPENID }).update({
      data: { couple_id: null }
    });
  }

  // 创建模拟 couple_room
  const coupleRoom = {
    members: [OPENID, MOCK_PARTNER_OPENID],
    stage: 'love',
    timezone: 'Asia/Shanghai',
    paired_at: new Date().toISOString(),
    is_test: true
  };
  const roomResult = await db.collection('couple_rooms').add({ data: coupleRoom });
  const coupleId = roomResult._id;

  // 更新当前用户
  if (users.data.length > 0) {
    await db.collection('users').where({ openid: OPENID }).update({
      data: { couple_id: coupleId }
    });
  } else {
    await db.collection('users').add({
      data: {
        openid: OPENID,
        couple_id: coupleId,
        created_at: new Date().toISOString()
      }
    });
  }

  return { success: true, couple_id: coupleId, mock_partner: MOCK_PARTNER_OPENID };
};
