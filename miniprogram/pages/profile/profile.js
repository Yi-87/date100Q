const api = require('../../utils/api');
Page({
  data: { stage: 'love', showUnbind: false },
  onShow() {
    api.todayQuestion().then(q => {
      if (q.stage) this.setData({ stage: q.stage });
    }).catch(() => {});
  },
  onStageChange(e) {
    const stage = e.currentTarget.dataset.stage;
    api.updateStage(stage).then(() => this.setData({ stage }));
  },
  onUnbind() {
    if (!this.data.showUnbind) {
      this.setData({ showUnbind: true });
      return;
    }
    api.unbind('confirm').then(res => {
      if (res.unbound) {
        wx.showToast({ title: '已解绑' });
        wx.switchTab({ url: '/pages/index/index' });
      } else {
        wx.showToast({ title: '等待对方确认', icon: 'none' });
      }
    });
  },
  onCancelUnbind() {
    this.setData({ showUnbind: false });
  }
});