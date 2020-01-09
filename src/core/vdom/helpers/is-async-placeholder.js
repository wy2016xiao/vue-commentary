/* @flow */
/**
 * 检查是否是异步占位符
 * 检查vnode中是否含有isComment和asyncFactory属性
 * @date 2020-01-09
 * @export
 * @param {VNode} node
 * @returns {boolean}
 */
export function isAsyncPlaceholder (node: VNode): boolean {
  return node.isComment && node.asyncFactory
}
