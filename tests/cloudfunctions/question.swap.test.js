// tests/cloudfunctions/question.swap.test.js
const cloud = require('wx-server-sdk');

cloud.getWXContext = () => ({
  OPENID: 'openid_user_a',
  APPID: 'test_appid',
  UNIONID: 'test_unionid'
});

beforeEach(() => {
  resetMockDB();
});

test('question/swap: replaces today question with new one from same stage', async () => {
  const today = new Date().toISOString().slice(0, 10);
  seedDB('users', [{ _id: 'user_a', openid: 'openid_user_a', couple_id: 'couple_001' }]);
  seedDB('couple_rooms', [{
    _id: 'couple_001', members: ['openid_user_a', 'openid_user_b'], stage: 'love'
  }]);
  seedDB('daily_questions', [{
    _id: 'dq_001', couple_id: 'couple_001', question_id: 'S-01',
    text: '最近一周让你笑出来最多的一件事是什么？', dimension: 'self', stage: 'love',
    sensitivity: 'L0', date: today, status: 'pending', swap_count: 0, created_at: new Date().toISOString()
  }]);

  const handler = require('../../cloudfunctions/question-swap/index');
  const result = await handler.main({});

  expect(result.question_id).toBeDefined();
  expect(result.question_id).not.toBe('S-01');
  expect(result.stage).toBe('love');

  const dqs = getDB('daily_questions');
  const updated = dqs.find(d => d.couple_id === 'couple_001' && d.date === today);
  expect(updated.question_id).toBe(result.question_id);
  expect(updated.swap_count).toBe(1);
});

test('question/swap: rejects if swap already used today', async () => {
  const today = new Date().toISOString().slice(0, 10);
  seedDB('users', [{ _id: 'user_a', openid: 'openid_user_a', couple_id: 'couple_001' }]);
  seedDB('couple_rooms', [{
    _id: 'couple_001', members: ['openid_user_a', 'openid_user_b'], stage: 'love'
  }]);
  seedDB('daily_questions', [{
    _id: 'dq_002', couple_id: 'couple_001', question_id: 'S-01', text: '...',
    dimension: 'self', stage: 'love', sensitivity: 'L0', date: today,
    status: 'pending', swap_count: 1, created_at: new Date().toISOString()
  }]);

  const handler = require('../../cloudfunctions/question-swap/index');
  await expect(handler.main({})).rejects.toThrow('no swap remaining');
});

test('question/swap: rejects if partner already answered', async () => {
  const today = new Date().toISOString().slice(0, 10);
  seedDB('users', [{ _id: 'user_a', openid: 'openid_user_a', couple_id: 'couple_001' }]);
  seedDB('couple_rooms', [{
    _id: 'couple_001', members: ['openid_user_a', 'openid_user_b'], stage: 'love'
  }]);
  seedDB('daily_questions', [{
    _id: 'dq_003', couple_id: 'couple_001', question_id: 'S-01', text: '...',
    dimension: 'self', stage: 'love', sensitivity: 'L0', date: today,
    status: 'half_answered', swap_count: 0, created_at: new Date().toISOString()
  }]);
  seedDB('answers', [{
    _id: 'ans_001', question_id: 'dq_003', user_openid: 'openid_user_b',
    content: '对方已答', submitted_at: new Date().toISOString()
  }]);

  const handler = require('../../cloudfunctions/question-swap/index');
  await expect(handler.main({})).rejects.toThrow('partner already answered');
});