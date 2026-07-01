// tests/cloudfunctions/pair.createInvite.test.js
const cloud = require('wx-server-sdk');

cloud.getWXContext = () => ({
  OPENID: 'openid_creator',
  APPID: 'test_appid',
  UNIONID: 'test_unionid'
});

beforeEach(() => {
  resetMockDB();
});

test('pair/createInvite: generates 6-digit code with 10-min expiry', async () => {
  const handler = require('../../cloudfunctions/pair-createInvite/index');
  const result = await handler.main({});

  expect(result.code).toMatch(/^\d{6}$/);
  expect(result.expires_at).toBeDefined();

  const invites = getDB('invites');
  expect(invites.length).toBe(1);
  expect(invites[0].code).toBe(result.code);
  expect(invites[0].creator_openid).toBe('openid_creator');
  expect(invites[0].used).toBe(false);

  const expiresAt = new Date(invites[0].expires_at).getTime();
  const now = Date.now();
  const diffMin = (expiresAt - now) / 60000;
  expect(diffMin).toBeGreaterThan(9);
  expect(diffMin).toBeLessThan(11);
});

test('pair/createInvite: rejects if creator already paired', async () => {
  seedDB('users', [{
    _id: 'user_creator', openid: 'openid_creator', couple_id: 'couple_abc'
  }]);

  const handler = require('../../cloudfunctions/pair-createInvite/index');
  await expect(handler.main({})).rejects.toThrow('already paired');
});