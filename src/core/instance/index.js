import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'

/**
 * 生命的起源,定义Vue构造函数
 */
function Vue (options) {
  if (process.env.NODE_ENV !== 'production' && // 非生产环境
    !(this instanceof Vue) // 当前调用不是使用new命令
    // TIP: 这里涉及一个小知识点,this instanceof XXX可以判断是否使用new调用
  ) {
    /**
     * 首先，提示是非生产环境才有的
     * 其次，只能使用new关键词来调用该函数
     */
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

initMixin(Vue) // _init方法挂载
stateMixin(Vue) // 状态相关属性和方法挂载 定义了$data $props $set $delete $watch
eventsMixin(Vue) // 事件相关属性和方法挂载 定义了$on $once $off $emit
lifecycleMixin(Vue) // 生命周期相关属性和方法挂载 定义了_update $forceUpdate $destroy方法
renderMixin(Vue) // 渲染相关属性和方法挂载 定义了$nextTick _render 方法

export default Vue
