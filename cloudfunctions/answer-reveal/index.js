const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const { question_id } = event;
  const { OPENID } = cloud.getWXContext();
  const db = cloud.database();

  const dqs = await db.collection('daily_questions').doc(question_id).get();
  if (dqs.data.length === 0) {
    throw new Error('question not found');
  }

  const dq = dqs.data[0];
  const isL3 = dq.sensitivity === 'L3';

  if (dq.status !== 'revealed') {
    return { status: 'waiting' };
  }

  const answers = await db.collection('answers')
    .where({ question_id })
    .get();

  const myAnswer = answers.data.find(a => a.user_openid === OPENID);
  const partnerAnswer = answers.data.find(a => a.user_openid !== OPENID);

  return {
    status: 'revealed',
    question_id: dq.question_id,
    text: dq.text,
    dimension: dq.dimension,
    sensitivity: dq.sensitivity,
    my_answer: myAnswer ? { content: myAnswer.content } : null,
    partner_answer: partnerAnswer
      ? { content: isL3 ? '（已私密保留）' : partnerAnswer.content }
      : null
  };
};