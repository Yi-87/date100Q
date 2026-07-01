// tests/cloudfunctions/answer.reveal.test.js
const cloud = require('wx-server-sdk');

cloud.getWXContext = () => ({
  OPENID: 'openid_user_a',
  APPID: 'test_appid',
  UNIONID: 'test_unionid'
});

beforeEach(() => {
  resetMockDB();
});

test('answer/reveal: returns both answers when revealed', async () => {
  seedDB('users', [{ _id: 'user_a', openid: 'openid_user_a', couple_id: 'couple_001' }]);
  seedDB('daily_questions', [{
    _id: 'dq_001', couple_id: 'couple_001', question_id: 'S-01',
    text: '最近一周让你笑出来最多的一件事是什么？', dimension: 'self', sensitivity: 'L0',
    status: 'revealed', date: new Date().toISOString().slice(0, 10),
    swap_count: 0, created_at: new Date().toISOString()
  }]);
  seedDB('answers', [
    { _id: 'a1', question_id: 'dq_001', user_openid: 'openid_user_a', content: '我的答案', submitted_at: '2026-06-30T10:00:00Z' },
    { _id: 'a2', question_id: 'dq_001', user_openid: 'openid_user_b', content: 'TA的答案', submitted_at: '2026-06-30T10:05:00Z' }
  ]);

  const handler = require('../../cloudfunctions/answer-reveal/index');
  const result = await handler.main({ question_id: 'dq_001' });

  expect(result.status).toBe('revealed');
  expect(result.my_answer).toBeDefined();
  expect(result.partner_answer).toBeDefined();
  expect(result.my_answer.content).toBe('我的答案');
  expect(result.partner_answer.content).toBe('TA的答案');
});

test('answer/reveal: returns waiting when half_answered', async () => {
  seedDB('users', [{ _id: 'user_a', openid: 'openid_user_a', couple_id: 'couple_001' }]);
  seedDB('daily_questions', [{
    _id: 'dq_002', couple_id: 'couple_001', question_id: 'S-01', text: '...',
    dimension: 'self', sensitivity: 'L0', status: 'half_answered',
    date: new Date().toISOString().slice(0, 10), swap_count: 0, created_at: new Date().toISOString()
  }]);

  const handler = require('../../cloudfunctions/answer-reveal/index');
  const result = await handler.main({ question_id: 'dq_002' });

  expect(result.status).toBe('waiting');
});

test('answer/reveal: L3 question hides partner answer text', async () => {
  seedDB('users', [{ _id: 'user_a', openid: 'openid_user_a', couple_id: 'couple_001' }]);
  seedDB('daily_questions', [{
    _id: 'dq_003', couple_id: 'couple_001', question_id: 'M-01',
    text: '你对彩礼/嫁妆这件事的真实态度是什么？', dimension: 'money', sensitivity: 'L3',
    status: 'revealed', date: new Date().toISOString().slice(0, 10),
    swap_count: 0, created_at: new Date().toISOString()
  }]);
  seedDB('answers', [
    { _id: 'a3', question_id: 'dq_003', user_openid: 'openid_user_a', content: '我的L3答案', submitted_at: '2026-06-30T10:00:00Z' },
    { _id: 'a4', question_id: 'dq_003', user_openid: 'openid_user_b', content: 'TA的L3答案', submitted_at: '2026-06-30T10:05:00Z' }
  ]);

  const handler = require('../../cloudfunctions/answer-reveal/index');
  const result = await handler.main({ question_id: 'dq_003' });

  expect(result.status).toBe('revealed');
  expect(result.my_answer.content).toBe('我的L3答案');
  expect(result.partner_answer.content).toBe('（已私密保留）');
});