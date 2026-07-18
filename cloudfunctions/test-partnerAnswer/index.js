const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const MOCK_PARTNER_OPENID = 'mock_partner_test';

// 开发者 openid 白名单 —— 将你自己的 openid 填入此处
const DEVELOPER_OPENIDS = [
  // '你的openid'
];

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const db = cloud.database();

  // 鉴权：仅开发者可调用
  if (DEVELOPER_OPENIDS.length === 0) {
    throw new Error('test functions disabled: set DEVELOPER_OPENIDS first');
  }
  if (!DEVELOPER_OPENIDS.includes(OPENID)) {
    throw new Error('forbidden: developer only');
  }

  const today = getTodayDate();

  const users = await db.collection('users').where({ openid: OPENID }).get();
  if (users.data.length === 0 || !users.data[0].couple_id) {
    throw new Error('not paired');
  }

  const coupleId = users.data[0].couple_id;

  // 获取今日问题
  const dqs = await db.collection('daily_questions')
    .where({ couple_id: coupleId, date: today })
    .get();
  if (dqs.data.length === 0) {
    throw new Error('no question today');
  }

  const dq = dqs.data[0];

  // 检查 mock partner 是否已答
  const existing = await db.collection('answers')
    .where({ question_id: dq._id, user_openid: MOCK_PARTNER_OPENID })
    .get();
  if (existing.data.length > 0) {
    throw new Error('mock partner already answered');
  }

  // 提交模拟答案
  const mockContent = event.content || '（模拟对方的回答）';
  await db.collection('answers').add({
    data: {
      question_id: dq._id,
      user_openid: MOCK_PARTNER_OPENID,
      content: mockContent,
      submitted_at: new Date().toISOString()
    }
  });

  // 更新问题状态
  const allAnswers = await db.collection('answers')
    .where({ question_id: dq._id })
    .get();

  if (allAnswers.data.length >= 2) {
    await db.collection('daily_questions').doc(dq._id).update({
      data: { status: 'revealed' }
    });
    return { status: 'revealed' };
  }

  await db.collection('daily_questions').doc(dq._id).update({
    data: { status: 'half_answered' }
  });
  return { status: 'waiting' };
};
