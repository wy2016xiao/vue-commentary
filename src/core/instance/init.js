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
     * 初始化部分属性
     */
    // 每个vue实例都会有一个唯一的uid用来区分不同的vue实例
    // uid只增不减，全局js变量
    vm._uid = uid++

    let startTag, endTag
    /* istanbul ignore if */
    // performance-全局配置 是否开启性能检测
    // 开启性能检测则进行时间戳记录
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
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      // 开发环境
      // 代理功能初始化，设置vm._renderProxy
      initProxy(vm)
    } else {
      // 生产环境
      // _renderProxy属性指向vm本身
      vm._renderProxy = vm
    }
    // _self保存vm本身
    vm._self = vm
    // 初始化一系列变量
    initLifecycle(vm)
    // 存储父组件绑定当前子组件的事件，保存到vm._events。
    initEvents(vm)
    // 定义vm._c和 vm.$createElement等方法
    initRender(vm)
    // 生命周期事件通知
    callHook(vm, 'beforeCreate')
    // 通过逐级查找，从父级provide中获取子级组件inject定义的属性值，并增加对该属性的监听
    initInjections(vm) 
    // 是对prop，method，data，computed，watch的初始化，增加对定义属性的监听
    initState(vm)

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
 * 当vm为组件时被调用
 * 初始化组件实例
 * 给传进来的vm实例加上了parent propsData等属性
 * @date 2020-01-13
 * @export
 * @param {Component} vm
 * @param {InternalComponentOptions} options
 */
export function initInternalComponent (vm: Component, options: InternalComponentOptions) {
  const opts = vm.$options = Object.create(vm.constructor.options)
  // doing this because it's faster than dynamic enumeration.
  const parentVnode = options._parentVnode
  opts.parent = options.parent
  opts._parentVnode = parentVnode

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
 * 一句话总结，resolveConstructorOptions返回构造函数的options
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
    const superOptions = resolveConstructorOptions(Ctor.super)
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
