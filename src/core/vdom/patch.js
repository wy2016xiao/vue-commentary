/**
 * Virtual DOM patching algorithm based on Snabbdom by
 * Simon Friis Vindum (@paldepind)
 * Licensed under the MIT License
 * https://github.com/paldepind/snabbdom/blob/master/LICENSE
 *
 * modified by Evan You (@yyx990803)
 *
 * Not type-checking this because this file is perf-critical and the cost
 * of making flow understand it is not worth it.
 */

import VNode, { cloneVNode } from './vnode'
import config from '../config'
import { SSR_ATTR } from 'shared/constants'
import { registerRef } from './modules/ref'
import { traverse } from '../observer/traverse'
import { activeInstance } from '../instance/lifecycle'
import { isTextInputType } from 'web/util/element'

import {
  warn,
  isDef,
  isUndef,
  isTrue,
  makeMap,
  isRegExp,
  isPrimitive
} from '../util/index'

export const emptyNode = new VNode('', {}, [])

const hooks = ['create', 'activate', 'update', 'remove', 'destroy']

/**
 * 判断两个节点是否相同,无需完全相同
 * key tag isComment !!data input-type
 * @date 2020-05-07
 * @param {*} a
 * @param {*} b
 * @returns 
 */
function sameVnode (a, b) {
  return (
    a.key === b.key && ( // key相同,undefined也算相同
      (
        a.tag === b.tag && // tag相同
        a.isComment === b.isComment && // 是否是comment  注释节点
        isDef(a.data) === isDef(b.data) && // data,属性已定义 比如id属性
        sameInputType(a, b) // input相同 input的type类型相同
      ) || (
        isTrue(a.isAsyncPlaceholder) &&
        a.asyncFactory === b.asyncFactory &&
        isUndef(b.asyncFactory.error)
      )
    )
  )
}

function sameInputType (a, b) {
  if (a.tag !== 'input') return true
  let i
  const typeA = isDef(i = a.data) && isDef(i = i.attrs) && i.type
  const typeB = isDef(i = b.data) && isDef(i = i.attrs) && i.type
  return typeA === typeB || isTextInputType(typeA) && isTextInputType(typeB)
}

/**
 * 把children中所有的key拿出来做成一个映射表并返回
 * {
 *   key_1: 1,
 *   key_2: 2,
 *   ...
 * }
 * @date 2020-05-07
 * @param {*} children - 
 * @param {*} beginIdx - startIdx
 * @param {*} endIdx - endIdx
 * @returns 
 */
function createKeyToOldIdx (children, beginIdx, endIdx) {
  let i, key
  const map = {}
  for (i = beginIdx; i <= endIdx; ++i) {
    key = children[i].key
    if (isDef(key)) map[key] = i
  }
  return map
}

/**
 * 一个终极长的函数
 * 内部定义了一系列方法，最后返回了patch方法，
 * 它有四个参数，实际在vm.__patch__(vm.$el, vnode, hydrating, false )传入
 * 
 */
export function createPatchFunction (backend) {
  let i, j
  const cbs = {}

  // nodeOps是关于dom节点的各种操作函数
  // modules是各种指令模块导出的以生命周期命名的函数
  // 比如modules.style.create = updateStyle<Function>
  const { modules, nodeOps } = backend

  // 给cbs加上所有模块对应的生命周期的回调函数
  // 例如style模块有create生命周期调用的函数updateStyle
  // 则cbs.create = [updateStyle]
  // 然后再看下一个modules有没有create生命周期该调用的函数,有就push进去
  // 则cbs.create = [updateStyle, updateActivite]
  for (i = 0; i < hooks.length; ++i) {
    cbs[hooks[i]] = []
    for (j = 0; j < modules.length; ++j) {
      if (isDef(modules[j][hooks[i]])) {
        // cbs.create.push(updateStyle<Function>)
        cbs[hooks[i]].push(modules[j][hooks[i]])
      }
    }
  }

  /**
   * 以传进来的这个实际dom节点为基础
   * 创建一个空的虚拟节点
   *
   * @date 14/01/2021
   * @param {*} elm
   * @return {*}  
   */
  function emptyNodeAt (elm) {
    return new VNode(nodeOps.tagName(elm).toLowerCase(), {}, [], undefined, elm)
  }

  /**
   * 创建remove回调
   * 调用后能删除当前创建的节点
   *
   * @date 14/01/2021
   * @param {*} childElm
   * @param {*} listeners
   * @return {*}  
   */
  function createRmCb (childElm, listeners) {
    function remove () {
      if (--remove.listeners === 0) {
        removeNode(childElm)
      }
    }
    remove.listeners = listeners
    return remove
  }

  /**
   * 删除元素
   * 如果有父dom元素
   * 从父dom元素中移除这个元素
   *
   * @date 14/01/2021
   * @param {*} el
   */
  function removeNode (el) {
    const parent = nodeOps.parentNode(el)
    // element may have already been removed due to v-html / v-text
    if (isDef(parent)) {
      nodeOps.removeChild(parent, el)
    }
  }

  /**
   * 判断vnode是不是未知的标签名
   */
  function isUnknownElement (vnode, inVPre) {
    return (
      !inVPre &&
      !vnode.ns &&
      !(
        config.ignoredElements.length &&
        config.ignoredElements.some(ignore => {
          return isRegExp(ignore)
            ? ignore.test(vnode.tag)
            : ignore === vnode.tag
        })
      ) &&
      config.isUnknownElement(vnode.tag)
    )
  }

  let creatingElmInVPre = 0

  /**
   * 创建dom element
   *
   * @date 2020-04-23
   * @param {*} vnode - 虚拟node
   * @param {*} insertedVnodeQueue - inserted 钩子函数
   * @param {*} parentElm - 父节点的DOM 如果是#app节点,通常就是body标签
   * @param {*} refElm - 如果这个存在的话，就插到这个节点之前
   * @param {*} nested - 嵌套的
   * @param {*} ownerArray
   * @param {*} index
   */
  function createElm (
    vnode,
    insertedVnodeQueue,
    parentElm,
    refElm,
    nested,
    ownerArray,
    index
  ) {
    // 如果存在子节点的话,就会克隆一遍
    if (isDef(vnode.elm) && isDef(ownerArray)) {
      //这个vnode是在之前的渲染中使用过的!
      //现在它被用作一个新节点，覆盖它的elm会导致当它被用作插入时，可能会出现patch错误引用节点。
      // 相反，我们在创建之前按需克隆节点关联的DOM元素。
      vnode = ownerArray[index] = cloneVNode(vnode)
    }

    vnode.isRootInsert = !nested // for transition enter check
    if (createComponent(vnode, insertedVnodeQueue, parentElm, refElm)) {
      return
    }
    
    const data = vnode.data
    const children = vnode.children
    const tag = vnode.tag
    if (isDef(tag)) {
      // 1.合法性校验 
      if (process.env.NODE_ENV !== 'production') {
        if (data && data.pre) {
          creatingElmInVPre++
        }
        if (isUnknownElement(vnode, creatingElmInVPre)) {
          warn(
            'Unknown custom element: <' + tag + '> - did you ' +
            'register the component correctly? For recursive components, ' +
            'make sure to provide the "name" option.',
            vnode.context
          )
        }
      }

      // 2、创建该vnode的dom元素
      // 没做什么特别的事情,有命名空间就创建命名空间,没有就创建DOM
      // 如果vnode有attrs中的multiple属性就加上
      vnode.elm = vnode.ns
        ? nodeOps.createElementNS(vnode.ns, tag)
        : nodeOps.createElement(tag, vnode)
      // 设置scope
      setScope(vnode)

      /* istanbul ignore if */
      if (__WEEX__) {
        // in Weex, the default insertion order is parent-first.
        // List items can be optimized to use children-first insertion
        // with append="tree".
        const appendAsTree = isDef(data) && isTrue(data.appendAsTree)
        if (!appendAsTree) {
          if (isDef(data)) {
            invokeCreateHooks(vnode, insertedVnodeQueue)
          }
          insert(parentElm, vnode.elm, refElm)
        }
        // 3、创建子节点
        createChildren(vnode, children, insertedVnodeQueue)
        if (appendAsTree) {
          // 4、执行所有的create钩子
          if (isDef(data)) {
            invokeCreateHooks(vnode, insertedVnodeQueue)
          }
          // 5、插入节点
          insert(parentElm, vnode.elm, refElm)
        }
      } else {
        // 如果有子节点,递归调用createElm
        createChildren(vnode, children, insertedVnodeQueue)
        if (isDef(data)) {
          // 调用所有create hook
          invokeCreateHooks(vnode, insertedVnodeQueue)
        }
        insert(parentElm, vnode.elm, refElm)
      }

      if (process.env.NODE_ENV !== 'production' && data && data.pre) {
        creatingElmInVPre--
      }
    } else if (isTrue(vnode.isComment)) {
      // 注释节点
      vnode.elm = nodeOps.createComment(vnode.text)
      insert(parentElm, vnode.elm, refElm)
    } else {
      // 其他节点
      vnode.elm = nodeOps.createTextNode(vnode.text)
      insert(parentElm, vnode.elm, refElm)
    }
  }

  /**
   * 创建组件
   *
   * @date 15/01/2021
   * @param {*} vnode
   * @param {*} insertedVnodeQueue
   * @param {*} parentElm
   * @param {*} refElm
   * @return {*}  
   */
  function createComponent (vnode, insertedVnodeQueue, parentElm, refElm) {
    let i = vnode.data
    if (isDef(i)) {
      const isReactivated = isDef(vnode.componentInstance) && i.keepAlive
      if (isDef(i = i.hook) && isDef(i = i.init)) {
        i(vnode, false /* hydrating */)
      }
      // after calling the init hook, if the vnode is a child component
      // it should've created a child instance and mounted it. the child
      // component also has set the placeholder vnode's elm.
      // in that case we can just return the element and be done.
      if (isDef(vnode.componentInstance)) {
        initComponent(vnode, insertedVnodeQueue)
        insert(parentElm, vnode.elm, refElm)
        if (isTrue(isReactivated)) {
          reactivateComponent(vnode, insertedVnodeQueue, parentElm, refElm)
        }
        return true
      }
    }
  }

  /**
   * 初始化组件
   *
   * @date 15/01/2021
   * @param {*} vnode
   * @param {*} insertedVnodeQueue
   */
  function initComponent (vnode, insertedVnodeQueue) {
    if (isDef(vnode.data.pendingInsert)) {
      insertedVnodeQueue.push.apply(insertedVnodeQueue, vnode.data.pendingInsert)
      vnode.data.pendingInsert = null
    }
    vnode.elm = vnode.componentInstance.$el
    if (isPatchable(vnode)) {
      invokeCreateHooks(vnode, insertedVnodeQueue)
      setScope(vnode)
    } else {
      // empty component root.
      // skip all element-related modules except for ref (#3455)
      registerRef(vnode)
      // make sure to invoke the insert hook
      insertedVnodeQueue.push(vnode)
    }
  }

  function reactivateComponent (vnode, insertedVnodeQueue, parentElm, refElm) {
    let i
    // hack for #4339: a reactivated component with inner transition
    // does not trigger because the inner node's created hooks are not called
    // again. It's not ideal to involve module-specific logic in here but
    // there doesn't seem to be a better way to do it.
    let innerNode = vnode
    while (innerNode.componentInstance) {
      innerNode = innerNode.componentInstance._vnode
      if (isDef(i = innerNode.data) && isDef(i = i.transition)) {
        for (i = 0; i < cbs.activate.length; ++i) {
          cbs.activate[i](emptyNode, innerNode)
        }
        insertedVnodeQueue.push(innerNode)
        break
      }
    }
    // unlike a newly created component,
    // a reactivated keep-alive component doesn't insert itself
    insert(parentElm, vnode.elm, refElm)
  }

  function insert (parent, elm, ref) {
    if (isDef(parent)) {
      if (isDef(ref)) {
        if (nodeOps.parentNode(ref) === parent) {
          // 有父节点就插入到ref节点之前
          nodeOps.insertBefore(parent, elm, ref)
        }
      } else {
        // 添加子节点
        nodeOps.appendChild(parent, elm)
      }
    }
  }

  /**
   * 创建子节点
   * @date 2020-04-23
   * @param {*} vnode
   * @param {*} children
   * @param {*} insertedVnodeQueue
   */
  function createChildren (vnode, children, insertedVnodeQueue) {
    // 如果有子节点，则调用creatElm递归创建
    if (Array.isArray(children)) {
      if (process.env.NODE_ENV !== 'production') {
        // 检查key是否重复
        checkDuplicateKeys(children)
      }
      for (let i = 0; i < children.length; ++i) {
        createElm(children[i], insertedVnodeQueue, vnode.elm, null, true, children, i)
      }
    } else if (isPrimitive(vnode.text)) {
      // 对于叶节点，直接添加text
      nodeOps.appendChild(vnode.elm, nodeOps.createTextNode(String(vnode.text)))
    }
  }

  function isPatchable (vnode) {
    while (vnode.componentInstance) {
      vnode = vnode.componentInstance._vnode
    }
    return isDef(vnode.tag)
  }

  /**
   * 调用所有create hook
   *
   * @date 15/01/2021
   * @param {*} vnode
   * @param {*} insertedVnodeQueue
   */
  function invokeCreateHooks (vnode, insertedVnodeQueue) {
    for (let i = 0; i < cbs.create.length; ++i) {
      cbs.create[i](emptyNode, vnode)
    }
    i = vnode.data.hook // Reuse variable
    if (isDef(i)) {
      if (isDef(i.create)) i.create(emptyNode, vnode)
      if (isDef(i.insert)) insertedVnodeQueue.push(vnode)
    }
  }

  // 为限定CSS设置范围id属性。
  // 如果有使用scoped css,给vnode设置范围id
  // 这是作为一种特殊情况实现的，以避免经历普通属性patching过程的开销。
  function setScope (vnode) {
    let i
    if (isDef(i = vnode.fnScopeId)) {
      // 添加scopeId属性
      nodeOps.setStyleScope(vnode.elm, i)
    } else {
      // 向上查找直到最上层祖先元素
      // 同时如果每个祖先元素有_scopeId的话就加上scopeId属性
      let ancestor = vnode
      while (ancestor) {
        if (isDef(i = ancestor.context) && isDef(i = i.$options._scopeId)) {
          nodeOps.setStyleScope(vnode.elm, i)
        }
        ancestor = ancestor.parent
      }
    }
    // 对于插槽内容，它们还应该从主机实例获得scopeId
    if (isDef(i = activeInstance) &&
      i !== vnode.context &&
      i !== vnode.fnContext &&
      isDef(i = i.$options._scopeId)
    ) {
      nodeOps.setStyleScope(vnode.elm, i)
    }
  }

  /**
   * 根据vnode创建dom元素
   *
   * @date 15/01/2021
   * @param {*} parentElm 父节点
   * @param {*} refElm 插入到该节点之前
   * @param {*} vnodes 要被创建的节点组
   * @param {*} startIdx 计数器
   * @param {*} endIdx 计数器
   * @param {*} insertedVnodeQueue 插入队列
   */
  function addVnodes (parentElm, refElm, vnodes, startIdx, endIdx, insertedVnodeQueue) {
    for (; startIdx <= endIdx; ++startIdx) {
      createElm(vnodes[startIdx], insertedVnodeQueue, parentElm, refElm, false, vnodes, startIdx)
    }
  }

  /**
   * 删除node,触发vnode上的destory hook 
   */
  function invokeDestroyHook (vnode) {
    let i, j
    const data = vnode.data
    if (isDef(data)) {
      // 有定义hook或者destroy钩子就直接调用
      if (isDef(i = data.hook) && isDef(i = i.destroy)) i(vnode)
      for (i = 0; i < cbs.destroy.length; ++i) cbs.destroy[i](vnode)
    }
    if (isDef(i = vnode.children)) {
      // 递归
      for (j = 0; j < vnode.children.length; ++j) {
        invokeDestroyHook(vnode.children[j])
      }
    }
  }

  /**
   * 移除vnode
   *
   * @date 15/01/2021
   * @param {*} parentElm
   * @param {*} vnodes
   * @param {*} startIdx
   * @param {*} endIdx
   */
  function removeVnodes (parentElm, vnodes, startIdx, endIdx) {
    for (; startIdx <= endIdx; ++startIdx) {
      const ch = vnodes[startIdx]
      if (isDef(ch)) {
        if (isDef(ch.tag)) {
          removeAndInvokeRemoveHook(ch)
          invokeDestroyHook(ch)
        } else { // Text node
          removeNode(ch.elm)
        }
      }
    }
  }

  /**
   * 移除vnode并触发vnode上的remove hook
   *
   * @date 15/01/2021
   * @param {*} vnode
   * @param {*} rm
   */
  function removeAndInvokeRemoveHook (vnode, rm) {
    if (isDef(rm) || isDef(vnode.data)) {
      let i
      const listeners = cbs.remove.length + 1
      if (isDef(rm)) {
        // we have a recursively passed down rm callback
        // increase the listeners count
        rm.listeners += listeners
      } else {
        // directly removing
        rm = createRmCb(vnode.elm, listeners)
      }
      // recursively invoke hooks on child component root node
      if (isDef(i = vnode.componentInstance) && isDef(i = i._vnode) && isDef(i.data)) {
        removeAndInvokeRemoveHook(i, rm)
      }
      for (i = 0; i < cbs.remove.length; ++i) {
        cbs.remove[i](vnode, rm)
      }
      if (isDef(i = vnode.data.hook) && isDef(i = i.remove)) {
        i(vnode, rm)
      } else {
        rm()
      }
    } else {
      removeNode(vnode.elm)
    }
  }

  /**
   * diff的核心函数
   * 按照规律一个个对比vnode
   *
   * @date 2020-05-07
   * @param {*} parentElm 父DOM节点
   * @param {*} oldCh 同层比较中的节点组
   * @param {*} newCh 同层比较中的节点组
   * @param {*} insertedVnodeQueue 插入队列
   * @param {*} removeOnly
   */
  function updateChildren (parentElm, oldCh, newCh, insertedVnodeQueue, removeOnly) {
    let oldStartIdx = 0
    let oldEndIdx = oldCh.length - 1
    let oldStartVnode = oldCh[0]
    let oldEndVnode = oldCh[oldEndIdx]
    let newStartIdx = 0
    let newEndIdx = newCh.length - 1
    let newStartVnode = newCh[0]
    let newEndVnode = newCh[newEndIdx]
    let oldKeyToIdx, idxInOld, vnodeToMove, refElm

    // removeOnly is a special flag used only by <transition-group>
    // to ensure removed elements stay in correct relative positions
    // during leaving transitions
    const canMove = !removeOnly

    if (process.env.NODE_ENV !== 'production') {
      checkDuplicateKeys(newCh)
    }

    // DIFF规则
    // 1.看os oe有没有,没有直接把索引移动向中间一位
    // 2.依次进行对比,看vnode是否相同
    //  顺序为对比osv nsv 对比oev nev 对比osv nev 对比oev nsv
    // osv === nsv, oev === nev 时只做下标更改,  下标向中间移动一位
    // osv === nev os移动到oe后面,  双方下标向中间移动一位
    // oev === nsv oe移动到os前面,  双方下标向中间移动一位
    // 3.四个地方都不相同的情况下,判断在oldCh中是否有相同key的vnode
    // (1) 在oldCh中有相同key的vnode
    //     进一步判断是否为相同vnode
    //        ①vnode一样,插入到oldStartVnode前,并将oldvnode置为undefined
    //        ②vnode不一样,以ns为基础创建一个ele元素并插入到oldStartVnode前
    // (2) 在oldCh中没有相同key的vnode
    //     创建一个ele元素并插入到oldStartVnode前

    // 同时,该规则是递归的.在每一个找到相等的oldVnode的时候,继续对相等的双方(新旧vnode)调用patchVnode
    while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
      if (isUndef(oldStartVnode)) {// os没有定义，os索引向后移动一位
        oldStartVnode = oldCh[++oldStartIdx] // Vnode has been moved left
      } else if (isUndef(oldEndVnode)) {//oe没有定义，oe索引向前移动一位
        oldEndVnode = oldCh[--oldEndIdx]
      } else if (sameVnode(oldStartVnode, newStartVnode)) {
        //os==ns，保持节点位置不变，继续比较其子节点，os,ns索引向后移动一位
        patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue, newCh, newStartIdx)
        oldStartVnode = oldCh[++oldStartIdx]
        newStartVnode = newCh[++newStartIdx]
      } else if (sameVnode(oldEndVnode, newEndVnode)) {
        //oe==ne，保持节点位置不变，继续比较其子节点，oe，ne索引向前移动一位。
        patchVnode(oldEndVnode, newEndVnode, insertedVnodeQueue, newCh, newEndIdx)
        oldEndVnode = oldCh[--oldEndIdx]
        newEndVnode = newCh[--newEndIdx]
      } else if (sameVnode(oldStartVnode, newEndVnode)) {
        // os==ne，将os节点移动到oe后面，继续比较其子节点，os索引向后移动一位，ne索引向前移动一位
        patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue, newCh, newEndIdx)
        canMove && nodeOps.insertBefore(parentElm, oldStartVnode.elm, nodeOps.nextSibling(oldEndVnode.elm))
        oldStartVnode = oldCh[++oldStartIdx]
        newEndVnode = newCh[--newEndIdx]
      } else if (sameVnode(oldEndVnode, newStartVnode)) {
        // oe==ns，将oe移动到os节点前，继续比较其子节点，oe索引向后移动一位，ns向前移动一位
        patchVnode(oldEndVnode, newStartVnode, insertedVnodeQueue, newCh, newStartIdx)
        canMove && nodeOps.insertBefore(parentElm, oldEndVnode.elm, oldStartVnode.elm)
        oldEndVnode = oldCh[--oldEndIdx]
        newStartVnode = newCh[++newStartIdx]
      } else {
        //两组都不相同的情况下
        // 做个映射表,方便在旧vnode中找到那个vnode
        if (isUndef(oldKeyToIdx)) oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx)
        //在oldstartIdx与oldEndIdx间，查找与newStartVnode相同(key相同，或者节点元素相同)节点索引位置
        idxInOld = isDef(newStartVnode.key)
          ? oldKeyToIdx[newStartVnode.key]
          : findIdxInOld(newStartVnode, oldCh, oldStartIdx, oldEndIdx)
        if (isUndef(idxInOld)) { 
          // 没有相同节点，证明是个新的vnode
          // 创建newStartVnode的真实dom节点并插入到oldStartVnode(不是最前面,是当前索引前面)前
          createElm(newStartVnode, insertedVnodeQueue, parentElm, oldStartVnode.elm, false, newCh, newStartIdx)
        } else {
          vnodeToMove = oldCh[idxInOld]
          // 对比两个元素的key和节点
          if (sameVnode(vnodeToMove, newStartVnode)) {
            //key值和节点都都相同
            patchVnode(vnodeToMove, newStartVnode, insertedVnodeQueue, newCh, newStartIdx)
            oldCh[idxInOld] = undefined
            //移动到oldStartVnode(不是最前面,是当前索引前面)前
            canMove && nodeOps.insertBefore(parentElm, vnodeToMove.elm, oldStartVnode.elm)
          } else {
            // 相同的key，但节点元素不同，和没有相同节点一样.
            // 以ns为基础创建一个ele元素并插入到oldStartVnode前
            createElm(newStartVnode, insertedVnodeQueue, parentElm, oldStartVnode.elm, false, newCh, newStartIdx)
          }
        }
        //newStartVnode索引向前移
        newStartVnode = newCh[++newStartIdx]
      }
    }

    // 全部遍历完了之后
    if (oldStartIdx > oldEndIdx) {
      //如果旧节点先遍历完，把剩余的vnode全部插入到oe后面位置

      // 尝试取nev后面的一个元素,取不到就算了
      refElm = isUndef(newCh[newEndIdx + 1]) ? null : newCh[newEndIdx + 1].elm
      addVnodes(parentElm, refElm, newCh, newStartIdx, newEndIdx, insertedVnodeQueue)
    } else if (newStartIdx > newEndIdx) {
      //新节点先遍历完，删除剩余的老节点
      removeVnodes(parentElm, oldCh, oldStartIdx, oldEndIdx)
    }
  }

  /**
   * 检查是否有重复的key
   *
   * @date 15/01/2021
   * @param {*} children
   */
  function checkDuplicateKeys (children) {
    const seenKeys = {}
    for (let i = 0; i < children.length; i++) {
      const vnode = children[i]
      const key = vnode.key
      if (isDef(key)) {
        if (seenKeys[key]) {
          warn(
            `Duplicate keys detected: '${key}'. This may cause an update error.`,
            vnode.context
          )
        } else {
          seenKeys[key] = true
        }
      }
    }
  }

  /**
   * 在oldCh中找到node并返回在oldCh中的位置(index)
   * @date 2020-05-08
   * @param {*} node
   * @param {*} oldCh
   * @param {*} start
   * @param {*} end
   * @returns 
   */
  function findIdxInOld (node, oldCh, start, end) {
    for (let i = start; i < end; i++) {
      const c = oldCh[i]
      if (isDef(c) && sameVnode(node, c)) return i
    }
  }

  /**
   * 对vnode进行新老对比并更新dom节点
   * 1.判断是否是static
   * 为了提高patch效率，对于静态节点，直接进行元素复用。
   * 2.更新当前节点，执行相关的update方法
   * 3.比较子节点
   * (1)对于非text叶节点，继续子节点比较。
   * 新旧子节点存在，则调用updateChildren继续比较；
   * 新子节点存在，旧子节点不存在，则说明该子节点是新增，调用addVnodes创建；
   * 新子节点不存在，旧子节点存在，说明该子节点是多余的，调用removeVnodes删除该节点。
   * (2)对于text叶节点，如果text内容不同，则直接更新。
   * @date 2020-05-07
   * @param {*} oldVnode
   * @param {*} vnode
   * @param {*} insertedVnodeQueue
   * @param {*} ownerArray
   * @param {*} index
   * @param {*} removeOnly
   */
  function patchVnode (
    oldVnode,
    vnode,
    insertedVnodeQueue,
    ownerArray,
    index,
    removeOnly
  ) {
    // 新老节点相同就直接renturn
    if (oldVnode === vnode) {
      return
    }

    // 如果新的vnode已经有了element实例 表示是在之前的渲染中使用的
    // 并且已经存在等待插入的节点
    if (isDef(vnode.elm) && isDef(ownerArray)) {
      // clone reused vnode
      vnode = ownerArray[index] = cloneVNode(vnode)
    }

    // 先暂时把新老vnode对应的element统一
    // 新vnode一般是没有elm的
    const elm = vnode.elm = oldVnode.elm

    if (isTrue(oldVnode.isAsyncPlaceholder)) {
      if (isDef(vnode.asyncFactory.resolved)) {
        hydrate(oldVnode.elm, vnode, insertedVnodeQueue)
      } else {
        vnode.isAsyncPlaceholder = true
      }
      return
    }

    // reuse element for static trees.
    // note we only do this if the vnode is cloned -
    // if the new node is not cloned it means the render functions have been
    // reset by the hot-reload-api and we need to do a proper re-render.
    //1、对于static节点树，无需比较，直接节点复用
    if (isTrue(vnode.isStatic) &&
      isTrue(oldVnode.isStatic) &&
      vnode.key === oldVnode.key &&
      (isTrue(vnode.isCloned) || isTrue(vnode.isOnce))
    ) {
      vnode.componentInstance = oldVnode.componentInstance
      return
    }

    let i
    const data = vnode.data
    if (isDef(data) && isDef(i = data.hook) && isDef(i = i.prepatch)) {
      i(oldVnode, vnode)
    }

    // 获取oldVnode，Vnode的子节点，进行比较
    const oldCh = oldVnode.children
    const ch = vnode.children
    //2、更新当前节点，执行update相关方法
    if (isDef(data) && isPatchable(vnode)) {
      // 如果vnode上有
      // 调用所有指令模块的update方法去更新标签上附带的state
      for (i = 0; i < cbs.update.length; ++i) cbs.update[i](oldVnode, vnode)
      if (isDef(i = data.hook) && isDef(i = i.update)) i(oldVnode, vnode)
    }
    //3、比较子节点
    if (isUndef(vnode.text)) {//3.1 非text节点
      if (isDef(oldCh) && isDef(ch)) {//新的有子节点,旧的没有
        // 新旧节点不同,递归调用updateChildren继续比较
        if (oldCh !== ch) updateChildren(elm, oldCh, ch, insertedVnodeQueue, removeOnly)
      } else if (isDef(ch)) {
        // 新子节点存在，旧子节点不存在，添加新节点
        // 如果有文本内容,先清空文本内容
        // 然后再加入新节点
        if (process.env.NODE_ENV !== 'production') {
          checkDuplicateKeys(ch)
        }
        if (isDef(oldVnode.text)) nodeOps.setTextContent(elm, '')
        addVnodes(elm, null, ch, 0, ch.length - 1, insertedVnodeQueue)
      } else if (isDef(oldCh)) {
        // 旧的有子节点,新的没有子节点,直接删除子节点
        removeVnodes(elm, oldCh, 0, oldCh.length - 1)
      } else if (isDef(oldVnode.text)) {//旧节点为text节点，则设置为空
        nodeOps.setTextContent(elm, '')
      }
    } else if (oldVnode.text !== vnode.text) {//3.2 text叶节点，但是text不同，直接更新
      nodeOps.setTextContent(elm, vnode.text)
    }
    if (isDef(data)) {
      if (isDef(i = data.hook) && isDef(i = i.postpatch)) i(oldVnode, vnode)
    }
  }

  function invokeInsertHook (vnode, queue, initial) {
    // delay insert hooks for component root nodes, invoke them after the
    // element is really inserted
    if (isTrue(initial) && isDef(vnode.parent)) {
      vnode.parent.data.pendingInsert = queue
    } else {
      for (let i = 0; i < queue.length; ++i) {
        queue[i].data.hook.insert(queue[i])
      }
    }
  }

  let hydrationBailed = false
  // list of modules that can skip create hook during hydration because they
  // are already rendered on the client or has no need for initialization
  // Note: style is excluded because it relies on initial clone for future
  // deep updates (#7063).
  const isRenderedModule = makeMap('attrs,class,staticClass,staticStyle,key')

  // Note: this is a browser-only function so we can assume elms are DOM nodes.
  function hydrate (elm, vnode, insertedVnodeQueue, inVPre) {
    let i
    const { tag, data, children } = vnode
    inVPre = inVPre || (data && data.pre)
    vnode.elm = elm

    if (isTrue(vnode.isComment) && isDef(vnode.asyncFactory)) {
      vnode.isAsyncPlaceholder = true
      return true
    }
    // assert node match
    if (process.env.NODE_ENV !== 'production') {
      if (!assertNodeMatch(elm, vnode, inVPre)) {
        return false
      }
    }
    if (isDef(data)) {
      if (isDef(i = data.hook) && isDef(i = i.init)) i(vnode, true /* hydrating */)
      if (isDef(i = vnode.componentInstance)) {
        // child component. it should have hydrated its own tree.
        initComponent(vnode, insertedVnodeQueue)
        return true
      }
    }
    if (isDef(tag)) {
      if (isDef(children)) {
        // empty element, allow client to pick up and populate children
        if (!elm.hasChildNodes()) {
          createChildren(vnode, children, insertedVnodeQueue)
        } else {
          // v-html and domProps: innerHTML
          if (isDef(i = data) && isDef(i = i.domProps) && isDef(i = i.innerHTML)) {
            if (i !== elm.innerHTML) {
              /* istanbul ignore if */
              if (process.env.NODE_ENV !== 'production' &&
                typeof console !== 'undefined' &&
                !hydrationBailed
              ) {
                hydrationBailed = true
                console.warn('Parent: ', elm)
                console.warn('server innerHTML: ', i)
                console.warn('client innerHTML: ', elm.innerHTML)
              }
              return false
            }
          } else {
            // iterate and compare children lists
            let childrenMatch = true
            let childNode = elm.firstChild
            for (let i = 0; i < children.length; i++) {
              if (!childNode || !hydrate(childNode, children[i], insertedVnodeQueue, inVPre)) {
                childrenMatch = false
                break
              }
              childNode = childNode.nextSibling
            }
            // if childNode is not null, it means the actual childNodes list is
            // longer than the virtual children list.
            if (!childrenMatch || childNode) {
              /* istanbul ignore if */
              if (process.env.NODE_ENV !== 'production' &&
                typeof console !== 'undefined' &&
                !hydrationBailed
              ) {
                hydrationBailed = true
                console.warn('Parent: ', elm)
                console.warn('Mismatching childNodes vs. VNodes: ', elm.childNodes, children)
              }
              return false
            }
          }
        }
      }
      if (isDef(data)) {
        let fullInvoke = false
        for (const key in data) {
          if (!isRenderedModule(key)) {
            fullInvoke = true
            invokeCreateHooks(vnode, insertedVnodeQueue)
            break
          }
        }
        if (!fullInvoke && data['class']) {
          // ensure collecting deps for deep class bindings for future updates
          traverse(data['class'])
        }
      }
    } else if (elm.data !== vnode.text) {
      elm.data = vnode.text
    }
    return true
  }

  function assertNodeMatch (node, vnode, inVPre) {
    if (isDef(vnode.tag)) {
      return vnode.tag.indexOf('vue-component') === 0 || (
        !isUnknownElement(vnode, inVPre) &&
        vnode.tag.toLowerCase() === (node.tagName && node.tagName.toLowerCase())
      )
    } else {
      return node.nodeType === (vnode.isComment ? 8 : 3)
    }
  }

  /**
   * vm.__patch__的实际调用函数
   * 用来渲染和更新实际DOM
   * 返回最终更新后的DOM
   * e.g.
   * vm.__patch__(vm.$el, vnode, hydrating, false )
   * vm.__patch__(prevVnode, vnode)
   * @date 2020-04-23
   * @param {*} oldVnode - 老的虚拟dom
   * @param {*} vnode - 新的虚拟dom
   * @param {*} hydrating - 是否开启激活模式
   * @param {*} removeOnly
   * @returns 
   */
  return function patch (oldVnode, vnode, hydrating, removeOnly) {
    // 如果没有定义新vnode,但有oldVnode
    // 证明节点被销毁了
    // 对老节点调用destroy hook钩子
    // 虚拟dom的remove在后面进行
    if (isUndef(vnode)) {
      if (isDef(oldVnode)) invokeDestroyHook(oldVnode)
      return
    }

    let isInitialPatch = false
    // 这是等待插入的虚拟节点队列
    const insertedVnodeQueue = []

    if (isUndef(oldVnode)) {
      // 1.oldVnode为空(首次渲染,或者是组件节点),直接创建新的dom节点
      // empty mount (likely as component), create new root element
      // 没有oldVnode，证明初次渲染
      isInitialPatch = true
      // 创建新的dom节点
      createElm(vnode, insertedVnodeQueue)
    } else {
      // 2.新老Vnode都存在
      // 判断oldVnode这个参数是不是一个dom元素实例
      // nodeType 元素类型
      const isRealElement = isDef(oldVnode.nodeType)
      if (!isRealElement && sameVnode(oldVnode, vnode)) {
        // 不是一个dom实例(那就是一个vnode了)
        // 并且新老虚拟节点形似
        // 去patchVnode
        patchVnode(oldVnode, vnode, insertedVnodeQueue, null, null, removeOnly)
      } else {
        // oldVnode是一个dom实例
        // 或者新老虚拟节点不一样
        if (isRealElement) {
          // oldVnode是一个dom实例
          // mounting to a real element
          // check if this is server-rendered content and if we can perform
          // a successful hydration.
          // 检查一下,如果是服务器渲染并且我们能执行一个成功的hydration
          if (oldVnode.nodeType === 1 && oldVnode.hasAttribute(SSR_ATTR)) {
            oldVnode.removeAttribute(SSR_ATTR)
            hydrating = true
          }
          // 服务端渲染有关
          if (isTrue(hydrating)) {
            if (hydrate(oldVnode, vnode, insertedVnodeQueue)) {
              invokeInsertHook(vnode, insertedVnodeQueue, true)
              return oldVnode
            } else if (process.env.NODE_ENV !== 'production') {
              warn(
                'The client-side rendered virtual DOM tree is not matching ' +
                'server-rendered content. This is likely caused by incorrect ' +
                'HTML markup, for example nesting block-level elements inside ' +
                '<p>, or missing <tbody>. Bailing hydration and performing ' +
                'full client-side render.'
              )
            }
          }
          // either not server-rendered, or hydration failed.
          // create an empty node and replace it
          // 如果不是服务端渲染或者hydration出错
          // 把这个oldVnode从Element实例转空的Vnode实例
          oldVnode = emptyNodeAt(oldVnode)
        }

        /**
         * oldVnode对应的dom节点
         */
        const oldElm = oldVnode.elm
        /**
         * oldVnode对应的dom节点的父节点
         */
        const parentElm = nodeOps.parentNode(oldElm)

        // create new node
        // 3.用新的vnode创建dom节点
        createElm(
          vnode,
          insertedVnodeQueue,
          // extremely rare edge case: do not insert if old element is in a
          // leaving transition. Only happens when combining transition +
          // keep-alive + HOCs. (#4590)
          oldElm._leaveCb ? null : parentElm,
          nodeOps.nextSibling(oldElm) // 下一个兄弟节点
        )

        // update parent placeholder node element, recursively
        if (isDef(vnode.parent)) {
          // 如果vnode还有父节点存在
          /**
           * vnode的父节点(祖先节点)
           * 因为parent忽略文本节点等垃圾节点
           */
          let ancestor = vnode.parent
          const patchable = isPatchable(vnode)
          while (ancestor) {
            for (let i = 0; i < cbs.destroy.length; ++i) {
              cbs.destroy[i](ancestor)
            }
            ancestor.elm = vnode.elm
            if (patchable) {
              for (let i = 0; i < cbs.create.length; ++i) {
                cbs.create[i](emptyNode, ancestor)
              }
              // #6513
              // invoke insert hooks that may have been merged by create hooks.
              // e.g. for directives that uses the "inserted" hook.
              const insert = ancestor.data.hook.insert
              if (insert.merged) {
                // start at index 1 to avoid re-invoking component mounted hook
                for (let i = 1; i < insert.fns.length; i++) {
                  insert.fns[i]()
                }
              }
            } else {
              registerRef(ancestor)
            }
            ancestor = ancestor.parent
          }
        }

        // destroy old node
        if (isDef(parentElm)) {
          removeVnodes(parentElm, [oldVnode], 0, 0)
        } else if (isDef(oldVnode.tag)) {
          invokeDestroyHook(oldVnode)
        }
      }
    }

    invokeInsertHook(vnode, insertedVnodeQueue, isInitialPatch)
    return vnode.elm
  }
}
