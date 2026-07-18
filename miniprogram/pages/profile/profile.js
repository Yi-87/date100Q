const api = require('../../utils/api');

const STAGE_DESC = {
  love: '恋爱版包含 100 个适合恋爱中情侣的问题，帮助你们更了解彼此。',
  pre_marriage: '婚前版包含 100 个适合备婚情侣的问题，聚焦婚礼规划、财务分工、家庭融合。',
  marriage: '维护版包含 100 个适合已婚伴侣的问题，关注沟通模式、共同成长和长期幸福。'
};

const DIFFICULTY_MAP = {
  all: '全部',
  L0: '轻松',
  L1: '中等',
  L2: '深刻',
  L3: '敏感'
};

const DIFFICULTY_OPTIONS = [
  { label: '全部', value: 'all' },
  { label: '轻松 (L0)', value: 'L0' },
  { label: '中等 (L1)', value: 'L1' },
  { label: '深刻 (L2)', value: 'L2' },
  { label: '敏感 (L3)', value: 'L3' }
];

Page({
  data: {
    stage: 'love',
    stageDesc: STAGE_DESC.love,
    l3Enabled: false,
    reminderEnabled: false,
    difficulty: 'all',
    difficultyLabel: '全部',
    difficultyOptions: DIFFICULTY_OPTIONS,
    showUnbind: false,
    unbindStep: 'choose',
    showDifficultyModal: false,
    paired: false,
    coupleId: '',
    createdAt: '',
    createdDate: '',
    pastCount: 0,
    loading: true
  },
  onShow() {
    this.setData({ loading: true });
    Promise.all([
      api.todayQuestion().catch(() => null),
      api.coupleInfo().catch(() => null),
      api.pastCouples().catch(() => ({ list: [] }))
    ]).then(([q, info, past]) => {
      const data = { loading: false };
      if (q && q.stage) {
        data.stage = q.stage;
        data.stageDesc = STAGE_DESC[q.stage] || '';
      }
      if (info) {
        data.paired = info.paired;
        data.coupleId = info.couple_id || '';
        data.createdAt = info.created_at || '';
        data.createdDate = info.created_at ? info.created_at.slice(0, 10) : '';
        if (info.difficulty !== undefined) {
          data.difficulty = info.difficulty;
          data.difficultyLabel = DIFFICULTY_MAP[info.difficulty] || '全部';
        }
        data.reminderEnabled = info.reminder_enabled || false;
        data.l3Enabled = info.l3_enabled || false;
      } else {
        data.paired = false;
      }
      if (past && past.list) {
        data.pastCount = past.list.length;
      }
      this.setData(data);
    });
  },
  onStageChange(e) {
    const stage = e.currentTarget.dataset.stage;
    api.updateStage(stage).then(() => {
      this.setData({ stage, stageDesc: STAGE_DESC[stage] || '' });
      wx.showToast({ title: '已更新', icon: 'success' });
    }).catch(e => {
      wx.showToast({ title: e.message, icon: 'none' });
    });
  },
  onUnbind() {
    this.setData({ showUnbind: true, unbindStep: 'choose' });
  },
  onNegotiateUnbind() {
    api.unbind('negotiate').then(res => {
      if (res.unbound) {
        wx.showToast({ title: '已解除配对', icon: 'success' });
        wx.switchTab({ url: '/pages/index/index' });
      } else {
        this.setData({ unbindStep: 'negotiate_waiting' });
      }
    }).catch(e => {
      wx.showToast({ title: e.message, icon: 'none' });
    });
  },
  onForceUnbind() {
    this.setData({ unbindStep: 'force_confirm' });
  },
  onForceConfirm() {
    api.unbind('force').then(res => {
      if (res.unbound) {
        wx.showToast({ title: '已强制解除', icon: 'success' });
        wx.switchTab({ url: '/pages/index/index' });
      }
    }).catch(e => {
      wx.showToast({ title: e.message, icon: 'none' });
    });
  },
  onCancelUnbind() {
    this.setData({ showUnbind: false, unbindStep: 'choose' });
  },
  onDifficultyClick() {
    this.setData({ showDifficultyModal: true });
  },
  onDifficultyClose() {
    this.setData({ showDifficultyModal: false });
  },
  onDifficultySelect(e) {
    const value = e.currentTarget.dataset.value;
    const label = DIFFICULTY_MAP[value] || '全部';
    api.updateSettings({ difficulty: value }).then(() => {
      this.setData({ difficulty: value, difficultyLabel: label, showDifficultyModal: false });
      wx.showToast({ title: '已更新', icon: 'success' });
    }).catch(e => {
      wx.showToast({ title: e.message, icon: 'none' });
    });
  },
  onReminderToggle() {
    const newValue = !this.data.reminderEnabled;
    api.updateSettings({ reminder_enabled: newValue }).then(() => {
      this.setData({ reminderEnabled: newValue });
      wx.showToast({ title: newValue ? '已开启提醒' : '已关闭提醒', icon: 'success' });
    }).catch(e => {
      wx.showToast({ title: e.message, icon: 'none' });
    });
  },
  onL3Toggle() {
    const newValue = !this.data.l3Enabled;
    api.updateSettings({ l3_enabled: newValue }).then(() => {
      this.setData({ l3Enabled: newValue });
      wx.showToast({ title: newValue ? '已开启L3敏感问题' : '已关闭L3敏感问题', icon: 'success' });
    }).catch(e => {
      wx.showToast({ title: e.message, icon: 'none' });
    });
  },
  onGoPast() {
    wx.switchTab({
      url: '/pages/history/history',
      success: () => {
        const pages = getCurrentPages();
        const current = pages[pages.length - 1];
        if (current && current.onTabPast) {
          current.onTabPast();
        }
      }
    });
  }
});