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

  // 查询与该 partner 的所有已解绑 couple_rooms
  const roomsRes = await db.collection('couple_rooms')
    .where({
      members: _.elemMatch(_.eq(OPENID)),
      deleted_at: _.exists(true)
    })
    .get();

  const coupleIds = roomsRes.data
    .filter(room => (room.members || []).includes(partner_openid))
    .map(room => room._id);

  if (coupleIds.length === 0) {
    throw new Error('no past relationship with this partner');
  }

  const dqs = await db.collection('daily_questions')
    .where({
      couple_id: _.in(coupleIds),
      status: 'revealed'
    })
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
