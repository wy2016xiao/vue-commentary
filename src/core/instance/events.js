/* @flow */

import {
  tip,
  toArray,
  hyphenate,
  formatComponentName,
  invokeWithErrorHandling
} from '../util/index'
import { updateListeners } from '../vdom/helpers/index'

/**
 * 初始化_events _hasHookEvent变量
 */
export function initEvents (vm: Component) {
  vm._events = Object.create(null)
  // 标识是否有hook:样式的钩子事件
  vm._hasHookEvent = false
  // init parent attached events
  // 获取_parentListeners，表示父组件对子组件（当前实例）的监听
  const listeners = vm.$options._parentListeners
  if (listeners) {
    updateComponentListeners(vm, listeners)
  }
}

let target: any

/**
 * 监听事件
 */
function add (event, fn) {
  target.$on(event, fn)
}

/**
 * 取消监听事件
 */
function remove (event, fn) {
  target.$off(event, fn)
}


/**
 * 创建一个一次性事件监听
 * 它会自己取消监听
 */
function createOnceHandler (event, fn) {
  const _target = target
  return function onceHandler () {
    const res = fn.apply(null, arguments)
    if (res !== null) {
      _target.$off(event, onceHandler)
    }
  }
}

/**
 * 更新实例上的事件列表
 */
export function updateComponentListeners (
  vm: Component, // 实例
  listeners: Object, // _parentListeners对象
  oldListeners: ?Object
) {
  target = vm
  // 更新实例上的事件列表
  updateListeners(listeners, oldListeners || {}, add, remove, createOnceHandler, vm)
  target = undefined
}

/**
 * 定义了事件相关的方法
 * $on $once $off $emit
 *
 * @date 2021-01-06
 * @export
 * @param {Class<Component>} Vue
 */
export function eventsMixin (Vue: Class<Component>) {
  const hookRE = /^hook:/
  /**
   * this.$on方法封装
   * @params {string | Array<string>} event 事件名
   * @params {Function} fn 事件回调
   */
  Vue.prototype.$on = function (event: string | Array<string>, fn: Function): Component {
    const vm: Component = this
    // 如果传入的事件是个数组，递归一下，分别监听
    if (Array.isArray(event)) {
      for (let i = 0, l = event.length; i < l; i++) {
        vm.$on(event[i], fn)
      }
    } else {
      // 非数组情况下（字符串）
      // 对同一个名字的事件监听回调是个数组
      // 这样方便在不同的地方对相同的进行重复监听，不会覆盖掉原来的监听
      // 会依次触发监听回调
      (vm._events[event] || (vm._events[event] = [])).push(fn)
      // 如果该事件是个hook钩子事件
      // 标记一下实例，表示监听列表里面有个hook钩子事件
      if (hookRE.test(event)) {
        vm._hasHookEvent = true
      }
    }
    return vm
  }

  /**
   * this.$once封装
   * @params {string | Array<string>} event 事件名
   * @params {Function} fn 事件回调
   */
  Vue.prototype.$once = function (event: string, fn: Function): Component {
    const vm: Component = this
    // 之所以这么写
    // 首先得考虑不这么写的后果
    // 如果没有on.fn = fn这个赋值
    // 用户就无法在调用该事件之前手动删除该事件了
    // 你无法在注册之后使用$off删掉
    function on () {
      vm.$off(event, on)
      fn.apply(vm, arguments)
    }
    // 这里注册的事件的回调不是你传入的回调
    on.fn = fn
    vm.$on(event, on)
    return vm
  }

  /**
   * 取消监听某个事件
   * this.$off封装
   * @params {string | Array<string>} event 事件名
   * @params {Function} fn 事件回调，针对性的删掉该回调
   */
  Vue.prototype.$off = function (event?: string | Array<string>, fn?: Function): Component {
    const vm: Component = this
    // 该方法有个特殊操作
    // 不传任何参数进去就会取消监听当前所有方法
    if (!arguments.length) {
      vm._events = Object.create(null)
      return vm
    }
    // 如果穿了数组，就一个一个递归取消
    if (Array.isArray(event)) {
      for (let i = 0, l = event.length; i < l; i++) {
        vm.$off(event[i], fn)
      }
      return vm
    }
    // 在事件表中找到该事件的回调
    const cbs = vm._events[event]
    // 不存在的事件
    if (!cbs) {
      return vm
    }
    // 没传回调
    // 重置一下事件
    if (!fn) {
      vm._events[event] = null
      return vm
    }
    
    let cb
    // 已注册的该事件的回调个数
    let i = cbs.length
    // 一个一个匹配回调，把匹配上的回调删掉
    while (i--) {
      cb = cbs[i]
      if (cb === fn || cb.fn === fn) {
        cbs.splice(i, 1)
        break
      }
    }
    return vm
  }

  // 发布订阅中使用的，
  // 手动触发当前实例上的事件
  Vue.prototype.$emit = function (event: string): Component {
    const vm: Component = this
    // 开发环境事件名大小写不同的提示
    // 开发环境会给你转换一下，生产直接不管了
    if (process.env.NODE_ENV !== 'production') {
      const lowerCaseEvent = event.toLowerCase()
      if (lowerCaseEvent !== event && vm._events[lowerCaseEvent]) {
        tip(
          `Event "${lowerCaseEvent}" is emitted in component ` +
          `${formatComponentName(vm)} but the handler is registered for "${event}". ` +
          `Note that HTML attributes are case-insensitive and you cannot use ` +
          `v-on to listen to camelCase events when using in-DOM templates. ` +
          `You should probably use "${hyphenate(event)}" instead of "${event}".`
        )
      }
    }

    let cbs = vm._events[event]
    if (cbs) {
      // 把事件列表拿出来，一个一个调用
      cbs = cbs.length > 1 ? toArray(cbs) : cbs
      const args = toArray(arguments, 1)
      const info = `event handler for "${event}"`
      for (let i = 0, l = cbs.length; i < l; i++) {
        // 带错误处理的函数调用
        invokeWithErrorHandling(cbs[i], vm, args, vm, info)
      }
    }
    return vm
  }
}
