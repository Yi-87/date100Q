// tests/cloudfunctions/couple.updateStage.test.js
const cloud = require('wx-server-sdk');

cloud.getWXContext = () => ({
  OPENID: 'openid_user_a',
  APPID: 'test_appid',
  UNIONID: 'test_unionid'
});

beforeEach(() => {
  resetMockDB();
});

test('couple/updateStage: updates stage to pre_marriage', async () => {
  seedDB('users', [{ _id: 'user_a', openid: 'openid_user_a', couple_id: 'couple_001' }]);
  seedDB('couple_rooms', [{
    _id: 'couple_001', members: ['openid_user_a', 'openid_user_b'], stage: 'love'
  }]);

  const handler = require('../../cloudfunctions/couple-updateStage/index');
  const result = await handler.main({ stage: 'pre_marriage' });

  expect(result.stage).toBe('pre_marriage');

  const rooms = getDB('couple_rooms');
  expect(rooms[0].stage).toBe('pre_marriage');
});

test('couple/updateStage: rejects invalid stage', async () => {
  seedDB('users', [{ _id: 'user_a', openid: 'openid_user_a', couple_id: 'couple_001' }]);
  seedDB('couple_rooms', [{
    _id: 'couple_001', members: ['openid_user_a', 'openid_user_b'], stage: 'love'
  }]);

  const handler = require('../../cloudfunctions/couple-updateStage/index');
  await expect(handler.main({ stage: 'friendship' })).rejects.toThrow('invalid stage');
});