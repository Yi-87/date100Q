const api = require('../../utils/api');
Page({
  data: { content: '', submitting: false, status: 'editing' },
  onInput(e) { this.setData({ content: e.detail.value }); },
  async onSubmit() {
    const { content } = this.data;
    if (!content.trim()) return;
    this.setData({ submitting: true });
    try {
      const result = await api.submitAnswer(this.options.questionId, content);
      this.setData({ status: result.status });
    } catch (e) {
      wx.showToast({ title: e.message, icon: 'none' });
      this.setData({ submitting: false });
    }
  }
});