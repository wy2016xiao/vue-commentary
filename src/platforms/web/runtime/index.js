/* @flow */

import Vue from 'core/index'
import config from 'core/config'
import { extend, noop } from 'shared/util'
import { mountComponent } from 'core/instance/lifecycle'
import { devtools, inBrowser } from 'core/util/index'

import {
  query,
  mustUseProp,
  isReservedTag,
  isReservedAttr,
  getTagNamespace,
  isUnknownElement
} from 'web/util/index'

import { patch } from './patch'
import platformDirectives from './directives/index'
import platformComponents from './components/index'

// 加载web平台特殊工具函数
Vue.config.mustUseProp = mustUseProp // 检查是否使用了恰当的标签和属性 比如如果传了checked属性就一定得是input标签
Vue.config.isReservedTag = isReservedTag // 检查是否是保留标签
Vue.config.isReservedAttr = isReservedAttr // 检查是否是保留属性
Vue.config.getTagNamespace = getTagNamespace // 检查标签的命名空间 目前只能查询svg和math标签的命名空间
Vue.config.isUnknownElement = isUnknownElement // 检查是否是未知的标签

// 加载web平台运行时指令功能和组件
// platformDirectives = {
//   on,
//   bind,
//   cloak: noop
// }
// platformComponents = {
//   KeepAlive
// }
extend(Vue.options.directives, platformDirectives)
extend(Vue.options.components, platformComponents)

// 装载平台的核心函数 patch函数
Vue.prototype.__patch__ = inBrowser ? patch : noop

// 公共mount方法
Vue.prototype.$mount = function (
  el?: string | Element, // 一个DOM实例或者'#id'这样的字符串
  hydrating?: boolean // 服务端渲染相关
): Component {
  // 找到那个元素
  el = el && inBrowser ? query(el) : undefined
  // 装在在元素上
  return mountComponent(this, el, hydrating)
}

// devtools global hook
/* istanbul ignore next */
if (inBrowser) {
  setTimeout(() => {
    if (config.devtools) {
      if (devtools) {
        devtools.emit('init', Vue)
      } else if (
        process.env.NODE_ENV !== 'production' &&
        process.env.NODE_ENV !== 'test'
      ) {
        console[console.info ? 'info' : 'log'](
          'Download the Vue Devtools extension for a better development experience:\n' +
          'https://github.com/vuejs/vue-devtools'
        )
      }
    }
    if (process.env.NODE_ENV !== 'production' &&
      process.env.NODE_ENV !== 'test' &&
      config.productionTip !== false &&
      typeof console !== 'undefined'
    ) {
      console[console.info ? 'info' : 'log'](
        `You are running Vue in development mode.\n` +
        `Make sure to turn on production mode when deploying for production.\n` +
        `See more tips at https://vuejs.org/guide/deployment.html`
      )
    }
  }, 0)
}

export default Vue
