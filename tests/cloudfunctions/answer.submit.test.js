// tests/cloudfunctions/answer.submit.test.js
const cloud = require('wx-server-sdk');

cloud.getWXContext = () => ({
  OPENID: 'openid_user_a',
  APPID: 'test_appid',
  UNIONID: 'test_unionid'
});

beforeEach(() => {
  resetMockDB();
});

test('answer/submit: saves answer and returns waiting when partner not answered', async () => {
  const today = new Date().toISOString().slice(0, 10);
  seedDB('users', [{ _id: 'user_a', openid: 'openid_user_a', couple_id: 'couple_001' }]);
  seedDB('daily_questions', [{
    _id: 'dq_001', couple_id: 'couple_001', question_id: 'S-01',
    text: '最近一周让你笑出来最多的一件事是什么？', dimension: 'self', sensitivity: 'L0',
    date: today, status: 'pending', swap_count: 0, created_at: new Date().toISOString()
  }]);

  const handler = require('../../cloudfunctions/answer-submit/index');
  const result = await handler.main({ question_id: 'S-01', content: '和TA一起看日落' });

  expect(result.status).toBe('waiting');

  const answers = getDB('answers');
  expect(answers.length).toBe(1);
  expect(answers[0].content).toBe('和TA一起看日落');
  expect(answers[0].user_openid).toBe('openid_user_a');
  expect(answers[0].question_id).toBe('dq_001');

  const dqs = getDB('daily_questions');
  expect(dqs[0].status).toBe('half_answered');
});

test('answer/submit: sets status to revealed when both partners answered', async () => {
  const today = new Date().toISOString().slice(0, 10);
  seedDB('users', [{ _id: 'user_a', openid: 'openid_user_a', couple_id: 'couple_001' }]);
  seedDB('daily_questions', [{
    _id: 'dq_002', couple_id: 'couple_001', question_id: 'S-01',
    text: '最近一周让你笑出来最多的一件事是什么？', dimension: 'self', sensitivity: 'L0',
    date: today, status: 'half_answered', swap_count: 0, created_at: new Date().toISOString()
  }]);
  seedDB('answers', [{
    _id: 'ans_001', question_id: 'dq_002', user_openid: 'openid_user_b',
    content: '对方先答了', submitted_at: new Date().toISOString()
  }]);

  const handler = require('../../cloudfunctions/answer-submit/index');
  const result = await handler.main({ question_id: 'S-01', content: '我后答' });

  expect(result.status).toBe('revealed');

  const dqs = getDB('daily_questions');
  expect(dqs[0].status).toBe('revealed');
});

test('answer/submit: rejects empty content', async () => {
  seedDB('users', [{ _id: 'user_a', openid: 'openid_user_a', couple_id: 'couple_001' }]);
  seedDB('daily_questions', [{
    _id: 'dq_003', couple_id: 'couple_001', question_id: 'S-01', text: '...',
    dimension: 'self', sensitivity: 'L0', date: new Date().toISOString().slice(0, 10),
    status: 'pending', swap_count: 0, created_at: new Date().toISOString()
  }]);

  const handler = require('../../cloudfunctions/answer-submit/index');
  await expect(handler.main({ question_id: 'S-01', content: '' })).rejects.toThrow('content required');
});

test('answer/submit: rejects duplicate submission', async () => {
  seedDB('users', [{ _id: 'user_a', openid: 'openid_user_a', couple_id: 'couple_001' }]);
  seedDB('daily_questions', [{
    _id: 'dq_004', couple_id: 'couple_001', question_id: 'S-01', text: '...',
    dimension: 'self', sensitivity: 'L0', date: new Date().toISOString().slice(0, 10),
    status: 'half_answered', swap_count: 0, created_at: new Date().toISOString()
  }]);
  seedDB('answers', [{
    _id: 'ans_dup', question_id: 'dq_004', user_openid: 'openid_user_a',
    content: '已答', submitted_at: new Date().toISOString()
  }]);

  const handler = require('../../cloudfunctions/answer-submit/index');
  await expect(handler.main({ question_id: 'S-01', content: '再答一次' })).rejects.toThrow('already answered');
});