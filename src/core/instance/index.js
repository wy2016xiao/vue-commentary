import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'

/**
 * 定义vue，Vue类构造函数
 */
function Vue (options) {
  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue)
  ) {
    // 首先，提示是非生产环境才有的
    // 其次，只能使用new关键词来调用该函数
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  // 执行初始化方法
  // 不是使用new关键词的话，这里就会报错，找不到_init方法
  // 这里的options就是我们传入的参数对象
  // var app = new Vue({
  //   el: '#app',
  //   data: {
  //     message: 'Hello Vue!'
  //   }
  // })
  // 全部可选配置项：https://cn.vuejs.org/v2/api/#%E9%80%89%E9%A1%B9-%E6%95%B0%E6%8D%AE
  this._init(options)
}

// 定义了_init方法
initMixin(Vue) 

stateMixin(Vue) // mixin state modules
eventsMixin(Vue) // mixin events modules
lifecycleMixin(Vue) // mixin lifecycle function 
renderMixin(Vue) // mixin render modules

export default Vue
