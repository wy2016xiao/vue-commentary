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
  expression: string; // 'a.b.c'
  cb: Function; // 当watcher被通知时,被调用的函数
  id: number; // 批量时的id
  deep: boolean; // 是否需要深度监听
  user: boolean; // 是开发者自定义的watcher还是内部定义的
  lazy: boolean; // input输入框会由input触发改为onchange触发
  // 也就是时失去焦点时触发
  sync: boolean; // 当数据变化时是否同步求值并执行回调
  dirty: boolean; // 脏值,在异步update数据的时候需要
  active: boolean; // 是否活跃,不活跃的时候也就不需要通知了
  deps: Array<Dep>; // 该watcher对应的维护的dep数组
  newDeps: Array<Dep>; // 该watcher对应的新的dep的缓冲
  depIds: SimpleSet; // 该watcher对应的维护的发布器id
  newDepIds: SimpleSet; // 该watcher对应的新的dep的id的缓冲
  before: ?Function; // 相当于watcher的钩子,当数据变化之后，触发更新之前，调用
  getter: Function; // 获取当前'a.b.c'或者传入函数的值,有一个可选参数,一般传入当前实例,代表this.a.b.c
  value: any; // 当前值

  constructor (
    vm: Component,
    expOrFn: string | Function, // 被观察的数据的求值表达式
    cb: Function, // 当被观察的表达式的值变化时的回调函数
    options?: ?Object, // 一些类似deep的选项
    // 并不是只有state能被观察,实际上该类也被内部使用,比如渲染函数也能被观察
    isRenderWatcher?: boolean // 用来标识该观察者实例是否是渲染函数的观察者
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
   * 求值,重新收集依赖
   * 其实就是获取被watch属性当前的值
   */
  get () {
    // 1.将当前的watcher压栈
    // 这样触发getter时就知道应该收集哪个watcher了
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
      // 3.收尾工作
      if (this.deep) {
        // 递归一次value,做一个取值操作以触发getter
        traverse(value)
      }
      popTarget()
      this.cleanupDeps()
    }
    return value
  }

  /**
   * 如果新的deps里面没有,则把该dep加入到列表里面
   * 如果同时需要检查dep自身的subs里面有没有自己
   * 如果没有自己也要addSub
   */
  addDep (dep: Dep) {
    const id = dep.id
    // 如果新deps中没有该id
    if (!this.newDepIds.has(id)) {
      // 添加id到缓冲区
      this.newDepIds.add(id)
      // 添加dep到缓冲区
      this.newDeps.push(dep)
      // 如果真正的池子里没有id,说明dep的subs里面没有自己,把自己加进去
      if (!this.depIds.has(id)) {
        // 添加到池子里
        dep.addSub(this)
      }
    }
  }

  /**
   * 清空实例的deps列表
   * 把newdeps赋值给deps,同时清掉旧的deps
   */
  cleanupDeps () {
    // 1. 遍历实例上的deps,新的depLists里面没有则将在dep的subs里面将自己删掉
    let i = this.deps.length
    while (i--) {
      const dep = this.deps[i]
      if (!this.newDepIds.has(dep.id)) {
        // 如果新的deps里面没有这个dep,证明已经过期可以将watcher从Dep的subs里删掉了
        // 我里面没有你,那你里面也不必有我了
        dep.removeSub(this)
      }
    }
    // 2.把newdeps赋值给deps,同时清掉旧的deps
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
   * 更新数据,实际上是执行的run或者queueWatcher函数
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
   * 当值发生改变或是是个对象(对象无法确定是否值发生改变)或是需要深度观察时
   * 调用cb
   */
  run () {
    // 不活跃的话直接不管了
    if (this.active) {
      // 获取当前的值
      const value = this.get()
      if (
        value !== this.value || // 当前值和之前的值不一样
        isObject(value) || // 当前值是个对象
        this.deep // 需要深度观察
      ) {
        // 赋值
        const oldValue = this.value // 暂存一下调用cb的时候要传过去
        this.value = value
        // 调用cb
        if (this.user) {
          // 如果是调用的用户定义的,catch一下
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
   * 求值,赋值给value同时dirty重置为false
   */
  evaluate () {
    this.value = this.get()
    this.dirty = false
  }

  /**
   * 和自己dep池子里的所有dep形成你中有我我中有你的状态
   * 实际上就是调用了自己的addDep方法
   */
  depend () {
    let i = this.deps.length
    while (i--) {
      // depend:
      // if (Dep.target) {
      //   Dep.target.addDep(this)
      // }
      this.deps[i].depend()
    }
  }

  /**
   * 真正的销毁抹去一个watcher实例的存在
   * 1.从所有的dep的subs中把自己移除
   * 2.从实例的_watchers列表中把自己移除
   */
  teardown () {
    if (this.active) {
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
