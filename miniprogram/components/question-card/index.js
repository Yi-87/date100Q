const DIMENSION_MAP = {
  self: '自我',
  partner: '对方',
  daily: '日常',
  intimacy: '亲密',
  family: '家庭',
  money: '金钱',
  future: '未来'
};

Component({
  properties: {
    question: Object
  },
  data: {
    dimensionLabel: ''
  },
  observers: {
    'question': function(q) {
      if (q && q.dimension) {
        this.setData({ dimensionLabel: DIMENSION_MAP[q.dimension] || q.dimension });
      }
    }
  },
  methods: {
    onStart() {
      this.triggerEvent('start');
    },
    onSwap() {
      this.triggerEvent('swap');
    }
  }
});