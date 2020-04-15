/* @flow */

import {
  warn,
  invokeWithErrorHandling
} from 'core/util/index'
import {
  cached,
  isUndef,
  isTrue,
  isPlainObject
} from 'shared/util'

/**
 * 格式化事件名称
 * 去掉& ~ ！符号
 */
const normalizeEvent = cached((name: string): {
  name: string,
  once: boolean,
  capture: boolean,
  passive: boolean,
  handler?: Function,
  params?: Array<any>
} => {
  const passive = name.charAt(0) === '&'
  name = passive ? name.slice(1) : name
  const once = name.charAt(0) === '~' // Prefixed last, checked first
  name = once ? name.slice(1) : name
  const capture = name.charAt(0) === '!'
  name = capture ? name.slice(1) : name
  return {
    name,
    once,
    capture,
    passive
  }
})

export function createFnInvoker (fns: Function | Array<Function>, vm: ?Component): Function {
  function invoker () {
    const fns = invoker.fns
    if (Array.isArray(fns)) {
      const cloned = fns.slice()
      for (let i = 0; i < cloned.length; i++) {
        invokeWithErrorHandling(cloned[i], null, arguments, vm, `v-on handler`)
      }
    } else {
      // return handler return value for single handlers
      return invokeWithErrorHandling(fns, null, arguments, vm, `v-on handler`)
    }
  }
  invoker.fns = fns
  return invoker
}

export function updateListeners (
  on: Object,
  oldOn: Object,
  add: Function,
  remove: Function,
  createOnceHandler: Function,
  vm: Component
) {
  let name, def, cur, old, event
  for (name in on) {
    // 循环事件名称
    def = cur = on[name]
    old = oldOn[name]
    // 格式化event名称
    event = normalizeEvent(name)
    /* istanbul ignore if */
    // 对weex框架的支持，暂不研究
    if (__WEEX__ && isPlainObject(def)) {
      cur = def.handler
      event.params = def.params
    }
    // undefined检查
    if (isUndef(cur)) {
      process.env.NODE_ENV !== 'production' && warn(
        `Invalid handler for event "${event.name}": got ` + String(cur),
        vm
      )
    } else if (isUndef(old)) {
      // 判断old对象是否为undefined,当old不存在时执行
      if (isUndef(cur.fns)) {
        // 判断新对象的fns对象是否为undefined
        // 创建事件函数调用器
        cur = on[name] = createFnInvoker(cur, vm)
      }
      if (isTrue(event.once)) {
        // 如果加了once，把事件转成once事件
        cur = on[name] = createOnceHandler(event.name, cur, event.capture)
      }
      // 添加新的事件处理
      add(event.name, cur, event.capture, event.passive, event.params)
    } else if (cur !== old) {
      // 新事件覆盖老事件
      old.fns = cur
      on[name] = old
    }
  }
  // 遍历oldOn内的事件
  // 如果在新的事件列表中不存在，就删掉它
  for (name in oldOn) {
    if (isUndef(on[name])) {
      event = normalizeEvent(name)
      remove(event.name, oldOn[name], event.capture)
    }
  }
}
