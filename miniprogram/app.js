App({
  onLaunch() {
    wx.cloud.init({ env: 'cloud1-d5gn9537i36303503' });
    this.globalData = { userInfo: null, coupleId: null };
  }
});