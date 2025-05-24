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
      value: 'primary' // 支持primary/outline
    }
  },
  methods: {
    onTap(e) {
      this.triggerEvent('tap', e);
    }
  }
}) 