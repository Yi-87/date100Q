const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const { question_id, content } = event;
  const { OPENID } = cloud.getWXContext();
  const db = cloud.database();

  if (!content || !content.trim()) {
    throw new Error('content required');
  }

  const users = await db.collection('users').where({ openid: OPENID }).get();
  if (users.data.length === 0 || !users.data[0].couple_id) {
    throw new Error('not paired');
  }

  const coupleId = users.data[0].couple_id;

  const dqs = await db.collection('daily_questions')
    .where({ couple_id: coupleId, question_id })
    .get();
  if (dqs.data.length === 0) {
    throw new Error('question not found');
  }
  const dq = dqs.data[0];
  const dqId = dq._id;

  const existing = await db.collection('answers')
    .where({ question_id: dqId, user_openid: OPENID })
    .get();
  if (existing.data.length > 0) {
    throw new Error('already answered');
  }

  await db.collection('answers').add({
    data: {
      question_id: dqId,
      user_openid: OPENID,
      content: content.trim(),
      submitted_at: new Date().toISOString()
    }
  });

  const allAnswers = await db.collection('answers')
    .where({ question_id: dqId })
    .get();

  if (allAnswers.data.length >= 2) {
    await db.collection('daily_questions').doc(dqId).update({
      data: { status: 'revealed' }
    });
    return { status: 'revealed' };
  }

  await db.collection('daily_questions').doc(dqId).update({
    data: { status: 'half_answered' }
  });
  return { status: 'waiting' };
};