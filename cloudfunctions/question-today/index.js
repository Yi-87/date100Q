const cloud = require('wx-server-sdk');
const path = require('path');
const fs = require('fs');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const questionsData = JSON.parse(
  fs.readFileSync(path.join(__dirname, './questions.json'), 'utf-8')
);

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function pickQuestion(stage, recentDimensionIds) {
  const pool = questionsData.questions.filter(q =>
    q.stage === stage && !recentDimensionIds.includes(q.dimension)
  );
  if (pool.length === 0) {
    return questionsData.questions.find(q => q.stage === stage) || null;
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const db = cloud.database();
  const today = getTodayDate();

  const users = await db.collection('users').where({ openid: OPENID }).get();
  if (users.data.length === 0 || !users.data[0].couple_id) {
    throw new Error('not paired');
  }

  const coupleId = users.data[0].couple_id;
  const rooms = await db.collection('couple_rooms').doc(coupleId).get();
  if (rooms.data.length === 0) {
    throw new Error('couple room not found');
  }

  const room = rooms.data[0];
  const stage = room.stage || 'love';

  const existing = await db.collection('daily_questions')
    .where({ couple_id: coupleId, date: today })
    .get();

  if (existing.data.length > 0) {
    const dq = existing.data[0];
    const result = {
      question_id: dq.question_id,
      dimension: dq.dimension,
      stage: dq.stage,
      sensitivity: dq.sensitivity,
      status: dq.status
    };
    if (dq.sensitivity === 'L3') {
      result.ready_openids = dq.ready_openids || [];
    } else {
      result.text = dq.text;
    }
    return result;
  }

  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const recent = await db.collection('daily_questions')
    .where({ couple_id: coupleId })
    .get();

  const recentDimensionIds = recent.data
    .filter(r => r.date >= fourteenDaysAgo)
    .map(r => r.dimension);

  const question = pickQuestion(stage, recentDimensionIds);
  if (!question) {
    return { question_id: null, text: '今天休息一天', status: 'empty' };
  }

  const dqRecord = {
    couple_id: coupleId,
    question_id: question.id,
    dimension: question.dimension,
    stage: question.stage,
    sensitivity: question.sensitivity,
    date: today,
    status: 'pending',
    ready_openids: [],
    created_at: new Date().toISOString()
  };
  if (question.sensitivity !== 'L3') {
    dqRecord.text = question.text;
  }
  await db.collection('daily_questions').add({ data: dqRecord });

  const result = {
    question_id: question.id,
    dimension: question.dimension,
    stage: question.stage,
    sensitivity: question.sensitivity,
    status: 'pending'
  };
  if (question.sensitivity === 'L3') {
    result.ready_openids = [];
  } else {
    result.text = question.text;
  }
  return result;
};