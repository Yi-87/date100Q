const api = require('../../utils/api');

function getErrorMessage(e) {
  const errMsg = e.errMsg || e.message || '';
  const match = errMsg.match(/Error: (.+?)(\n|$)/);
  return match ? match[1] : '操作失败';
}

Page({
  data: {
    role: 'none',
    inviteCode: '',
    myCode: '',
    expiresAt: '',
    errorMsg: '',
    autoJoining: false
  },
  onLoad(options) {
    // 从分享卡片进入，自动填入邀请码并加入
    if (options && options.inviteCode) {
      this.setData({
        role: 'joiner',
        inviteCode: options.inviteCode,
        autoJoining: true
      });
      this.autoJoin(options.inviteCode);
    }
  },
  autoJoin(code) {
    api.join(code).then(() => {
      wx.showToast({ title: '配对成功！' });
      wx.switchTab({ url: '/pages/index/index' });
    }).catch(e => {
      const msg = getErrorMessage(e);
      this.setData({ errorMsg: msg, autoJoining: false });
      wx.showToast({ title: msg, icon: 'none' });
    });
  },
  onShareAppMessage() {
    // 仅 creator 状态可分享带邀请码的卡片
    if (this.data.role === 'creator' && this.data.myCode) {
      return {
        title: '我想和你一起回答 100 个问题',
        path: `/pages/pair/pair?inviteCode=${this.data.myCode}`,
        imageUrl: '' // 可选：自定义分享卡片图
      };
    }
    return {
      title: '每天一个问题，重新认识身边人',
      path: '/pages/index/index'
    };
  },
  onCreateInvite() {
    this.setData({ errorMsg: '' });
    api.createInvite().then(res => {
      this.setData({ role: 'creator', myCode: res.code, expiresAt: res.expires_at });
    }).catch(e => {
      this.setData({ errorMsg: getErrorMessage(e) });
      wx.showToast({ title: getErrorMessage(e), icon: 'none' });
    });
  },
  onJoinMode() { this.setData({ role: 'joiner', errorMsg: '' }); },
  onCodeInput(e) { this.setData({ inviteCode: e.detail.value }); },
  onJoin() {
    if (!this.data.inviteCode) {
      wx.showToast({ title: '请输入邀请码', icon: 'none' });
      return;
    }
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
  },
  onTestMockPair() {
    api.testMockPair().then(() => {
      wx.showToast({ title: '测试配对成功' });
      wx.switchTab({ url: '/pages/index/index' });
    }).catch(e => {
      this.setData({ errorMsg: getErrorMessage(e) });
      wx.showToast({ title: getErrorMessage(e), icon: 'none' });
    });
  }
});
