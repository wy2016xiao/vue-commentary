/* @flow */

import Dep from './dep'
import VNode from '../vdom/vnode'
import { arrayMethods } from './array'
import {
  def,
  warn,
  hasOwn,
  hasProto,
  isObject,
  isPlainObject,
  isPrimitive,
  isUndef,
  isValidArrayIndex,
  isServerRendering
} from '../util/index'

const arrayKeys = Object.getOwnPropertyNames(arrayMethods)

/**
 * In some cases we may want to disable observation inside a component's
 * update computation.
 */
export let shouldObserve: boolean = true

export function toggleObserving (value: boolean) {
  shouldObserve = value
}

/**
 * Observer class that is attached to each observed
 * object. Once attached, the observer converts the target
 * object's property keys into getter/setters that
 * collect dependencies and dispatch updates.
 * Observer类能给目标对象的属性名附加getter/setter来收集依赖和发布更新
 */
export class Observer {
  value: any;
  dep: Dep;
  vmCount: number; // number of vms that have this object as root $data

  constructor (value: any) {
    // 1.初始化
    this.value = value
    this.dep = new Dep()
    this.vmCount = 0
    // 2.给data定义一个__ob__属性，值就是实例
    def(value, '__ob__', this)
    // 3.对于数组对象，则循环创建Observer对象
    if (Array.isArray(value)) {
      if (hasProto) {
        // 给数组对象的原型链换成数组对象原型
        protoAugment(value, arrayMethods)
      } else {
        // 没有原型链就手动添加原型方法
        // options.data Array.prototype Array.prototype的所有key
        copyAugment(value, arrayMethods, arrayKeys)
      }
      // 对数组成员循环创建Observer对象
      this.observeArray(value)
    } else {
      // 4.为每个属性注入getter setter方法
      this.walk(value)
    }
  }

  /**
   * Walk through all properties and convert them into
   * getter/setters. This method should only be called when
   * value type is Object.
   * 遍历所有属性并且把他们转换成getter/setter
   * 这个方法只应该在值为对象时调用
   */
  walk (obj: Object) {
    const keys = Object.keys(obj)
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i])
    }
  }

  /**
   * Observe a list of Array items.
   */
  observeArray (items: Array<any>) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i])
    }
  }
}

// helpers

/**
 * Augment a target Object or Array by intercepting
 * the prototype chain using __proto__
 * 增加目标对象的__proto__属性
 */
function protoAugment (target, src: Object) {
  /* eslint-disable no-proto */
  target.__proto__ = src
  /* eslint-enable no-proto */
}

/**
 * Augment a target Object or Array by defining
 * hidden properties.
 */
/* istanbul ignore next */
function copyAugment (target: Object, src: Object, keys: Array<string>) {
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i]
    def(target, key, src[key])
  }
}

/**
 * 尝试创建一个该对象的观察者实例
 * 如果成功观察，返回一个新的观察者实例
 * 如果已经存在，返回存在的观察者实例（在某些情况下不会添加）
 * 不会添加的场景包括
 * 1.修改变量shouldObserve
 * 2.非数组或者简单对象
 * 3.不可扩展
 * 4._isVue属性是真值
 * 
 * @date 2020-02-04
 * @export
 * @param {*} value - 将被观察的对象，就是传入的data
 * @param {?boolean} asRootData - 是否是根数据
 * @returns {(Observer | void)}
 */
export function observe (value: any, asRootData: ?boolean): Observer | void {
  // 如果不是个对象或者是VNode实例，就不进行观察
  if (!isObject(value) || value instanceof VNode) {
    return
  }
  let ob: Observer | void
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    // 如果自身有__ob__属性并且该属性是observer的实例，证明已经存在观察者，直接返回这个属性
    ob = value.__ob__
  } else if (
    // 没有就加一个__ob__属性
    shouldObserve &&
    !isServerRendering() &&
    (Array.isArray(value) || isPlainObject(value)) &&
    Object.isExtensible(value) &&
    !value._isVue
  ) {
    ob = new Observer(value)
  }
  if (asRootData && ob) {
    // 如果是根数据并且有observer实例，就给vmCount属性+1
    ob.vmCount++
  }
  return ob
}

/**
 * Define a reactive property on an Object.
 * 定义一个对象的属性为响应式属性
 * @date 2020-04-20
 * @export
 * @param {Object} obj - 被定义的对象
 * @param {string} key - 被定义的对象的属性名
 * @param {*} val - 被定义的对象的属性值
 * @param {?Function} [customSetter] 
 * @param {boolean} [shallow]
 */
export function defineReactive (
  obj: Object,
  key: string,
  val: any,
  customSetter?: ?Function,
  shallow?: boolean
) {
  // 1.创建属性数据发布器
  const dep = new Dep()
  // 获取该属性的描述符
  const property = Object.getOwnPropertyDescriptor(obj, key)
  // 如果属性不允许被设置就直接返回
  if (property && property.configurable === false) {
    return
  }

  // 获取该属性的getter和setter
  // 一般是没有的，除非已经被框架或者用户定义过
  const getter = property && property.get
  const setter = property && property.set
  // 如果已经有setter或者没有getter 并且调用时没有设置值
  // 证明已经有了该属性，用户应该是想要把该属性设置成响应式
  // 给val赋值
  // conputed可能会设置set或者get
  if ((!getter || setter) && arguments.length === 2) {
    val = obj[key]
  }

  // 2.如果属性的值也是对象，递归为每个对象创建observe对象
  let childOb = !shallow && observe(val)
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter () {
      const value = getter ? getter.call(obj) : val
      // 依赖收集
      if (Dep.target) {
        dep.depend()
        if (childOb) {
          childOb.dep.depend()
          if (Array.isArray(value)) {
            dependArray(value)
          }
        }
      }
      return value
    },
    set: function reactiveSetter (newVal) {
      const value = getter ? getter.call(obj) : val
      /* eslint-disable no-self-compare */
      // 值没改变或者值被换了
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return
      }
      /* eslint-enable no-self-compare */
      if (process.env.NODE_ENV !== 'production' && customSetter) {
        customSetter()
      }
      // #7981: for accessor properties without setter
      if (getter && !setter) return
      if (setter) {
        setter.call(obj, newVal)
      } else {
        val = newVal
      }
      // 通知更新
      childOb = !shallow && observe(newVal)
      dep.notify()
    }
  })
}

/**
 * Set a property on an object. Adds the new property and
 * triggers change notification if the property doesn't
 * already exist.
 * 向响应式对象中添加一个属性，并确保这个新属性同样是响应式的，且触发视图更新。
 * 它必须用于向响应式对象上添加新属性，因为 Vue 无法探测普通的新增属性 
 * (比如 this.myObject.newProperty = 'hi')
 */
export function set (target: Array<any> | Object, key: any, val: any): any {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    // 如果非生产环境并且（不存在或简单值对象）
    warn(`Cannot set reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.length = Math.max(target.length, key)
    target.splice(key, 1, val)
    return val
  }
  if (key in target && !(key in Object.prototype)) {
    target[key] = val
    return val
  }
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid adding reactive properties to a Vue instance or its root $data ' +
      'at runtime - declare it upfront in the data option.'
    )
    return val
  }
  if (!ob) {
    target[key] = val
    return val
  }
  defineReactive(ob.value, key, val)
  ob.dep.notify()
  return val
}

/**
 * Delete a property and trigger change if necessary.
 */
export function del (target: Array<any> | Object, key: any) {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot delete reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.splice(key, 1)
    return
  }
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid deleting properties on a Vue instance or its root $data ' +
      '- just set it to null.'
    )
    return
  }
  if (!hasOwn(target, key)) {
    return
  }
  delete target[key]
  if (!ob) {
    return
  }
  ob.dep.notify()
}

/**
 * Collect dependencies on array elements when the array is touched, since
 * we cannot intercept array element access like property getters.
 */
function dependArray (value: Array<any>) {
  for (let e, i = 0, l = value.length; i < l; i++) {
    e = value[i]
    e && e.__ob__ && e.__ob__.dep.depend()
    if (Array.isArray(e)) {
      dependArray(e)
    }
  }
}
