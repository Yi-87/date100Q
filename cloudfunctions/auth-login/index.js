const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const { OPENID, UNIONID } = cloud.getWXContext();
  const db = cloud.database();

  const existing = await db.collection('users').where({ openid: OPENID }).get();

  if (existing.data.length > 0) {
    const user = existing.data[0];
    return {
      openid: user.openid,
      isNew: false,
      couple_id: user.couple_id || null,
      created_at: user.created_at
    };
  }

  const newUser = {
    openid: OPENID,
    unionid: UNIONID || '',
    couple_id: null,
    created_at: new Date().toISOString()
  };
  await db.collection('users').add({ data: newUser });

  return {
    openid: newUser.openid,
    isNew: true,
    couple_id: null,
    created_at: newUser.created_at
  };
};
