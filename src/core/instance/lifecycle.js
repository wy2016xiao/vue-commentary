/* @flow */

import config from '../config'
import Watcher from '../observer/watcher'
import { mark, measure } from '../util/perf'
import { createEmptyVNode } from '../vdom/vnode'
import { updateComponentListeners } from './events'
import { resolveSlots } from './render-helpers/resolve-slots'
import { toggleObserving } from '../observer/index'
import { pushTarget, popTarget } from '../observer/dep'

import {
  warn,
  noop,
  remove,
  emptyObject,
  validateProp,
  invokeWithErrorHandling
} from '../util/index'

export let activeInstance: any = null
export let isUpdatingChildComponent: boolean = false

/**
 * 更新当前活跃实例的值
 *
 * @date 2021-01-06
 * @export
 * @param {Component} vm - 新的实例,将要替换当前实例
 * @returns 
 */
export function setActiveInstance(vm: Component) {
  const prevActiveInstance = activeInstance
  activeInstance = vm
  return () => {
    activeInstance = prevActiveInstance
  }
}

/**
 * 初始化生命周期
 * 1.找到最近的一个非抽象父组件，在他的$children数组中添加自己
 * 2.初始化一些变量 $parent $root $children $refs _watcher _inactive _directInactive _isMounted _isDestroyed _isBeingDestroyed
 * @date 2020-01-13
 * @export
 * @param {Component} vm
 */
export function initLifecycle (vm: Component) {
  const options = vm.$options

  let parent = options.parent
  if (parent && !options.abstract) {
    // 如果有父组件且自身不是抽象组件（抽象组件就是不渲染出真实DOM的组件，如keep-alive组件）
    // 抽象组件：自身不会渲染一个 DOM 元素，也不会出现在父组件链中
    while (parent.$options.abstract && parent.$parent) {
      parent = parent.$parent
    }
    // 通过while循环父组件链，找出最近的一个非抽象的组件，并赋值为parent，为该parent的子组件数据添加vm对象，形成一个环形链表
    // 这个链表是非抽象组件链表，忽略了抽象组件
    parent.$children.push(vm)
  }

  // 初始化vue实例的一系列属性
  // $parent $root $children $refs _watcher _inactive _directInactive _isMounted 
  // _isDestroyed _isBeingDestroyed
  vm.$parent = parent
  vm.$root = parent ? parent.$root : vm

  vm.$children = []
  vm.$refs = {}

  vm._watcher = null
  vm._inactive = null
  vm._directInactive = false
  vm._isMounted = false
  vm._isDestroyed = false
  vm._isBeingDestroyed = false
}

/**
 * 定义了_update $forceUpdate $destroy方法
 * @date 2021-01-06
 * @export
 * @param {Class<Component>} Vue
 */
export function lifecycleMixin (Vue: Class<Component>) {
  // vm._update会把vnode渲染成真实的dom节点
  // 它调用的时机有两个地方，第一个是首次渲染，第二个是数据更新
  // 核心其实就是调用了__patch__方法
  Vue.prototype._update = function (vnode: VNode, hydrating?: boolean) {
    const vm: Component = this
    const prevEl = vm.$el
    const prevVnode = vm._vnode
    const restoreActiveInstance = setActiveInstance(vm)
    vm._vnode = vnode // 把实例上那个当前vnode更新为传入的这个
    // 使用prevVnode来判断是首次渲染还是更新DOM
    if (!prevVnode) {
      // 首次渲染
      vm.$el = vm.__patch__(vm.$el, vnode, hydrating, false /* removeOnly */)
    } else {
      // 更新DOM
      vm.$el = vm.__patch__(prevVnode, vnode)
    }
    restoreActiveInstance()
    // update __vue__ reference
    if (prevEl) {
      prevEl.__vue__ = null
    }
    if (vm.$el) {
      vm.$el.__vue__ = vm
    }
    // if parent is an HOC, update its $el as well
    if (vm.$vnode && vm.$parent && vm.$vnode === vm.$parent._vnode) {
      vm.$parent.$el = vm.$el
    }
    // updated hook is called by the scheduler to ensure that children are
    // updated in a parent's updated hook.
  }

  // 提供了一个手动调用当前watcher的update的方法的方法
  Vue.prototype.$forceUpdate = function () {
    const vm: Component = this
    if (vm._watcher) {
      vm._watcher.update()
    }
  }

  // 销毁实例
  Vue.prototype.$destroy = function () {
    const vm: Component = this
    // 如果正在被销毁就不管了
    if (vm._isBeingDestroyed) {
      return
    }
    // 上来就调用beforeDestory钩子
    callHook(vm, 'beforeDestroy')
    vm._isBeingDestroyed = true
    // 1.从父实例上的$children列表中移除自己
    const parent = vm.$parent
    if (parent && !parent._isBeingDestroyed && !vm.$options.abstract) {
      remove(parent.$children, vm)
    }
    // 2.销毁watcher
    // 当前watcher
    if (vm._watcher) {
      vm._watcher.teardown()
    }
    let i = vm._watchers.length
    // 销毁所有watcher
    while (i--) {
      vm._watchers[i].teardown()
    }
    // remove reference from data ob
    // frozen object may not have observer.
    // 实例被销毁那么__ob__的计数也要减一
    if (vm._data.__ob__) {
      vm._data.__ob__.vmCount--
    }
    vm._isDestroyed = true
    // 把vnode给更新咯
    vm.__patch__(vm._vnode, null)
    // destroyed钩子调用
    callHook(vm, 'destroyed')
    // 取消所有事件监听
    vm.$off()
    // $el上的__vue__重置
    if (vm.$el) {
      vm.$el.__vue__ = null
    }
    // release circular reference (#6759)
    if (vm.$vnode) {
      vm.$vnode.parent = null
    }
  }
}

/**
 * 挂载组件
 * @date 2020-04-21
 * @export
 * @param {Component} vm - 当前实例
 * @param {?Element} el - 被挂载的DOM实例
 * @param {boolean} [hydrating] - 是否服务端渲染
 * @returns {Component}
 */
export function mountComponent (
  vm: Component,
  el: ?Element,
  hydrating?: boolean
): Component {
  vm.$el = el
  // 如果没有使用render的方式去定义template（createElement）
  // 那就是我们最熟悉的template标签的方式咯
  if (!vm.$options.render) {
    // 给一个默认值
    vm.$options.render = createEmptyVNode
    // 
    if (process.env.NODE_ENV !== 'production') {
      /* istanbul ignore if */
      if ((vm.$options.template && vm.$options.template.charAt(0) !== '#') ||
        vm.$options.el || el) {
        warn(
          'You are using the runtime-only build of Vue where the template ' +
          'compiler is not available. Either pre-compile the templates into ' +
          'render functions, or use the compiler-included build.',
          vm
        )
      } else {
        warn(
          'Failed to mount component: template or render function not defined.',
          vm
        )
      }
    }
  }
  callHook(vm, 'beforeMount')

  let updateComponent
  /* istanbul ignore if */
  // 定义updateComponent，vm._render将render表达式转化为vnode，vm._update将vnode渲染成实际的dom节点
  if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
    updateComponent = () => {
      const name = vm._name
      const id = vm._uid
      const startTag = `vue-perf-start:${id}`
      const endTag = `vue-perf-end:${id}`

      mark(startTag)
      // 将render表达式转化为vnode
      const vnode = vm._render()
      mark(endTag)
      measure(`vue ${name} render`, startTag, endTag)

      mark(startTag)
      // 将vnode渲染成实际的dom节点
      vm._update(vnode, hydrating)
      mark(endTag)
      measure(`vue ${name} patch`, startTag, endTag)
    }
  } else {
    // 定义updateComponent，
    // vm._render将render表达式转化为vnode，
    // vm._update将vnode渲染成实际的dom节点

    // 这里在render时就会触发html中你写的变量的getter
    updateComponent = () => {
      vm._update(vm._render(), hydrating)
    }
  }

  // we set this to vm._watcher inside the watcher's constructor
  // since the watcher's initial patch may call $forceUpdate (e.g. inside child
  // component's mounted hook), which relies on vm._watcher being already defined
  // 首次渲染，并监听数据变化，并实现dom的更新
  // new Watcher干了两件事情
  // 执行updateComponent方法，实现dom的渲染，并完成表达式对属性变量的依赖收集。
  // 一旦包含的表达式中的属性变量有变化，将重新执行update。
  new Watcher(vm, updateComponent, noop, {
    before () {
      if (vm._isMounted && !vm._isDestroyed) {
        callHook(vm, 'beforeUpdate')
      }
    }
  }, true /* isRenderWatcher */)
  hydrating = false

  // manually mounted instance, call mounted on self
  // mounted is called for render-created child components in its inserted hook
  // 挂载完成，回调mount函数
  if (vm.$vnode == null) {
    vm._isMounted = true
    callHook(vm, 'mounted')
  }
  return vm
}

/**
 *
 *
 * @date 2020-04-21
 * @export
 * @param {Component} vm
 * @param {?Object} propsData
 * @param {?Object} listeners
 * @param {MountedComponentVNode} parentVnode
 * @param {?Array<VNode>} renderChildren
 */
export function updateChildComponent (
  vm: Component,
  propsData: ?Object,
  listeners: ?Object,
  parentVnode: MountedComponentVNode,
  renderChildren: ?Array<VNode>
) {
  if (process.env.NODE_ENV !== 'production') {
    isUpdatingChildComponent = true
  }

  // determine whether component has slot children
  // we need to do this before overwriting $options._renderChildren.

  // check if there are dynamic scopedSlots (hand-written or compiled but with
  // dynamic slot names). Static scoped slots compiled from template has the
  // "$stable" marker.
  const newScopedSlots = parentVnode.data.scopedSlots
  const oldScopedSlots = vm.$scopedSlots
  const hasDynamicScopedSlot = !!(
    (newScopedSlots && !newScopedSlots.$stable) ||
    (oldScopedSlots !== emptyObject && !oldScopedSlots.$stable) ||
    (newScopedSlots && vm.$scopedSlots.$key !== newScopedSlots.$key)
  )

  // Any static slot children from the parent may have changed during parent's
  // update. Dynamic scoped slots may also have changed. In such cases, a forced
  // update is necessary to ensure correctness.
  const needsForceUpdate = !!(
    renderChildren ||               // has new static slots
    vm.$options._renderChildren ||  // has old static slots
    hasDynamicScopedSlot
  )

  vm.$options._parentVnode = parentVnode
  vm.$vnode = parentVnode // update vm's placeholder node without re-render

  if (vm._vnode) { // update child tree's parent
    vm._vnode.parent = parentVnode
  }
  vm.$options._renderChildren = renderChildren

  // update $attrs and $listeners hash
  // these are also reactive so they may trigger child update if the child
  // used them during render
  vm.$attrs = parentVnode.data.attrs || emptyObject
  vm.$listeners = listeners || emptyObject

  // update props
  if (propsData && vm.$options.props) {
    toggleObserving(false)
    const props = vm._props
    const propKeys = vm.$options._propKeys || []
    for (let i = 0; i < propKeys.length; i++) {
      const key = propKeys[i]
      const propOptions: any = vm.$options.props // wtf flow?
      props[key] = validateProp(key, propOptions, propsData, vm)
    }
    toggleObserving(true)
    // keep a copy of raw propsData
    vm.$options.propsData = propsData
  }

  // update listeners
  listeners = listeners || emptyObject
  const oldListeners = vm.$options._parentListeners
  vm.$options._parentListeners = listeners
  updateComponentListeners(vm, listeners, oldListeners)

  // resolve slots + force update if has children
  if (needsForceUpdate) {
    vm.$slots = resolveSlots(renderChildren, parentVnode.context)
    vm.$forceUpdate()
  }

  if (process.env.NODE_ENV !== 'production') {
    isUpdatingChildComponent = false
  }
}

function isInInactiveTree (vm) {
  while (vm && (vm = vm.$parent)) {
    if (vm._inactive) return true
  }
  return false
}

export function activateChildComponent (vm: Component, direct?: boolean) {
  if (direct) {
    vm._directInactive = false
    if (isInInactiveTree(vm)) {
      return
    }
  } else if (vm._directInactive) {
    return
  }
  if (vm._inactive || vm._inactive === null) {
    vm._inactive = false
    for (let i = 0; i < vm.$children.length; i++) {
      activateChildComponent(vm.$children[i])
    }
    callHook(vm, 'activated')
  }
}

export function deactivateChildComponent (vm: Component, direct?: boolean) {
  if (direct) {
    vm._directInactive = true
    if (isInInactiveTree(vm)) {
      return
    }
  }
  if (!vm._inactive) {
    vm._inactive = true
    for (let i = 0; i < vm.$children.length; i++) {
      deactivateChildComponent(vm.$children[i])
    }
    callHook(vm, 'deactivated')
  }
}

/**
 * 调用用户自定义的生命周期钩子函数
 * @date 2020-01-13
 * @export
 * @param {Component} vm
 * @param {string} hook
 */
export function callHook (vm: Component, hook: string) {
  // #7573 disable dep collection when invoking lifecycle hooks
  // 使用一个空的watch实例
  pushTarget()
  // 获取定义的钩子函数
  const handlers = vm.$options[hook]
  const info = `${hook} hook`
  if (handlers) {
    // 调用
    for (let i = 0, j = handlers.length; i < j; i++) {
      invokeWithErrorHandling(handlers[i], vm, null, vm, info)
    }
  }
  // 如果有生命周期指令，也一并调用
  if (vm._hasHookEvent) {
    vm.$emit('hook:' + hook)
  }
  // 推出空的watch实例
  popTarget()
}
