const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const { difficulty, reminder_enabled, l3_enabled } = event;
  const { OPENID } = cloud.getWXContext();
  const db = cloud.database();

  const users = await db.collection('users').where({ openid: OPENID }).get();
  if (users.data.length === 0 || !users.data[0].couple_id) {
    throw new Error('not paired');
  }

  const coupleId = users.data[0].couple_id;
  const updateData = {};

  if (difficulty !== undefined) {
    updateData.difficulty = difficulty;
  }
  if (reminder_enabled !== undefined) {
    updateData.reminder_enabled = reminder_enabled;
  }
  if (l3_enabled !== undefined) {
    updateData.l3_enabled = l3_enabled;
  }

  if (Object.keys(updateData).length === 0) {
    throw new Error('no settings to update');
  }

  await db.collection('couple_rooms').doc(coupleId).update({ data: updateData });

  return { success: true };
};