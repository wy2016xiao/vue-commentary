/* @flow */

import {
  warn,
  remove,
  isObject,
  parsePath,
  _Set as Set,
  handleError,
  noop
} from '../util/index'

import { traverse } from './traverse'
import { queueWatcher } from './scheduler'
import Dep, { pushTarget, popTarget } from './dep'

import type { SimpleSet } from '../util/index'

let uid = 0

/**
 * A watcher parses an expression, collects dependencies,
 * and fires callback when the expression value changes.
 * This is used for both the $watch() api and directives.
 * 观察者解析表达式，收集依赖项，
 * 并在表达式值改变时触发回调。
 * 这用于$watch() api和指令。
 * 
 * Watcher 在构造时传入的参数最重要的是 expOrFn 
 * 这是一个 getter 函数，或者可以用来生成一个 getter 函数的字符串
 * 而这个 getter 函数就是之前所说的回调函数之一
 * 另外一个回调函数是 this.cb，这个函数只有在用 vm.$watch 生成的 Watcher 才会运行。
 */
export default class Watcher {
  vm: Component;
  expression: string;
  cb: Function;
  id: number;
  deep: boolean; // 是否需要深度监听
  user: boolean; // 是否是用户手动调用的this.$watch()
  lazy: boolean; // input输入框会由input触发改为onchange触发
  // 也就是时失去焦点时触发
  sync: boolean; // 更新时是否需要同步执行
  dirty: boolean; // 脏值,在异步update数据的时候需要
  active: boolean; // 是否活跃,不活跃的时候也就不需要通知了
  deps: Array<Dep>; // 该watcher对应的维护的发布器数组
  newDeps: Array<Dep>; // 该watcher对应的新的dep的缓冲
  depIds: SimpleSet; // 该watcher对应的维护的发布器id
  newDepIds: SimpleSet; // 该watcher对应的新的dep的id的缓冲
  before: ?Function;
  getter: Function; 
  value: any;

  constructor (
    vm: Component,
    expOrFn: string | Function, // 待观察的表达式
    cb: Function, // 回调函数，更新的时候调用
    options?: ?Object,
    isRenderWatcher?: boolean
  ) {
    // 1.初始化变量
    this.vm = vm
    if (isRenderWatcher) {
      vm._watcher = this
    }
    vm._watchers.push(this)
    // options
    if (options) {
      this.deep = !!options.deep
      this.user = !!options.user
      this.lazy = !!options.lazy
      this.sync = !!options.sync
      this.before = options.before
    } else {
      this.deep = this.user = this.lazy = this.sync = false
    }
    this.cb = cb
    this.id = ++uid // uid for batching
    this.active = true
    this.dirty = this.lazy // for lazy watchers
    this.deps = []
    this.newDeps = []
    this.depIds = new Set()
    this.newDepIds = new Set()
    this.expression = process.env.NODE_ENV !== 'production'
      ? expOrFn.toString()
      : ''
    // parse expression for getter
    // 2.解析表达式,获取getter方法
    // 如果是function类型,直接将其设置为getter方法
    if (typeof expOrFn === 'function') {
      this.getter = expOrFn
    } else {
      // 否则需要从中间解析出用户设置的getter
      // 这种情况下一般是b.c.d的字符串,使用this.getter(a)的形式可以得到a.b.c.d
      this.getter = parsePath(expOrFn)
      if (!this.getter) {
        this.getter = noop
        process.env.NODE_ENV !== 'production' && warn(
          `Failed watching path: "${expOrFn}" ` +
          'Watcher only accepts simple dot-delimited paths. ' +
          'For full control, use a function instead.',
          vm
        )
      }
    }
    this.value = this.lazy
      ? undefined
      : this.get()
  }

  /**
   * Evaluate the getter, and re-collect dependencies.
   * 计算getter的值,重新收集依赖
   * 其实就是获取被watch属性当前的值
   */
  get () {
    // 1.将当前的watcher压栈
    pushTarget(this)
    let value
    const vm = this.vm
    try {
      // 2.核心代码,依赖收集
      // 获取当前值
      value = this.getter.call(vm, vm)
    } catch (e) {
      if (this.user) {
        handleError(e, vm, `getter for watcher "${this.expression}"`)
      } else {
        throw e
      }
    } finally {
      // "touch" every property so they are all tracked as
      // dependencies for deep watching
      // 3.收尾工作
      if (this.deep) {
        traverse(value)
      }
      popTarget()
      this.cleanupDeps()
    }
    return value
  }

  /**
   * Add a dependency to this directive.
   * 把dep和它的id添加到缓冲区
   * 同时也把自己添加到dep的sup里面
   * 你中有我我中有你
   */
  addDep (dep: Dep) {
    const id = dep.id
    // 如果缓冲区中没有改id
    if (!this.newDepIds.has(id)) {
      // 添加id到缓冲区
      this.newDepIds.add(id)
      // 添加dep到缓冲区
      this.newDeps.push(dep)
      // 如果真正的池子里没有id
      if (!this.depIds.has(id)) {
        // 添加到池子里
        dep.addSub(this)
      }
    }
  }

  /**
   * Clean up for dependency collection.
   */
  cleanupDeps () {
    let i = this.deps.length
    while (i--) {
      const dep = this.deps[i]
      if (!this.newDepIds.has(dep.id)) {
        dep.removeSub(this)
      }
    }
    let tmp = this.depIds
    this.depIds = this.newDepIds
    this.newDepIds = tmp
    this.newDepIds.clear()
    tmp = this.deps
    this.deps = this.newDeps
    this.newDeps = tmp
    this.newDeps.length = 0
  }

  /**
   * Subscriber interface.
   * Will be called when a dependency changes.
   * 
   */
  update () {
    /* istanbul ignore else */
    if (this.lazy) {
      // 异步处理,先标记一下该变量是个脏值
      this.dirty = true
    } else if (this.sync) {
      // 同步处理,立即执行(插队)
      this.run()
    } else {
      // 一般情况下,队列执行
      queueWatcher(this)
    }
  }

  /**
   * Scheduler job interface.
   * Will be called by the scheduler.
   */
  run () {
    // 不活跃的话直接不管了
    if (this.active) {
      // 获取当前的值
      const value = this.get()
      if (
        value !== this.value || // 当前值和之前的值一样
        // Deep watchers and watchers on Object/Arrays should fire even
        // when the value is the same, because the value may
        // have mutated.
        isObject(value) || // 当前值是个对象
        this.deep // 需要深度观察
      ) {
        // set new value
        // 赋值
        const oldValue = this.value
        this.value = value
        if (this.user) {
          // 如果是$watch调用的,加个报错
          try {
            this.cb.call(this.vm, value, oldValue)
          } catch (e) {
            handleError(e, this.vm, `callback for watcher "${this.expression}"`)
          }
        } else {
          this.cb.call(this.vm, value, oldValue)
        }
      }
    }
  }

  /**
   * Evaluate the value of the watcher.
   * This only gets called for lazy watchers.
   * 求值
   */
  evaluate () {
    this.value = this.get()
    this.dirty = false
  }

  /**
   * Depend on all deps collected by this watcher.
   * 和自己dep池子里的所有dep形成你中有我我中有你的状态
   */
  depend () {
    let i = this.deps.length
    while (i--) {
      // if (Dep.target) {
      //   Dep.target.addDep(this)
      // }
      this.deps[i].depend()
    }
  }

  /**
   * Remove self from all dependencies' subscriber list.
   * 从所有的dep中把自己移除
   */
  teardown () {
    if (this.active) {
      // remove self from vm's watcher list
      // this is a somewhat expensive operation so we skip it
      // if the vm is being destroyed.
      if (!this.vm._isBeingDestroyed) {
        remove(this.vm._watchers, this)
      }
      let i = this.deps.length
      while (i--) {
        this.deps[i].removeSub(this)
      }
      this.active = false
    }
  }
}
