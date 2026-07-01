// tests/cloudfunctions/couple.unbind.test.js
const cloud = require('wx-server-sdk');

cloud.getWXContext = () => ({
  OPENID: 'openid_user_a',
  APPID: 'test_appid',
  UNIONID: 'test_unionid'
});

beforeEach(() => {
  resetMockDB();
});

test('couple/unbind: records confirmation, unbinds when both confirmed', async () => {
  seedDB('users', [
    { _id: 'user_a', openid: 'openid_user_a', couple_id: 'couple_001' },
    { _id: 'user_b', openid: 'openid_user_b', couple_id: 'couple_001' }
  ]);
  seedDB('couple_rooms', [{
    _id: 'couple_001', members: ['openid_user_a', 'openid_user_b'],
    stage: 'love', unbind_confirmations: ['openid_user_b'], deleted_at: null
  }]);

  const handler = require('../../cloudfunctions/couple-unbind/index');
  const result = await handler.main({ action: 'confirm' });

  expect(result.unbound).toBe(true);

  const rooms = getDB('couple_rooms');
  const room = rooms.find(r => r._id === 'couple_001');
  expect(room.deleted_at).toBeDefined();

  const users = getDB('users');
  expect(users.find(u => u.openid === 'openid_user_a').couple_id).toBeNull();
  expect(users.find(u => u.openid === 'openid_user_b').couple_id).toBeNull();
});

test('couple/unbind: adds confirmation when first to confirm', async () => {
  seedDB('users', [{ _id: 'user_a', openid: 'openid_user_a', couple_id: 'couple_001' }]);
  seedDB('couple_rooms', [{
    _id: 'couple_001', members: ['openid_user_a', 'openid_user_b'],
    stage: 'love', unbind_confirmations: [], deleted_at: null
  }]);

  const handler = require('../../cloudfunctions/couple-unbind/index');
  const result = await handler.main({ action: 'confirm' });

  expect(result.unbound).toBe(false);
  expect(result.waiting_partner).toBe(true);

  const rooms = getDB('couple_rooms');
  expect(rooms[0].unbind_confirmations).toContain('openid_user_a');
});