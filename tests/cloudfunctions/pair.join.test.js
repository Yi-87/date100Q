// tests/cloudfunctions/pair.join.test.js
const cloud = require('wx-server-sdk');

cloud.getWXContext = () => ({
  OPENID: 'openid_joiner',
  APPID: 'test_appid',
  UNIONID: 'test_unionid'
});

beforeEach(() => {
  resetMockDB();
});

test('pair/join: valid code creates couple_room and links both users', async () => {
  seedDB('invites', [{
    _id: 'invite_001', code: '123456', creator_openid: 'openid_creator',
    expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    used: false, created_at: new Date().toISOString()
  }]);
  seedDB('users', [
    { _id: 'user_creator', openid: 'openid_creator', couple_id: null },
    { _id: 'user_joiner', openid: 'openid_joiner', couple_id: null }
  ]);

  const handler = require('../../cloudfunctions/pair-join/index');
  const result = await handler.main({ code: '123456' });

  expect(result.success).toBe(true);
  expect(result.couple_id).toBeDefined();

  const rooms = getDB('couple_rooms');
  expect(rooms.length).toBe(1);
  expect(rooms[0].members).toContain('openid_creator');
  expect(rooms[0].members).toContain('openid_joiner');
  expect(rooms[0].stage).toBe('love');

  const users = getDB('users');
  const creator = users.find(u => u.openid === 'openid_creator');
  const joiner = users.find(u => u.openid === 'openid_joiner');
  expect(creator.couple_id).toBe(rooms[0]._id);
  expect(joiner.couple_id).toBe(rooms[0]._id);

  const invites = getDB('invites');
  expect(invites[0].used).toBe(true);
});

test('pair/join: expired code throws error', async () => {
  seedDB('invites', [{
    _id: 'invite_002', code: '000000', creator_openid: 'openid_creator',
    expires_at: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
    used: false, created_at: new Date().toISOString()
  }]);

  const handler = require('../../cloudfunctions/pair-join/index');
  await expect(handler.main({ code: '000000' })).rejects.toThrow('invalid');
});

test('pair/join: cannot join own invite', async () => {
  cloud.getWXContext = () => ({ OPENID: 'openid_creator' });

  seedDB('invites', [{
    _id: 'invite_003', code: '654321', creator_openid: 'openid_creator',
    expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    used: false, created_at: new Date().toISOString()
  }]);

  const handler = require('../../cloudfunctions/pair-join/index');
  await expect(handler.main({ code: '654321' })).rejects.toThrow('cannot pair with yourself');
});