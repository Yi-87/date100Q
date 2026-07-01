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
      if (e.message === 'not paired') {
        this.setData({ hasCouple: false, status: 'no_couple' });
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