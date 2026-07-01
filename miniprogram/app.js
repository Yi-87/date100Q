App({
  onLaunch() {
    wx.cloud.init({ env: 'your-env-id' });
    this.globalData = { userInfo: null, coupleId: null };
  }
});