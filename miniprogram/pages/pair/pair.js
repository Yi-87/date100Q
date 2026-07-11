const api = require('../../utils/api');

function getErrorMessage(e) {
  const errMsg = e.errMsg || e.message || '';
  const match = errMsg.match(/Error: (.+?)(\n|$)/);
  return match ? match[1] : '操作失败';
}

Page({
  data: { role: 'none', inviteCode: '', myCode: '', expiresAt: '', errorMsg: '' },
  onCreateInvite() {
    api.createInvite().then(res => {
      this.setData({ role: 'creator', myCode: res.code, expiresAt: res.expires_at, errorMsg: '' });
    }).catch(e => {
      this.setData({ errorMsg: getErrorMessage(e) });
      wx.showToast({ title: getErrorMessage(e), icon: 'none' });
    });
  },
  onJoinMode() { this.setData({ role: 'joiner', errorMsg: '' }); },
  onCodeInput(e) { this.setData({ inviteCode: e.detail.value }); },
  onJoin() {
    api.join(this.data.inviteCode).then(() => {
      wx.showToast({ title: '配对成功！' });
      wx.switchTab({ url: '/pages/index/index' });
    }).catch(e => {
      const msg = getErrorMessage(e);
      this.setData({ errorMsg: msg });
      wx.showToast({ title: msg, icon: 'none' });
    });
  },
  onCopy() {
    wx.setClipboardData({ data: this.data.myCode });
    wx.showToast({ title: '已复制', icon: 'none' });
  }
});