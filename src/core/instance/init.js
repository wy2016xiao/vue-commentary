/* @flow */

import config from '../config'
import { initProxy } from './proxy'
import { initState } from './state'
import { initRender } from './render'
import { initEvents } from './events'
import { mark, measure } from '../util/perf'
import { initLifecycle, callHook } from './lifecycle'
import { initProvide, initInjections } from './inject'
import { extend, mergeOptions, formatComponentName } from '../util/index'

let uid = 0

// 给实例加上了_init方法，以供实例化时（new Vue()）调用
export function initMixin (Vue: Class<Component>) {
  Vue.prototype._init = function (options?: Object) {
    const vm: Component = this
    /**
     * 第一部分
     * 1.初始化部分属性
     * _uid _isVue
     * 2.开启性能检测
     */
    // 每个vue实例都会有一个唯一的uid用来区分不同的vue实例
    // uid只增不减，全局js变量
    vm._uid = uid++

    let startTag, endTag
    /* istanbul ignore if */
    // config.performance 是否开启性能检测
    // 开启性能检测且非生产环境则进行时间戳记录
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      startTag = `vue-perf-start:${vm._uid}`
      endTag = `vue-perf-end:${vm._uid}`
      // 性能测试开始
      // 在created之后，性能测试结束
      mark(startTag)
    }

    // _isVue变量可以避免对象被观察
    vm._isVue = true

    /**
     * 第二部分
     * 合并相关options
     */
    if (options && options._isComponent) {
      // 当实例作为组件被生成时,会在options中加上_isComponent属性用作标签
      // 如果是组件的话
      // 优化内部组件实例化
      // 由于动态选项合并很慢，所以内部组件需要特殊处理
      // 如果是组件init，那么初始化内部组件，给组件实例加上一些属性
      initInternalComponent(vm, options)
    } else {
      // 如果是顶层实例则设置它的options
      // 对options进行合并，vue会将相关的属性和方法都统一放到vm.$options中，为后续的调用做准备工作。vm.$option的属性来自两个方面，一个是Vue的构造函数(vm.constructor)预先定义的，一个是new Vue时传入的入参对象
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      )
    }

    /**
     * 第三部分 
     * 初始化相关功能
     */

    if (process.env.NODE_ENV !== 'production') {
      // 开发环境
      // 代理功能初始化，设置vm._renderProxy
      // 该功能其实主要是用来做一个非法访问属性的警告
      initProxy(vm)
    } else {
      // 生产环境
      // _renderProxy属性指向vm本身
      vm._renderProxy = vm
    }

    // _self保存vm本身
    vm._self = vm

    // 初始化vue实例的一系列属性,给到默认属性
    // $parent $root $children $refs _watcher _inactive _directInactive _isMounted 
    // _isDestroyed _isBeingDestroyed
    initLifecycle(vm)
    // 初始化_events _hasHookEvent变量
    // 存储父组件绑定的当前子组件的事件，保存到vm._events。
    initEvents(vm)
    // 定义vm._c和 vm.$createElement等方法
    initRender(vm)
    // 生命周期事件通知
    // 挨着调用用户定义的生命周期钩子函数和指令
    callHook(vm, 'beforeCreate')
    // 通过逐级查找，从父级provide中获取子级组件inject定义的属性值，并增加对该属性的监听
    // 只设置setter和getter不实例化__ob__
    initInjections(vm) 
    // initProps initMethods initData initComputed initWatch
    // 是对prop，method，data，computed，watch的初始化，增加对定义属性的监听
    initState(vm)
    // 把用户定义的provide赋值到_provided上
    // 如果是函数形式，就调用一下
    initProvide(vm)
    // 生命周期事件通知
    callHook(vm, 'created')

    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      // 性能测试结束部分
      vm._name = formatComponentName(vm, false)
      mark(endTag)
      measure(`vue ${vm._name} init`, startTag, endTag)
    }

    // 挂载。如果说前面几部分都是准备阶段，那么这部分是整个new Vue的核心部分，将template编译成render表达式，然后转化为大名鼎鼎的Vnode，最终渲染为真实的dom节点。
    if (vm.$options.el) {
      vm.$mount(vm.$options.el)
    }
  }
}


/**
 * 在src/core/instance/index.js initMixin()时,如果实例为组件则调用
 * 
 * 初始化组件实例
 * 给传进来的vm实例加上了parent propsData等属性
 * @date 2020-01-13
 * @export
 * @param {Component} vm - vue实例
 * @param {InternalComponentOptions} options - 初始化时的参数项
 */
export function initInternalComponent (vm: Component, options: InternalComponentOptions) {
  // 取Vue构造函数的options属性给实例的$options属性
  // CONFUSING: vm.constructor.options是哪里来的
  const opts = vm.$options = Object.create(vm.constructor.options)
  // doing this because it's faster than dynamic enumeration.
  const parentVnode = options._parentVnode
  opts.parent = options.parent
  opts._parentVnode = parentVnode

  // CONFUSING: parentVnode.componentOptions
  const vnodeComponentOptions = parentVnode.componentOptions
  opts.propsData = vnodeComponentOptions.propsData
  opts._parentListeners = vnodeComponentOptions.listeners
  opts._renderChildren = vnodeComponentOptions.children
  opts._componentTag = vnodeComponentOptions.tag

  if (options.render) {
    opts.render = options.render
    opts.staticRenderFns = options.staticRenderFns
  }
}

/**
 * 一个递归函数
 * 返回构造函数的options
 * @date 2020-01-13
 * @export
 * @param {Class<Component>} Ctor
 * @returns 
 */
export function resolveConstructorOptions (Ctor: Class<Component>) {
  // 这里的options即Vue.options
  let options = Ctor.options
  // 用Vue.extend构造子类时，就会添加一个super属性
  if (Ctor.super) {
    // 如果有继承
    // 先取祖先的options为superOptions
    const superOptions = resolveConstructorOptions(Ctor.super)
    // 对继承的实例的选项做一个缓存
    // CONFUSING: 这里祖先的options和自身的superOptions为什么会不同?
    const cachedSuperOptions = Ctor.superOptions
    if (superOptions !== cachedSuperOptions) {
      // super option changed,
      // need to resolve new options.
      Ctor.superOptions = superOptions
      // check if there are any late-modified/attached options (#4976)
      const modifiedOptions = resolveModifiedOptions(Ctor)
      // update base extend options
      if (modifiedOptions) {
        extend(Ctor.extendOptions, modifiedOptions)
      }
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
      if (options.name) {
        options.components[options.name] = Ctor
      }
    }
  }
  return options
}

function resolveModifiedOptions (Ctor: Class<Component>): ?Object {
  let modified
  const latest = Ctor.options
  const sealed = Ctor.sealedOptions
  for (const key in latest) {
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {}
      modified[key] = latest[key]
    }
  }
  return modified
}
