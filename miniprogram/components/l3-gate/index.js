Component({
  properties: {
    questionId: String,
    readyOpenids: Array
  },
  data: {
    myReady: false
  },
  methods: {
    onReady() {
      this.setData({ myReady: true });
      this.triggerEvent('ready');
    }
  }
});