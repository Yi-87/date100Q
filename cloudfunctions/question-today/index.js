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

const SENSITIVITY_ORDER = { L0: 0, L1: 1, L2: 2, L3: 3 };

function pickQuestion(stage, recentDimensionIds, difficulty, l3Enabled) {
  let pool = questionsData.questions.filter(q =>
    q.stage === stage && !recentDimensionIds.includes(q.dimension)
  );

  // 难度筛选
  if (difficulty && difficulty !== 'all') {
    const maxLevel = SENSITIVITY_ORDER[difficulty];
    if (maxLevel !== undefined) {
      pool = pool.filter(q => SENSITIVITY_ORDER[q.sensitivity] <= maxLevel);
    }
  }

  // L3 开关
  if (!l3Enabled) {
    pool = pool.filter(q => q.sensitivity !== 'L3');
  }

  if (pool.length === 0) {
    // 放宽条件：不考虑维度去重，但仍遵守难度和L3设置
    pool = questionsData.questions.filter(q => {
      if (q.stage !== stage) return false;
      if (difficulty && difficulty !== 'all') {
        const maxLevel = SENSITIVITY_ORDER[difficulty];
        if (maxLevel !== undefined && SENSITIVITY_ORDER[q.sensitivity] > maxLevel) return false;
      }
      if (!l3Enabled && q.sensitivity === 'L3') return false;
      return true;
    });
  }
  if (pool.length === 0) {
    // 最后兜底：同阶段任意题
    return questionsData.questions.find(q => q.stage === stage) || null;
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const db = cloud.database();
  const _ = db.command;
  const today = getTodayDate();

  const users = await db.collection('users').where({ openid: OPENID }).get();
  if (users.data.length === 0 || !users.data[0].couple_id) {
    throw new Error('not paired');
  }

  const coupleId = users.data[0].couple_id;
  let room;
  try {
    const rooms = await db.collection('couple_rooms').doc(coupleId).get();
    room = rooms.data;
  } catch (e) {
    throw new Error('couple room not found');
  }
  const stage = room.stage || 'love';
  const difficulty = room.difficulty || 'all';
  const l3Enabled = room.l3_enabled || false;

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
      status: dq.status,
      difficulty,
      l3_enabled: l3Enabled
    };
    if (dq.sensitivity === 'L3') {
      result.ready_openids = dq.ready_openids || [];
      result.my_ready = (dq.ready_openids || []).includes(OPENID);
      if (dq.status === 'revealed') {
        const question = questionsData.questions.find(q => q.id === dq.question_id);
        if (question) result.text = question.text;
      }
    } else {
      result.text = dq.text;
    }
    return result;
  }

  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const recent = await db.collection('daily_questions')
    .where({ couple_id: coupleId, date: _.gte(fourteenDaysAgo) })
    .get();

  const recentDimensionIds = recent.data.map(r => r.dimension);

  const question = pickQuestion(stage, recentDimensionIds, difficulty, l3Enabled);
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
    status: 'pending',
    difficulty,
    l3_enabled: l3Enabled
  };
  if (question.sensitivity === 'L3') {
    result.ready_openids = [];
    result.my_ready = false;
  } else {
    result.text = question.text;
  }
  return result;
};