const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const { action } = event; // 'accept' | 'reject'
  const { OPENID } = cloud.getWXContext();
  const db = cloud.database();

  if (!['accept', 'reject'].includes(action)) {
    throw new Error('invalid action');
  }

  const users = await db.collection('users').where({ openid: OPENID }).get();
  if (users.data.length === 0) {
    throw new Error('user not found');
  }

  const user = users.data[0];
  const pending = user.pending_reconcile;
  if (!pending) {
    throw new Error('no pending reconcile');
  }

  // 清除通知
  await db.collection('users').where({ openid: OPENID }).update({
    data: { pending_reconcile: null }
  });

  if (action === 'reject') {
    return { reconciled: false };
  }

  // 接受和好：恢复couple_room，双方重新绑定
  const coupleId = pending.couple_id;
  const initiatorOpenid = pending.from;

  // 检查房间是否还存在且是force解绑的
  let room;
  try {
    const res = await db.collection('couple_rooms').doc(coupleId).get();
    room = res.data;
  } catch (e) {
    throw new Error('couple room not found');
  }

  if (!room.deleted_at || room.unbind_type !== 'force') {
    throw new Error('cannot reconcile');
  }

  // 检查发起者当前是否还是单身（没配对新人）
  const initiatorUsers = await db.collection('users').where({ openid: initiatorOpenid }).get();
  if (initiatorUsers.data.length === 0 || initiatorUsers.data[0].couple_id) {
    throw new Error('initiator already paired with someone else');
  }

  // 恢复房间
  await db.collection('couple_rooms').doc(coupleId).update({
    data: {
      deleted_at: null,
      unbind_type: null,
      unbind_initiator: null,
      force_unbind_at: null,
      unbind_confirmations: []
    }
  });

  // 双方重新绑定couple_id
  await db.collection('users').where({ openid: OPENID }).update({ data: { couple_id: coupleId } });
  await db.collection('users').where({ openid: initiatorOpenid }).update({
    data: {
      couple_id: coupleId,
      cooldown_until: null
    }
  });

  return { reconciled: true, couple_id: coupleId };
};
