const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const { code } = event;

  if (!code) {
    throw new Error('missing code');
  }

  let openid, unionid;
  try {
    const session = await cloud.openapi.auth.code2Session({
      jsCode: code
    });
    openid = session.openid;
    unionid = session.unionid || '';
  } catch (err) {
    throw new Error('login failed');
  }

  const db = cloud.database();
  const existing = await db.collection('users').where({ openid }).get();

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
    openid,
    unionid,
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