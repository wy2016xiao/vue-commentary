/* @flow */

import config from '../config'
import { initUse } from './use'
import { initMixin } from './mixin'
import { initExtend } from './extend'
import { initAssetRegisters } from './assets'
import { set, del } from '../observer/index'
import { ASSET_TYPES } from 'shared/constants'
import builtInComponents from '../components/index'
import { observe } from 'core/observer/index'

import {
  warn,
  extend,
  nextTick,
  mergeOptions,
  defineReactive
} from '../util/index'

/**
 * 初始化全局API
 *
 * @date 14/01/2021
 * @export
 * @param {GlobalAPI} Vue
 */
export function initGlobalAPI (Vue: GlobalAPI) {
  // config
  const configDef = {}
  configDef.get = () => config
  if (process.env.NODE_ENV !== 'production') {
    // 如果不是生产环境
    // 把config配置设置为禁止设置，设置就提示警告
    configDef.set = () => {
      warn(
        'Do not replace the Vue.config object, set individual fields instead.'
      )
    }
  }
  // 把设置项放在Vue实例上方便使用
  Object.defineProperty(Vue, 'config', configDef)

  // 暴露一些工具函数给框架自身而非用户使用
  // 这些不被认为是公共API的一部分，避免去依赖它们除非你意识到这么做的风险
  Vue.util = {
    warn,
    extend,
    mergeOptions,
    defineReactive
  }

  // 暴露一些给用户用的api
  Vue.set = set
  Vue.delete = del
  Vue.nextTick = nextTick

  // 2.6 新增的observable api
  Vue.observable = (obj) => {
    observe(obj)
    return obj
  }

  // 万恶之源，初始化options属性
  Vue.options = Object.create(null)
  // ASSET_TYPES成员: 'component' 'directive' 'filter'
  ASSET_TYPES.forEach(type => {
    Vue.options[type + 's'] = Object.create(null)
  })

  // 挂载基础Vue
  Vue.options._base = Vue

  // 把内置的components合并到用户定义的components中
  extend(Vue.options.components, builtInComponents)

  initUse(Vue) // Vue.use方法初始化(使用插件的方法)
  initMixin(Vue) // Vue.Mixin方法初始化
  initExtend(Vue) // Vue.extend方法初始化
  initAssetRegisters(Vue) // Vue.components Vue.directive Vue.filter方法初始化
}
