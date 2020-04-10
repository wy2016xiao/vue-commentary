import Vue from './instance/index'
import { initGlobalAPI } from './global-api/index'
import { isServerRendering } from 'core/util/env'
import { FunctionalRenderContext } from 'core/vdom/create-functional-component'

//初始化全局API，如Vue.util,Vue.set,Vue.use等
initGlobalAPI(Vue)

// 服务器渲染标识
// 原型属性定义'$isServer',并拦截监听
Object.defineProperty(Vue.prototype, '$isServer', {
  get: isServerRendering
})

// 服务端渲染上下文变量
// 原型属性定义'$ssrContext',并拦截
Object.defineProperty(Vue.prototype, '$ssrContext', {
  get () {
    /* istanbul ignore next */
    return this.$vnode && this.$vnode.ssrContext
  }
})

// expose FunctionalRenderContext for ssr runtime helper installation
Object.defineProperty(Vue, 'FunctionalRenderContext', {
  value: FunctionalRenderContext
})

Vue.version = '__VERSION__'

export default Vue
