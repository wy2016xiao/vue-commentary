/* @flow */

import { makeMap, isBuiltInTag, cached, no } from 'shared/util'

let isStaticKey
let isPlatformReservedTag

const genStaticKeysCached = cached(genStaticKeys)

/**
 * Goal of the optimizer: walk the generated template AST tree
 * and detect sub-trees that are purely static, i.e. parts of
 * the DOM that never needs to change.
 *
 * Once we detect these sub-trees, we can:
 *
 * 1. Hoist them into constants, so that we no longer need to
 *    create fresh nodes for them on each re-render;
 * 2. Completely skip them in the patching process.
 * 优化器的目标:遍历生成的模板AST树
 * 检测纯静态的子树，即
 * 永远不需要改变的DOM。
 *
 * 一旦我们检测到这些子树，我们可以:
 * 
 *  1。把它们变成常数，这样我们就不需要了
 * 在每次重新渲染时为它们创建新的节点;
 *  2。在打补丁的过程中完全跳过它们。
 */
export function optimize (root: ?ASTElement, options: CompilerOptions) {
  if (!root) return
  isStaticKey = genStaticKeysCached(options.staticKeys || '')
  isPlatformReservedTag = options.isReservedTag || no
  // first pass: mark all non-static nodes.
  // 标注静态节点
  markStatic(root)
  // 标注静态根节点
  // second pass: mark static roots.
  markStaticRoots(root, false)
}

function genStaticKeys (keys: string): Function {
  return makeMap(
    'type,tag,attrsList,attrsMap,plain,parent,children,attrs,start,end,rawAttrsMap' +
    (keys ? ',' + keys : '')
  )
}

/**
 * 标注静态节点
 */
function markStatic (node: ASTNode) {
  //1、标注节点的状态
  node.static = isStatic(node)
  //2、对标签节点进行处理
  // type === 1 表示element
  if (node.type === 1) {
    // do not make component slot content static. this avoids
    // 1. components not able to mutate slot nodes
    // 2. static slot content fails for hot-reloading
    if (
      !isPlatformReservedTag(node.tag) && // 非平台保留标签
      node.tag !== 'slot' && // 不是slot标签
      node.attrsMap['inline-template'] == null // 不是一个内联模板选容器
    ) {
      return
    }
    //递归其子节点，给子节点也标注状态
    for (let i = 0, l = node.children.length; i < l; i++) {
      const child = node.children[i]
      // 递归一下
      markStatic(child)
      //如果发现子节点非静态，则该节点也标注非静态
      if (!child.static) {
        node.static = false
      }
    }
    //对ifConditions进行循环递归
    // ifConditions代表该节点使用了if指令
    if (node.ifConditions) {
      for (let i = 1, l = node.ifConditions.length; i < l; i++) {
        // block是当前AST的引用
        const block = node.ifConditions[i].block
        markStatic(block)
        if (!block.static) {
          node.static = false
        }
      }
    }
  }
}

/**
 * 标注静态根节点
 */
function markStaticRoots (node: ASTNode, isInFor: boolean) {
  // type === 1 表示element
  if (node.type === 1) {
    // 用以标记在v-for内的静态节点
    // 这个属性用以告诉renderStatic(_m)对这个节点生成新的key
    // 避免patch error
    if (node.static || node.once) {
      node.staticInFor = isInFor
    }
    // For a node to qualify as a static root, it should have children that
    // are not just static text. Otherwise the cost of hoisting out will
    // outweigh the benefits and it's better off to just always render it fresh.
    //一个节点要成为根节点，那么要满足以下条件：
    //1、静态节点，并且有子节点，
    //2、子节点不能仅为一个文本节点
    if (node.static && node.children.length && !(
      node.children.length === 1 &&
      node.children[0].type === 3
    )) {
      node.staticRoot = true
      return
    } else {
      node.staticRoot = false
    }
    //循环递归标记
    if (node.children) {
      for (let i = 0, l = node.children.length; i < l; i++) {
        markStaticRoots(node.children[i], isInFor || !!node.for)
      }
    }
    if (node.ifConditions) {
      for (let i = 1, l = node.ifConditions.length; i < l; i++) {
        markStaticRoots(node.ifConditions[i].block, isInFor)
      }
    }
  }
}

/**
 * 判断AST节点是否是静态节点
 */
function isStatic (node: ASTNode): boolean {
  if (node.type === 2) { // expression 表达式，标注非静态节点
    return false
  }
  if (node.type === 3) { // text 普通文本，标注静态节点
    return true
  }
  // (1)无动态绑定
  // (2)没有 v-if 和 v-for 
  // (3)不是内置的标签，内置的标签有slot和component 
  // (4)是平台保留标签(html和svg标签)
  // (5)不是 template 标签的直接子元素并且没有包含在 for 循环中
  // (6)结点包含的属性只能有isStaticKey中指定的几个.
  return !!(node.pre || ( // 有v-pre指令
    !node.hasBindings && // no dynamic bindings 无动态绑定
    !node.if && !node.for && // not v-if or v-for or v-else 无v-if v-for 相关指令
    !isBuiltInTag(node.tag) && // not a built-in 不是内置标签，内置标签有slot 和 component
    isPlatformReservedTag(node.tag) && // not a component 是平台保留标签
    !isDirectChildOfTemplateFor(node) && // 不是template标签的直接子元素并且没有包含在for循环中
    Object.keys(node).every(isStaticKey) // 节点包含的属性只能有isStaticKey中指定的几个
  ))
}

function isDirectChildOfTemplateFor (node: ASTElement): boolean {
  while (node.parent) {
    node = node.parent
    if (node.tag !== 'template') {
      return false
    }
    if (node.for) {
      return true
    }
  }
  return false
}
