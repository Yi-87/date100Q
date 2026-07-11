const api = require('../../utils/api');
Page({
  data: { items: [], months: {}, loading: true, errorMsg: '' },
  onShow() {
    api.historyList().then(res => {
      const months = {};
      res.items.forEach(item => {
        const m = item.date.slice(0, 7);
        if (!months[m]) months[m] = [];
        months[m].push(item);
      });
      this.setData({ items: res.items, months, loading: false, errorMsg: '' });
    }).catch(e => {
      this.setData({ loading: false, errorMsg: e.message });
    });
  }
});