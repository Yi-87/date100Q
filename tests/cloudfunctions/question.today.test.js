// tests/cloudfunctions/question.today.test.js
const cloud = require('wx-server-sdk');
const path = require('path');
const fs = require('fs');

cloud.getWXContext = () => ({
  OPENID: 'openid_user_a',
  APPID: 'test_appid',
  UNIONID: 'test_unionid'
});

beforeEach(() => {
  resetMockDB();
});

test('question/today: creates daily question for couple on first call', async () => {
  seedDB('couple_rooms', [{
    _id: 'couple_001', members: ['openid_user_a', 'openid_user_b'], stage: 'love', timezone: 'Asia/Shanghai'
  }]);
  seedDB('users', [{
    _id: 'user_a', openid: 'openid_user_a', couple_id: 'couple_001'
  }]);

  const handler = require('../../cloudfunctions/question-today/index');
  const result = await handler.main({});

  expect(result.question_id).toBeDefined();
  expect(result.dimension).toBeDefined();
  expect(result.stage).toBe('love');
  expect(result.sensitivity).toBeDefined();
  expect(result.status).toBe('pending');

  if (result.sensitivity !== 'L3') {
    expect(result.text).toBeDefined();
  }

  const dqs = getDB('daily_questions');
  expect(dqs.length).toBe(1);
  expect(dqs[0].couple_id).toBe('couple_001');
  expect(dqs[0].status).toBe('pending');
});

test('question/today: returns existing daily question if already created', async () => {
  const today = new Date().toISOString().slice(0, 10);
  seedDB('couple_rooms', [{
    _id: 'couple_002', members: ['openid_user_a', 'openid_user_b'], stage: 'love', timezone: 'Asia/Shanghai'
  }]);
  seedDB('users', [{
    _id: 'user_a', openid: 'openid_user_a', couple_id: 'couple_002'
  }]);
  seedDB('daily_questions', [{
    _id: 'dq_001', couple_id: 'couple_002', question_id: 'S-01',
    text: '最近一周让你笑出来最多的一件事是什么？', dimension: 'self', stage: 'love',
    sensitivity: 'L0', date: today, status: 'pending', created_at: new Date().toISOString()
  }]);

  const handler = require('../../cloudfunctions/question-today/index');
  const result = await handler.main({});

  expect(result.question_id).toBe('S-01');
  expect(result.text).toBe('最近一周让你笑出来最多的一件事是什么？');
});

test('question/today: rejects if user has no couple_id', async () => {
  seedDB('users', [{ _id: 'user_a', openid: 'openid_user_a', couple_id: null }]);

  const handler = require('../../cloudfunctions/question-today/index');
  await expect(handler.main({})).rejects.toThrow('not paired');
});