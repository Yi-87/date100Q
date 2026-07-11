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
  const stage = rooms.data[0].stage || 'love';

  const existing = await db.collection('daily_questions')
    .where({ couple_id: coupleId, date: today })
    .get();

  if (existing.data.length === 0) {
    throw new Error('no question to swap');
  }

  const current = existing.data[0];
  if (current.swap_count >= 1) {
    throw new Error('no swap remaining');
  }

  const answers = await db.collection('answers')
    .where({ question_id: current._id })
    .get();
  const partnerAnswers = answers.data.filter(a => a.user_openid !== OPENID);
  if (partnerAnswers.length > 0) {
    throw new Error('partner already answered');
  }

  const pool = questionsData.questions.filter(q =>
    q.stage === stage && q.id !== current.question_id
  );
  if (pool.length === 0) {
    throw new Error('no question to swap');
  }

  const newQuestion = pool[Math.floor(Math.random() * pool.length)];
  const updateData = {
    question_id: newQuestion.id,
    dimension: newQuestion.dimension,
    sensitivity: newQuestion.sensitivity,
    status: 'pending',
    ready_openids: [],
    swap_count: current.swap_count + 1
  };
  if (newQuestion.sensitivity !== 'L3') {
    updateData.text = newQuestion.text;
  }

  await db.collection('daily_questions').doc(current._id).update({ data: updateData });

  const result = {
    question_id: newQuestion.id,
    dimension: newQuestion.dimension,
    stage: newQuestion.stage,
    sensitivity: newQuestion.sensitivity,
    status: 'pending'
  };
  if (newQuestion.sensitivity === 'L3') {
    result.ready_openids = [];
  } else {
    result.text = newQuestion.text;
  }
  return result;
};