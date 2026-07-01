Component({
  properties: {
    question: Object
  },
  data: {
    dots: '.'
  },
  lifetimes: {
    attached() {
      this.timer = setInterval(() => {
        const dots = this.data.dots.length >= 3 ? '.' : this.data.dots + '.';
        this.setData({ dots });
      }, 500);
    },
    detached() {
      clearInterval(this.timer);
    }
  }
});