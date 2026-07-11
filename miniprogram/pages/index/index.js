const api = require('../../utils/api');
Page({
  data: {
    hasCouple: false,
    question: null,
    status: 'loading',
    readyOpenids: [],
    timer: null
  },
  onShow() {
    this.loadToday();
  },
  onHide() {
    if (this.data.timer) clearInterval(this.data.timer);
  },
  async loadToday() {
    try {
      const q = await api.todayQuestion();
      this.setData({
        hasCouple: true,
        question: q,
        status: q.sensitivity === 'L3' ? 'l3_locked' : 'pending',
        readyOpenids: q.ready_openids || []
      });
    } catch (e) {
      const errMsg = e.errMsg || e.message || '';
      if (errMsg.indexOf('not paired') !== -1) {
        this.setData({ hasCouple: false, status: 'no_couple' });
      } else {
        console.error('loadToday error:', e);
        this.setData({ status: 'error' });
      }
    }
  },
  onStartAnswer() {
    wx.navigateTo({ url: `/pages/answer/answer?questionId=${this.data.question.question_id}` });
  },
  onSwap() {
    api.swapQuestion().then(q => {
      this.setData({
        question: q,
        status: q.sensitivity === 'L3' ? 'l3_locked' : 'pending'
      });
    });
  },
  onGoPair() {
    wx.navigateTo({ url: '/pages/pair/pair' });
  }
});