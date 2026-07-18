const api = require('../../utils/api');

function formatDateRange(start, end) {
  if (!start && !end) return '时间不详';
  const s = start ? start.slice(0, 10) : '?';
  const e = end ? end.slice(0, 10) : '?';
  return `${s} — ${e}`;
}

Page({
  data: {
    tab: 'current',
    items: [],
    months: {},
    loading: true,
    errorMsg: '',
    pastCouples: [],
    pastLoading: false,
    pastError: '',
    viewingPast: false,
    currentPartnerOpenid: '',
    pastItems: [],
    pastMonths: {},
    showDeleteConfirm: false,
    deleteTargetOpenid: '',
    deleteTargetIndex: -1
  },
  onShow() {
    if (this.data.tab === 'current') {
      this.loadData();
    } else {
      this.loadPastList();
    }
  },
  onRetry() {
    this.setData({ loading: true, errorMsg: '' });
    this.loadData();
  },
  onTabCurrent() {
    this.setData({ tab: 'current' });
    this.loadData();
  },
  onTabPast() {
    this.setData({ tab: 'past', viewingPast: false });
    this.loadPastList();
  },
  loadData() {
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
  },
  loadPastList() {
    this.setData({ pastLoading: true, pastError: '' });
    api.pastCouples().then(res => {
      const list = (res.list || []).map(item => ({
        ...item,
        dateRange: formatDateRange(item.first_paired_at, item.last_ended_at)
      }));
      this.setData({ pastCouples: list, pastLoading: false, pastError: '' });
    }).catch(e => {
      this.setData({ pastLoading: false, pastError: e.message });
    });
  },
  onPastRetry() {
    this.loadPastList();
  },
  onViewPast(e) {
    const partnerOpenid = e.currentTarget.dataset.openid;
    this.setData({ viewingPast: true, currentPartnerOpenid: partnerOpenid, pastItems: [], pastMonths: {} });
    api.pastHistory(partnerOpenid).then(res => {
      const months = {};
      res.items.forEach(item => {
        const m = item.date.slice(0, 7);
        if (!months[m]) months[m] = [];
        months[m].push(item);
      });
      this.setData({ pastItems: res.items, pastMonths: months });
    }).catch(e => {
      wx.showToast({ title: e.message, icon: 'none' });
      this.setData({ viewingPast: false });
    });
  },
  onBackToPastList() {
    this.setData({ viewingPast: false, pastItems: [], pastMonths: {} });
  },
  onDeletePast(e) {
    const openid = e.currentTarget.dataset.openid;
    const index = e.currentTarget.dataset.index;
    this.setData({ showDeleteConfirm: true, deleteTargetOpenid: openid, deleteTargetIndex: index });
  },
  onConfirmDelete() {
    const { deleteTargetOpenid, deleteTargetIndex, pastCouples } = this.data;
    api.pastDelete(deleteTargetOpenid).then(() => {
      const newList = pastCouples.filter((_, i) => i !== deleteTargetIndex);
      this.setData({
        pastCouples: newList,
        showDeleteConfirm: false,
        deleteTargetOpenid: '',
        deleteTargetIndex: -1
      });
      wx.showToast({ title: '已删除', icon: 'success' });
    }).catch(e => {
      wx.showToast({ title: e.message, icon: 'none' });
      this.setData({ showDeleteConfirm: false });
    });
  },
  onCancelDelete() {
    this.setData({ showDeleteConfirm: false, deleteTargetOpenid: '', deleteTargetIndex: -1 });
  }
});
