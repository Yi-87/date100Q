Component({
  properties: {
    question: Object
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