const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const VALID_STAGES = ['love', 'pre_marriage', 'marriage'];

exports.main = async (event) => {
  const { stage } = event;
  const { OPENID } = cloud.getWXContext();
  const db = cloud.database();

  if (!VALID_STAGES.includes(stage)) {
    throw new Error('invalid stage');
  }

  const users = await db.collection('users').where({ openid: OPENID }).get();
  if (users.data.length === 0 || !users.data[0].couple_id) {
    throw new Error('not paired');
  }

  const coupleId = users.data[0].couple_id;
  await db.collection('couple_rooms').doc(coupleId).update({
    data: { stage }
  });

  return { stage };
};