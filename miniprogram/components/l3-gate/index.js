Component({
  properties: {
    questionId: String,
    readyOpenids: Array,
    myReady: Boolean
  },
  methods: {
    onReady() {
      if (this.data.myReady) return;
      this.triggerEvent('ready');
    }
  }
});