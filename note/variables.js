/*eslint-disable*/

const options = {
  shouldDecodeNewlines: {
    type: Boolean,
    desc: '是否需要做制表符等符号做兼容处理',
    sup: '在我们innerHTML获取内容时，换行符和制表符分别被转换成了&#10和&#9。在IE中，不仅仅是 a 标签的 href 属性值，任何属性值都存在这个问题。这就会影响Vue的编译器在对模板进行编译后的结果，为了避免这些问题Vue需要知道什么时候要做兼容工作，如果 shouldDecodeNewlines 为 true，意味着 Vue 在编译模板的时候，要对属性值中的换行符或制表符做兼容处理。'
  },
  shouldDecodeNewlinesForHref: {
    type: Boolean,
    desc: '是否需要对a标签的href属性做兼容处理',
    sup: '在我们innerHTML获取内容时，换行符和制表符分别被转换成了&#10和&#9。在IE中，不仅仅是 a 标签的 href 属性值，任何属性值都存在这个问题。这就会影响Vue的编译器在对模板进行编译后的结果，为了避免这些问题Vue需要知道什么时候要做兼容工作，如果 shouldDecodeNewlines 为 true，意味着 Vue 在编译模板的时候，要对属性值中的换行符或制表符做兼容处理。而 shouldDecodeNewlinesForHref为true 意味着Vue在编译模板的时候，要对a标签的 href 属性值中的换行符或制表符做兼容处理。'
  },
  hydrating: {
    type: Boolean,
    desc: '强制使用应用程序的激活模式',
    sup: 'https://ssr.vuejs.org/zh/guide/hydration.html'
  }

}

const vNode = {
  forProcessed: {
    type: Boolean,
    desc: '是否已经被处理成render表达式',
    sup: '是否已经被处理成render表达式'
  },
  isAsyncPlaceholder: {
    type: Boolean,
    desc: '是否异步的预赋值',
    
  }
}

const others = {
  nodeType: {
    type: Number,
    desc: 'node的类型',
    sup: 'html规范规定的nodeType'
  }
}