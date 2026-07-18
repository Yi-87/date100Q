const api = require('../../utils/api');
Page({
  data: {
    hasCouple: false,
    question: null,
    status: 'loading',
    readyOpenids: [],
    myReady: false,
    revealData: null,
    timer: null,
    reconcileNotice: false
  },
  onShow() {
    this.loadToday();
    this.checkReconcile();
  },
  async checkReconcile() {
    try {
      const info = await api.coupleInfo();
      if (info && info.pending_reconcile) {
        this.setData({ reconcileNotice: true });
      } else {
        this.setData({ reconcileNotice: false });
      }
    } catch (e) {
      // 静默失败
    }
  },
  onReconcileAccept() {
    api.reconcile('accept').then(res => {
      if (res.reconciled) {
        wx.showToast({ title: '已和好', icon: 'success' });
        this.setData({ reconcileNotice: false });
        this.loadToday();
      }
    }).catch(e => {
      wx.showToast({ title: e.message, icon: 'none' });
    });
  },
  onReconcileReject() {
    api.reconcile('reject').then(() => {
      this.setData({ reconcileNotice: false });
      wx.showToast({ title: '已关闭通知', icon: 'none' });
    }).catch(e => {
      wx.showToast({ title: e.message, icon: 'none' });
    });
  },
  onHide() {
    if (this.data.timer) clearInterval(this.data.timer);
  },
  async loadToday() {
    try {
      const q = await api.todayQuestion();
      if (q.status === 'revealed') {
        const reveal = await api.revealAnswer(q.question_id);
        this.setData({
          hasCouple: true,
          question: q,
          status: 'revealed',
          revealData: reveal,
          readyOpenids: q.ready_openids || [],
          myReady: q.my_ready || false
        });
      } else if (q.status === 'half_answered') {
        this.setData({
          hasCouple: true,
          question: q,
          status: 'half_answered',
          readyOpenids: q.ready_openids || [],
          myReady: q.my_ready || false
        });
      } else {
        this.setData({
          hasCouple: true,
          question: q,
          status: q.sensitivity === 'L3' ? 'l3_locked' : 'pending',
          readyOpenids: q.ready_openids || [],
          myReady: q.my_ready || false
        });
      }
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
  onRetry() {
    this.setData({ status: 'loading' });
    this.loadToday();
  },
  onStartAnswer() {
    wx.navigateTo({ url: `/pages/answer/answer?questionId=${this.data.question.question_id}` });
  },
  onSwap() {
    api.swapQuestion().then(q => {
      wx.showToast({ title: '已换题', icon: 'success' });
      this.setData({
        question: q,
        status: q.sensitivity === 'L3' ? 'l3_locked' : 'pending',
        readyOpenids: q.ready_openids || [],
        myReady: false
      });
    }).catch(e => {
      wx.showToast({ title: e.message, icon: 'none' });
    });
  },
  onL3Ready() {
    api.l3Ready(this.data.question.question_id).then(res => {
      if (res.unlocked) {
        wx.showToast({ title: '双方已确认，题目已解锁', icon: 'success' });
        this.setData({
          status: 'pending',
          question: { ...this.data.question, text: res.text },
          readyOpenids: res.ready_openids,
          myReady: true
        });
      } else {
        wx.showToast({ title: '已确认，等待对方', icon: 'none' });
        this.setData({ readyOpenids: res.ready_openids, myReady: true });
      }
    }).catch(e => {
      wx.showToast({ title: e.message, icon: 'none' });
    });
  },
  onTestPartnerAnswer() {
    api.testPartnerAnswer().then(res => {
      wx.showToast({ title: '对方已回答', icon: 'success' });
      this.setData({ status: res.status });
    }).catch(e => {
      wx.showToast({ title: e.message, icon: 'none' });
    });
  },
  onGoPair() {
    wx.navigateTo({ url: '/pages/pair/pair' });
  },
  onGoHistory() {
    wx.switchTab({ url: '/pages/history/history' });
  },
  onGoProfile() {
    wx.switchTab({ url: '/pages/profile/profile' });
  }
});