const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const db = cloud.database();

  const users = await db.collection('users').where({ openid: OPENID }).get();
  if (users.data.length === 0 || !users.data[0].couple_id) {
    throw new Error('not paired');
  }

  const coupleId = users.data[0].couple_id;
  const rooms = await db.collection('couple_rooms').doc(coupleId).get();
  const room = rooms.data[0];

  if (room.deleted_at) {
    throw new Error('already unbound');
  }

  const confirmations = room.unbind_confirmations || [];
  if (!confirmations.includes(OPENID)) {
    confirmations.push(OPENID);
  }

  if (confirmations.length >= 2) {
    await db.collection('couple_rooms').doc(coupleId).update({
      data: { deleted_at: new Date().toISOString() }
    });
    await db.collection('users').where({ couple_id: coupleId }).update({
      data: { couple_id: null }
    });
    return { unbound: true };
  }

  await db.collection('couple_rooms').doc(coupleId).update({
    data: { unbind_confirmations: confirmations }
  });
  return { unbound: false, waiting_partner: true };
};