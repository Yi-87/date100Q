const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const { question_id } = event;
  const { OPENID } = cloud.getWXContext();
  const db = cloud.database();

  if (!question_id) {
    throw new Error('question_id is required');
  }

  const users = await db.collection('users').where({ openid: OPENID }).get();
  if (users.data.length === 0 || !users.data[0].couple_id) {
    throw new Error('not paired');
  }

  const coupleId = users.data[0].couple_id;
  const today = new Date().toISOString().slice(0, 10);

  const existing = await db.collection('daily_questions')
    .where({ couple_id: coupleId, date: today })
    .get();

  if (existing.data.length === 0) {
    throw new Error('no question today');
  }

  const dq = existing.data[0];
  if (dq.sensitivity !== 'L3') {
    throw new Error('not an L3 question');
  }

  const readyOpenids = dq.ready_openids || [];
  if (readyOpenids.includes(OPENID)) {
    return { ready_openids: readyOpenids, unlocked: readyOpenids.length >= 2 };
  }

  readyOpenids.push(OPENID);
  const unlocked = readyOpenids.length >= 2;

  const updateData = { ready_openids: readyOpenids };
  if (unlocked) {
    const questionsData = require('./questions.json');
    const question = questionsData.questions.find(q => q.id === dq.question_id);
    if (question) {
      updateData.text = question.text;
      updateData.status = 'pending';
    }
  }

  await db.collection('daily_questions').doc(dq._id).update({ data: updateData });

  const result = { ready_openids: readyOpenids, unlocked };

  if (unlocked) {
    const questionsData = require('./questions.json');
    const question = questionsData.questions.find(q => q.id === dq.question_id);
    if (question) {
      result.text = question.text;
    }
  }

  return result;
};