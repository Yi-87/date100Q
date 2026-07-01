const api = require('../../utils/api');
Page({
  data: { role: 'none', inviteCode: '', myCode: '', expiresAt: '' },
  onCreateInvite() {
    api.createInvite().then(res => {
      this.setData({ role: 'creator', myCode: res.code, expiresAt: res.expires_at });
    });
  },
  onJoinMode() { this.setData({ role: 'joiner' }); },
  onCodeInput(e) { this.setData({ inviteCode: e.detail.value }); },
  onJoin() {
    api.join(this.data.inviteCode).then(() => {
      wx.showToast({ title: '配对成功！' });
      wx.switchTab({ url: '/pages/index/index' });
    }).catch(e => wx.showToast({ title: e.message, icon: 'none' }));
  },
  onCopy() {
    wx.setClipboardData({ data: this.data.myCode });
    wx.showToast({ title: '已复制', icon: 'none' });
  }
});