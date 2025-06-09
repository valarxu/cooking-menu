Component({
  options: {
    addGlobalClass: true
  },
  properties: {
    customClass: {
      type: String,
      value: ''
    },
    type: {
      type: String,
      value: 'primary' // 支持primary/outline/gradient
    },
    loading: {
      type: Boolean,
      value: false
    }
  },
  methods: {
    onTap(e) {
      if (this.data.loading) return;
      this.triggerEvent('tap', e);
    }
  }
})