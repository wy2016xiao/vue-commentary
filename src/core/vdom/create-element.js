/* @flow */

import config from '../config'
import VNode, { createEmptyVNode } from './vnode'
import { createComponent } from './create-component'
import { traverse } from '../observer/traverse'

import {
  warn,
  isDef,
  isUndef,
  isTrue,
  isObject,
  isPrimitive,
  resolveAsset
} from '../util/index'

import {
  normalizeChildren,
  simpleNormalizeChildren
} from './helpers/index'

const SIMPLE_NORMALIZE = 1
const ALWAYS_NORMALIZE = 2

// wrapper function for providing a more flexible interface
// without getting yelled at by flow
/**
 * 创建VNode
 *
 * @date 2020-04-21
 * @export
 * @param {Component} context - vm
 * @param {*} tag / {String | Object | Function}
 * 一个 HTML 标签字符串，组件选项对象，或者
 * 解析上述任何一种的一个 async 异步函数。必需参数。
 * @param {*} data - 一个包含模板相关属性的数据对象，可选参数 会有attr props style on等
 * @param {*} children - 子虚拟节点 (VNodes)，由 `createElement()` 构建而成，
 * 也可以使用字符串来生成“文本虚拟节点”。可选参数。
 * @param {*} normalizationType - 子节点的规范类型，对于手写的render方法需要进行规整
 * @param {boolean} alwaysNormalize
 * @returns {(VNode | Array<VNode>)}
 */
export function createElement (
  context: Component,
  tag: any,
  data: any,
  children: any,
  normalizationType: any,
  alwaysNormalize: boolean
): VNode | Array<VNode> {
  // 参数重载
  // 处理data的入参，如果data不符合规范(是数组或简单数据格式)就视作没有
  // 主要是怕用户传了个奇怪的data,那就默认用户没有传data,吧所有参数往前移动
  if (Array.isArray(data) || isPrimitive(data)) {
    normalizationType = children
    children = data
    data = undefined
  }
  // 是否定义了永远标准化
  // CONFUSING: 这个变量是啥意思
  if (isTrue(alwaysNormalize)) {
    normalizationType = ALWAYS_NORMALIZE
  }
  // 这才是核心
  return _createElement(context, tag, data, children, normalizationType)
}

/**
 * 创建虚拟dom tree
 * @date 2020-04-21
 * @export
 * @param {Component} context - vm
 * @param {(string | Class<Component> | Function | Object)} [tag]
 * @param {VNodeData} [data]
 * @param {*} [children]
 * @param {number} [normalizationType]
 * @returns {(VNode | Array<VNode>)}
 */
export function _createElement (
  context: Component,
  tag?: string | Class<Component> | Function | Object,
  data?: VNodeData,
  children?: any,
  normalizationType?: number
): VNode | Array<VNode> {
  // 避免使用被观察的对象作为vnode的选项对象
  // 即vnode不可以是一个响应式的
  // 会返回一个注释节点(空节点)
  if (isDef(data) && isDef((data: any).__ob__)) {
    process.env.NODE_ENV !== 'production' && warn(
      `Avoid using observed data object as vnode data: ${JSON.stringify(data)}\n` +
      'Always create fresh vnode data objects in each render!',
      context
    )
    return createEmptyVNode()
  }
  // object syntax in v-bind
  // is属性绑定
  if (isDef(data) && isDef(data.is)) {
    tag = data.is
  }
  if (!tag) {
    // in case of component :is set to falsy value
    // 也有一种情况是is的值是个假值
    // 此时也返回一个空vnode   即注释节点
    return createEmptyVNode()
  }
  // warn against non-primitive key
  // key属性的值不是一个简单数据类型的话,就警告
  if (process.env.NODE_ENV !== 'production' &&
    isDef(data) && isDef(data.key) && !isPrimitive(data.key)
  ) {
    // 没有使用__WEEX__或者key中没有@binding的情况下,进行警告
    if (!__WEEX__ || !('@binding' in data.key)) {
      warn(
        'Avoid using non-primitive value as key, ' +
        'use string/number value instead.',
        context
      )
    }
  }
  // support single function children as default scoped slot
  // 函数式子节点,使用渲染函数时会触发
  // 把children长度变为零
  if (Array.isArray(children) && // children是个数组
    typeof children[0] === 'function' // 第一个children是个函数
  ) {
    data = data || {}
    data.scopedSlots = { default: children[0] }
    children.length = 0
  }
  // 规整子节点
  // 经过children的规整，children变成一个类型为VNode的Array
  if (normalizationType === ALWAYS_NORMALIZE) {
    children = normalizeChildren(children)
  } else if (normalizationType === SIMPLE_NORMALIZE) {
    children = simpleNormalizeChildren(children)
  }
  let vnode, ns
  // 创建VNode
  if (typeof tag === 'string') {
    let Ctor
    // ns: namespace
    ns = (context.$vnode && context.$vnode.ns) || config.getTagNamespace(tag)
    // 判断是否是html协议的保留标签
    if (config.isReservedTag(tag)) {
      // 保留字段规整
      // 创建一个普通的VNode，初始化tag，data，children等变量
      vnode = new VNode(
        // 让保留字段变得规整
        config.parsePlatformTagName(tag), data, children,
        undefined, undefined, context
      ) 
    } else if ((!data || !data.pre) && isDef(Ctor = resolveAsset(context.$options, 'components', tag))) {
      // 已注册的组件，则调用createComponent创建VNode
      vnode = createComponent(Ctor, data, context, children, tag)
    } else {
      // 未知的或未列出的命名空间元素
      // 在运行时检查，因为它可能会被分配一个名称空间
      // 标准化子组件

      // 创建一个未知标签的VNode
      vnode = new VNode(
        tag, data, children,
        undefined, undefined, context
      )
    }
  } else {
    // direct component options / constructor
    // 如果不是个String类型，调用createComponent创建组件类型的VNode
    vnode = createComponent(tag, data, context, children)
  }
  if (Array.isArray(vnode)) {
    // 是个数组就直接返回
    return vnode
  } else if (isDef(vnode)) {
    // 不是数组
    if (isDef(ns)) applyNS(vnode, ns) // 有命名空间则递归的赋予命名空间
    if (isDef(data)) registerDeepBindings(data) // 对data进行深度的双向绑定 主要是styles和class
    return vnode
  } else {
    // 没定义就给个空vnode
    return createEmptyVNode()
  }
}

/**
 * 递归地给VNode应用命名空间
 */
function applyNS (vnode, ns, force) {
  vnode.ns = ns
  if (vnode.tag === 'foreignObject') {
    // use default namespace inside foreignObject
    ns = undefined
    force = true
  }
  if (isDef(vnode.children)) {
    for (let i = 0, l = vnode.children.length; i < l; i++) {
      const child = vnode.children[i]
      if (isDef(child.tag) && (
        isUndef(child.ns) || (isTrue(force) && child.tag !== 'svg'))) {
        applyNS(child, ns, force)
      }
    }
  }
}

// ref #5318
// necessary to ensure parent re-render when deep bindings like :style and
// :class are used on slot nodes
/**
 * 给VNode应用style和class
 */
function registerDeepBindings (data) {
  if (isObject(data.style)) {
    traverse(data.style)
  }
  if (isObject(data.class)) {
    traverse(data.class)
  }
}
