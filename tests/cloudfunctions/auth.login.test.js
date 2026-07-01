// tests/cloudfunctions/auth.login.test.js
const cloud = require('wx-server-sdk');

// Mock code2Session
cloud.openapi = {
  auth: {
    code2Session: jest.fn()
  }
};

beforeEach(() => {
  resetMockDB();
  cloud.openapi.auth.code2Session.mockReset();
});

test('auth/login: new user creates profile and returns openid', async () => {
  cloud.openapi.auth.code2Session.mockResolvedValue({
    openid: 'wx_openid_001',
    unionid: 'wx_unionid_001'
  });

  const handler = require('../../cloudfunctions/auth-login/index');
  const result = await handler.main({ code: 'test_code_001' });

  expect(result.openid).toBe('wx_openid_001');
  expect(result.isNew).toBe(true);

  const users = getDB('users');
  expect(users.length).toBe(1);
  expect(users[0].openid).toBe('wx_openid_001');
  expect(users[0].unionid).toBe('wx_unionid_001');
  expect(users[0].couple_id).toBeNull();
  expect(users[0].created_at).toBeDefined();
});

test('auth/login: existing user returns profile with couple_id', async () => {
  cloud.openapi.auth.code2Session.mockResolvedValue({
    openid: 'wx_openid_002',
    unionid: 'wx_unionid_002'
  });

  seedDB('users', [{
    _id: 'user_002',
    openid: 'wx_openid_002',
    unionid: 'wx_unionid_002',
    couple_id: 'couple_abc',
    created_at: '2026-06-01T00:00:00Z'
  }]);

  const handler = require('../../cloudfunctions/auth-login/index');
  const result = await handler.main({ code: 'test_code_002' });

  expect(result.openid).toBe('wx_openid_002');
  expect(result.isNew).toBe(false);
  expect(result.couple_id).toBe('couple_abc');
});

test('auth/login: code2Session failure returns error', async () => {
  cloud.openapi.auth.code2Session.mockRejectedValue(new Error('invalid code'));

  const handler = require('../../cloudfunctions/auth-login/index');
  await expect(handler.main({ code: 'bad_code' })).rejects.toThrow('login failed');
});