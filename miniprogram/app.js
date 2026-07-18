const api = require('./utils/api');

App({
  globalData: {
    userInfo: null,
    coupleId: null,
    openid: null
  },
  onLaunch() {
    wx.cloud.init({ env: 'cloud1-d5gn9537i36303503' });
    this.ensureLogin();
  },
  async ensureLogin() {
    try {
      const result = await api.login();
      this.globalData.openid = result.openid;
      this.globalData.coupleId = result.couple_id || null;
    } catch (e) {
      console.error('login failed', e);
    }
  }
});
