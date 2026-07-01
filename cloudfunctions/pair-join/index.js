const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const { code } = event;
  const { OPENID } = cloud.getWXContext();
  const db = cloud.database();

  if (!code || !/^\d{6}$/.test(code)) {
    throw new Error('invalid invite code');
  }

  const invites = await db.collection('invites').where({ code, used: false }).get();
  if (invites.data.length === 0) {
    throw new Error('invalid invite code');
  }

  const invite = invites.data[0];
  if (invite.creator_openid === OPENID) {
    throw new Error('cannot pair with yourself');
  }

  if (new Date(invite.expires_at) < new Date()) {
    throw new Error('invalid invite code');
  }

  const coupleRoom = {
    members: [invite.creator_openid, OPENID],
    stage: 'love',
    timezone: 'Asia/Shanghai',
    paired_at: new Date().toISOString()
  };
  const roomResult = await db.collection('couple_rooms').add({ data: coupleRoom });
  const coupleId = roomResult._id;

  await db.collection('invites').doc(invite._id).update({ data: { used: true } });
  await db.collection('users').where({ openid: invite.creator_openid }).update({ data: { couple_id: coupleId } });
  await db.collection('users').where({ openid: OPENID }).update({ data: { couple_id: coupleId } });

  return { success: true, couple_id: coupleId };
};