const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const COOLDOWN_DAYS = 3;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

exports.main = async (event) => {
  const { action } = event; // 'negotiate' | 'force'
  const { OPENID } = cloud.getWXContext();
  const db = cloud.database();
  const _ = db.command;

  if (!['negotiate', 'force'].includes(action)) {
    throw new Error('invalid action');
  }

  const users = await db.collection('users').where({ openid: OPENID }).get();
  if (users.data.length === 0 || !users.data[0].couple_id) {
    throw new Error('not paired');
  }

  const coupleId = users.data[0].couple_id;
  let room;
  try {
    const rooms = await db.collection('couple_rooms').doc(coupleId).get();
    room = rooms.data;
  } catch (e) {
    throw new Error('couple room not found');
  }

  if (room.deleted_at) {
    throw new Error('already unbound');
  }

  // ===== 协商解除：需要双方确认 =====
  if (action === 'negotiate') {
    const confirmations = room.unbind_confirmations || [];
    if (confirmations.includes(OPENID)) {
      return { unbound: false, waiting_partner: true, mode: 'negotiate' };
    }

    await db.collection('couple_rooms').doc(coupleId).update({
      data: {
        unbind_confirmations: _.addToSet(OPENID),
        unbind_type: 'negotiate'
      }
    });

    // 如果对方已确认，执行解绑
    if (confirmations.length >= 1) {
      await db.collection('couple_rooms').doc(coupleId).update({
        data: { deleted_at: new Date().toISOString() }
      });
      await db.collection('users').where({ couple_id: coupleId }).update({
        data: { couple_id: null }
      });
      return { unbound: true, mode: 'negotiate' };
    }

    return { unbound: false, waiting_partner: true, mode: 'negotiate' };
  }

  // ===== 强制解除：单方面立即生效，发起者3天冷却期 =====
  // 找出对方openid
  const members = room.members || [];
  const partnerOpenid = members.find(m => m !== OPENID);
  if (!partnerOpenid) {
    throw new Error('partner not found');
  }

  const now = new Date();
  const cooldownUntil = new Date(now.getTime() + COOLDOWN_DAYS * MS_PER_DAY).toISOString();

  // 标记房间为已删除
  await db.collection('couple_rooms').doc(coupleId).update({
    data: {
      deleted_at: now.toISOString(),
      unbind_type: 'force',
      unbind_initiator: OPENID,
      force_unbind_at: now.toISOString()
    }
  });

  // 双方都解除couple_id
  await db.collection('users').where({ couple_id: coupleId }).update({
    data: { couple_id: null }
  });

  // 发起者：设置冷却期
  await db.collection('users').where({ openid: OPENID }).update({
    data: { cooldown_until: cooldownUntil }
  });

  // 对方：设置和好邀请通知
  await db.collection('users').where({ openid: partnerOpenid }).update({
    data: {
      pending_reconcile: {
        couple_id: coupleId,
        from: OPENID,
        at: now.toISOString()
      }
    }
  });

  return {
    unbound: true,
    mode: 'force',
    cooldown_until: cooldownUntil
  };
};
