const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const db = cloud.database();

  const existing = await db.collection('users').where({ openid: OPENID }).get();
  if (existing.data.length > 0 && existing.data[0].couple_id) {
    throw new Error('already paired');
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await db.collection('invites').add({
    data: {
      code,
      creator_openid: OPENID,
      expires_at: expiresAt,
      used: false,
      created_at: new Date().toISOString()
    }
  });

  return { code, expires_at: expiresAt };
};