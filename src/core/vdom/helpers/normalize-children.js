/* @flow */

import VNode, { createTextVNode } from 'core/vdom/vnode'
import { isFalse, isTrue, isDef, isUndef, isPrimitive } from 'shared/util'

// The template compiler attempts to minimize the need for normalization by
// statically analyzing the template at compile time.
//
// For plain HTML markup, normalization can be completely skipped because the
// generated render function is guaranteed to return Array<VNode>. There are
// two cases where extra normalization is needed:

// 1. When the children contains components - because a functional component
// may return an Array instead of a single root. In this case, just a simple
// normalization is needed - if any child is an Array, we flatten the whole
// thing with Array.prototype.concat. It is guaranteed to be only 1-level deep
// because functional components already normalize their own children.
//模板编译器试图尽量减少对标准化的需要
//编译时静态分析模板。
//
//对于普通的HTML标记，可以完全跳过标准化，因为
//生成的渲染函数保证返回数组<VNode>。有
//两种需要额外归一化的情况:

/**
 * 1.
 * 当子组件包含组件时——因为是功能组件
 * 可能会返回一个数组，而不是单个根。(react中会做出警告)在这种情况下，很简单
 * 需要归一化——如果任何一个子元素是一个数组，我们就把它整平
 * (函数式组件返回的就是一个数组)
 * 关于数组的东西。它保证只有1级深
 * 因为功能组件已经将它们自己的子组件规范化了。
 * 
 * simpleNormalizeChildren是指对函数式组件的处理，函数式组件返回的是一个数组而不是一个根节点，
 * 需要通过Array.prototype.concat将数组平整化，让它只有一层的深度。
 */
export function simpleNormalizeChildren (children: any) {
  for (let i = 0; i < children.length; i++) {
    if (Array.isArray(children[i])) {
      return Array.prototype.concat.apply([], children)
    }
  }
  return children
}

// 2. When the children contains constructs that always generated nested Arrays,
// e.g. <template>, <slot>, v-for, or when the children is provided by user
// with hand-written render functions / JSX. In such cases a full normalization
// is needed to cater to all possible types of children values.
/**
 * 2.
 * 当子元素包含总是生成嵌套数组的结构时，
 * 例如:<template>， <slot>， v-for, or when the children is provided by user
 * 用手写的渲染函数/ JSX。在这种情况下，完全正常化
 * 是为了迎合所有可能的子节点值。
 * 
 * 处理手写的render函数或者JSX，当children是基础的类型时，
 * 通过createTextVNode创建Textvnode节点；当编译v-for，slot时会产生嵌套数组时，
 * 调用normalizeArrayChildren处理。
 */
export function normalizeChildren (children: any): ?Array<VNode> {
  return isPrimitive(children)
    ? [createTextVNode(children)]
    : Array.isArray(children)
      ? normalizeArrayChildren(children)
      : undefined
}

function isTextNode (node): boolean {
  return isDef(node) && isDef(node.text) && isFalse(node.isComment)
}

function normalizeArrayChildren (children: any, nestedIndex?: string): Array<VNode> {
  const res = []
  let i, c, lastIndex, last
  for (i = 0; i < children.length; i++) {
    c = children[i]
    if (isUndef(c) || typeof c === 'boolean') continue
    lastIndex = res.length - 1
    last = res[lastIndex]
    //  nested
    if (Array.isArray(c)) {
      if (c.length > 0) {
        c = normalizeArrayChildren(c, `${nestedIndex || ''}_${i}`)
        // merge adjacent text nodes
        if (isTextNode(c[0]) && isTextNode(last)) {
          res[lastIndex] = createTextVNode(last.text + (c[0]: any).text)
          c.shift()
        }
        res.push.apply(res, c)
      }
    } else if (isPrimitive(c)) {
      if (isTextNode(last)) {
        // merge adjacent text nodes
        // this is necessary for SSR hydration because text nodes are
        // essentially merged when rendered to HTML strings
        res[lastIndex] = createTextVNode(last.text + c)
      } else if (c !== '') {
        // convert primitive to vnode
        res.push(createTextVNode(c))
      }
    } else {
      if (isTextNode(c) && isTextNode(last)) {
        // merge adjacent text nodes
        res[lastIndex] = createTextVNode(last.text + c.text)
      } else {
        // default key for nested array children (likely generated by v-for)
        if (isTrue(children._isVList) &&
          isDef(c.tag) &&
          isUndef(c.key) &&
          isDef(nestedIndex)) {
          c.key = `__vlist${nestedIndex}_${i}__`
        }
        res.push(c)
      }
    }
  }
  return res
}
