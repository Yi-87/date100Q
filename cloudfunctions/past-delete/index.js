const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const { partner_openid } = event;
  const { OPENID } = cloud.getWXContext();
  const db = cloud.database();
  const _ = db.command;

  if (!partner_openid) {
    throw new Error('partner_openid is required');
  }

  const usersRes = await db.collection('users').where({ openid: OPENID }).get();
  if (usersRes.data.length === 0) {
    throw new Error('user not found');
  }

  const user = usersRes.data[0];
  const hidden = user.hidden_past_partners || [];

  if (hidden.includes(partner_openid)) {
    return { success: true, already_hidden: true };
  }

  hidden.push(partner_openid);
  await db.collection('users').where({ openid: OPENID }).update({
    data: { hidden_past_partners: hidden }
  });

  return { success: true };
};
