/* @flow */

import { hasOwn } from 'shared/util'
import { warn, hasSymbol } from '../util/index'
import { defineReactive, toggleObserving } from '../observer/index'

/**
 * 把用户定义的provide赋值到_provided上
 * 如果是函数形式，就调用一下
 */
export function initProvide (vm: Component) {
  const provide = vm.$options.provide
  if (provide) {
    vm._provided = typeof provide === 'function'
      ? provide.call(vm)
      : provide
  }
}

/**
 * 初始化injections
 * 找出所有injections的值
 * 同时对所有injections属性进行监听
 */
export function initInjections (vm: Component) {
  // 该对象是所有inject对应的provide值
  const result = resolveInject(vm.$options.inject, vm)
  if (result) {
    toggleObserving(false)
    Object.keys(result).forEach(key => {
      /* istanbul ignore else */
      if (process.env.NODE_ENV !== 'production') {
        defineReactive(vm, key, result[key], () => {
          warn(
            `Avoid mutating an injected value directly since the changes will be ` +
            `overwritten whenever the provided component re-renders. ` +
            `injection being mutated: "${key}"`,
            vm
          )
        })
      } else {
        defineReactive(vm, key, result[key])
      }
    })
    toggleObserving(true)
  }
}

/**
 * 解析injects
 * 返回一个对象，该对象是所有inject对应的provide值
 */
export function resolveInject (inject: any, vm: Component): ?Object {
  if (inject) {
    // inject is :any because flow is not smart enough to figure out cached
    const result = Object.create(null)
    // Object.keys是表示给定对象的所有可枚举属性的字符串数组（ Object.getOwnPropertyNames中可枚举的属性）；
    // Reflect.ownKeys不含包括Object.keys的属性，还包括了 Symbol 属性。
    const keys = hasSymbol
      ? Reflect.ownKeys(inject)
      : Object.keys(inject)

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      // #6574 in case the inject object is observed...
      // 如果该inject已经被观察，就跳过
      if (key === '__ob__') continue
      // 找到provide中的key
      // inject和provide的key不一定一致，名字被保存在from中
      const provideKey = inject[key].from
      let source = vm

      // 通过inject属性查到到对应父级组件上的provide的值，并保存到result字面量对象中，格式如下:{foo: "this is foo"}。
      // 顺着实例链往上，直到找到所对应的provide
      while (source) {
        // 如果找到了，使用inject的名字赋值给result
        if (source._provided && hasOwn(source._provided, provideKey)) {
          result[key] = source._provided[provideKey]
          break
        }
        source = source.$parent
      }
      // 如果没有找到实例也是有可能的
      // 因为和props一样，可以有一个default属性提供默认的值
      // 接下来看看有没有默认值提供
      if (!source) {
        // 看看有没有叫default的属性在inject被定义
        if ('default' in inject[key]) {
          // 如果有，那么取出来
          // 如果是个函数，调用它
          // 如果不是，直接赋值给它
          const provideDefault = inject[key].default
          result[key] = typeof provideDefault === 'function'
            ? provideDefault.call(vm)
            : provideDefault
        } else if (process.env.NODE_ENV !== 'production') {
          warn(`Injection "${key}" not found`, vm)
        }
      }
    }
    return result
  }
}
