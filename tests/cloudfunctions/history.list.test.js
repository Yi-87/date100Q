// tests/cloudfunctions/history.list.test.js
const cloud = require('wx-server-sdk');

cloud.getWXContext = () => ({
  OPENID: 'openid_user_a',
  APPID: 'test_appid',
  UNIONID: 'test_unionid'
});

beforeEach(() => {
  resetMockDB();
});

test('history/list: returns only revealed questions with answers', async () => {
  seedDB('users', [{ _id: 'user_a', openid: 'openid_user_a', couple_id: 'couple_001' }]);
  seedDB('daily_questions', [
    { _id: 'dq_001', couple_id: 'couple_001', question_id: 'S-01', text: '题1', dimension: 'self', sensitivity: 'L0', status: 'revealed', date: '2026-06-30', created_at: '2026-06-30T10:00:00Z' },
    { _id: 'dq_002', couple_id: 'couple_001', question_id: 'S-02', text: '题2', dimension: 'self', sensitivity: 'L0', status: 'half_answered', date: '2026-06-29', created_at: '2026-06-29T10:00:00Z' },
    { _id: 'dq_003', couple_id: 'couple_001', question_id: 'S-03', text: '题3', dimension: 'self', sensitivity: 'L0', status: 'revealed', date: '2026-06-28', created_at: '2026-06-28T10:00:00Z' }
  ]);
  seedDB('answers', [
    { _id: 'a1', question_id: 'dq_001', user_openid: 'openid_user_a', content: 'A1', submitted_at: '2026-06-30T10:00:00Z' },
    { _id: 'a2', question_id: 'dq_001', user_openid: 'openid_user_b', content: 'B1', submitted_at: '2026-06-30T10:05:00Z' },
    { _id: 'a3', question_id: 'dq_003', user_openid: 'openid_user_a', content: 'A3', submitted_at: '2026-06-28T10:00:00Z' },
    { _id: 'a4', question_id: 'dq_003', user_openid: 'openid_user_b', content: 'B3', submitted_at: '2026-06-28T10:05:00Z' }
  ]);

  const handler = require('../../cloudfunctions/history-list/index');
  const result = await handler.main({});

  expect(result.items.length).toBe(2);
  expect(result.items.every(i => i.status === 'revealed')).toBe(true);
  expect(result.items.some(i => i.question_id === 'S-02')).toBe(false);
});

test('history/list: L3 questions hide answer text', async () => {
  seedDB('users', [{ _id: 'user_a', openid: 'openid_user_a', couple_id: 'couple_001' }]);
  seedDB('daily_questions', [{
    _id: 'dq_l3', couple_id: 'couple_001', question_id: 'M-01', text: '彩礼题',
    dimension: 'money', sensitivity: 'L3', status: 'revealed', date: '2026-06-30',
    created_at: '2026-06-30T10:00:00Z'
  }]);
  seedDB('answers', [
    { _id: 'a5', question_id: 'dq_l3', user_openid: 'openid_user_a', content: 'A_l3', submitted_at: '2026-06-30T10:00:00Z' },
    { _id: 'a6', question_id: 'dq_l3', user_openid: 'openid_user_b', content: 'B_l3', submitted_at: '2026-06-30T10:05:00Z' }
  ]);

  const handler = require('../../cloudfunctions/history-list/index');
  const result = await handler.main({});

  expect(result.items.length).toBe(1);
  expect(result.items[0].partner_answer).toBe('（已私密保留）');
});