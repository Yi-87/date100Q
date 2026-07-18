const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const db = cloud.database();
  const _ = db.command;

  const users = await db.collection('users').where({ openid: OPENID }).get();
  if (users.data.length === 0 || !users.data[0].couple_id) {
    throw new Error('not paired');
  }

  const coupleId = users.data[0].couple_id;

  const dqs = await db.collection('daily_questions')
    .where({ couple_id: coupleId, status: 'revealed' })
    .orderBy('date', 'desc')
    .get();

  if (dqs.data.length === 0) {
    return { items: [] };
  }

  // 一次性查出所有相关答案，避免 N+1 查询
  const dqIds = dqs.data.map(d => d._id);
  const allAnswersRes = await db.collection('answers')
    .where({ question_id: _.in(dqIds) })
    .get();

  const answersByQid = {};
  allAnswersRes.data.forEach(a => {
    if (!answersByQid[a.question_id]) answersByQid[a.question_id] = [];
    answersByQid[a.question_id].push(a);
  });

  const items = dqs.data.map(dq => {
    const answers = answersByQid[dq._id] || [];
    const myAnswer = answers.find(a => a.user_openid === OPENID);
    const partnerAnswer = answers.find(a => a.user_openid !== OPENID);
    const isL3 = dq.sensitivity === 'L3';

    return {
      question_id: dq.question_id,
      text: dq.text,
      dimension: dq.dimension,
      sensitivity: dq.sensitivity,
      status: dq.status,
      date: dq.date,
      my_answer: myAnswer ? myAnswer.content : null,
      partner_answer: isL3 ? '（已私密保留）' : (partnerAnswer ? partnerAnswer.content : null)
    };
  });

  return { items };
};