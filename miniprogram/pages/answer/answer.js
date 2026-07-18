const api = require('../../utils/api');

const DIMENSION_MAP = {
  self: '自我',
  partner: '对方',
  daily: '日常',
  intimacy: '亲密',
  family: '家庭',
  money: '金钱',
  future: '未来'
};

Page({
  data: { content: '', submitting: false, status: 'loading', question: null, dimensionLabel: '' },
  questionId: '',
  onLoad(options) {
    this.questionId = options.questionId;
    this.loadQuestion();
  },
  async loadQuestion() {
    try {
      const q = await api.todayQuestion();
      this.setData({
        question: q,
        status: 'editing',
        dimensionLabel: DIMENSION_MAP[q.dimension] || q.dimension || ''
      });
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
      this.setData({ status: 'error' });
    }
  },
  onInput(e) { this.setData({ content: e.detail.value }); },
  async onSubmit() {
    const { content } = this.data;
    if (!content.trim()) {
      wx.showToast({ title: '请输入答案', icon: 'none' });
      return;
    }
    this.setData({ submitting: true });
    try {
      const result = await api.submitAnswer(this.questionId, content);
      wx.showToast({ title: '提交成功', icon: 'success' });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (e) {
      wx.showToast({ title: e.message, icon: 'none' });
      this.setData({ submitting: false });
    }
  }
});