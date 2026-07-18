const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const db = cloud.database();

  const users = await db.collection('users').where({ openid: OPENID }).get();
  if (users.data.length === 0) {
    return { paired: false };
  }

  const user = users.data[0];
  if (!user.couple_id) {
    // 未配对：检查是否有待处理的和好通知
    return {
      paired: false,
      pending_reconcile: user.pending_reconcile || null,
      cooldown_until: user.cooldown_until || null
    };
  }

  try {
    const room = await db.collection('couple_rooms').doc(user.couple_id).get();
    return {
      paired: true,
      couple_id: user.couple_id,
      stage: room.data.stage || 'love',
      difficulty: room.data.difficulty || 'all',
      reminder_enabled: room.data.reminder_enabled || false,
      l3_enabled: room.data.l3_enabled || false,
      created_at: room.data.created_at,
      pending_reconcile: user.pending_reconcile || null
    };
  } catch (e) {
    return { paired: false };
  }
};