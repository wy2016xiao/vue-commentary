/* @flow */

import config from 'core/config'
import { warn, cached } from 'core/util/index'
import { mark, measure } from 'core/util/perf'

import Vue from './runtime/index'
import { query } from './util/index'
import { compileToFunctions } from './compiler/index'
import { shouldDecodeNewlines, shouldDecodeNewlinesForHref } from './util/compat'

/**
 * 传入id查找dom，返回并缓存id内部dom
 */
const idToTemplate = cached(id => {
  const el = query(id)
  return el && el.innerHTML
})

// 将在src/platforms/web/runtime/index.js中定义的$mount方法缓存起来
const mount = Vue.prototype.$mount
/**
 * 定义$mount
 * 根据el或者template，获取到html的字符串
 * 将字符串转成render函数表达式
 * @returns {Component} 返回vue实例
 */
Vue.prototype.$mount = function (
  el?: string | Element,
  hydrating?: boolean // 服务端渲染相关
): Component {
  // 根据id获取dom元素
  el = el && query(el)

  /* istanbul ignore if */
  if (el === document.body || el === document.documentElement) {
    // 如果是body或者根节点（html节点）就报错
    process.env.NODE_ENV !== 'production' && warn(
      `Do not mount Vue to <html> or <body> - mount to normal elements instead.`
    )
    // 返回vue实例
    return this
  }

  // $options vue实例的初始化选项
  const options = this.$options
  // 根据template/el，获取html的字符串
  if (!options.render) {
    // 获取template
    let template = options.template
    if (template) {
      // 如果定义了template
      if (typeof template === 'string') {
        // 如果给的是字符串
        // e.g. `
        //     <div class="demo-alert-box">
        //     <strong>Error!</strong>
        //     <slot></slot>
        //   </div>
        // `
        // `#app`
        if (template.charAt(0) === '#') {
          // 如果值以 # 开始，则它将被用作选择符，并使用匹配元素的 innerHTML 作为模板
          template = idToTemplate(template)
          /* istanbul ignore if */
          if (process.env.NODE_ENV !== 'production' && !template) {
            warn(
              `Template element not found or is empty: ${options.template}`,
              this
            )
          }
        }
      } else if (template.nodeType) {
        // nodeType：节点类型
        // 证明template传了个html元素
        template = template.innerHTML
      } else {
        // 报错
        if (process.env.NODE_ENV !== 'production') {
          warn('invalid template option:' + template, this)
        }
        return this
      }
    } else if (el) {
      // 如果用户没有定义template，直接获取el
      template = getOuterHTML(el)
    }

    // 取到template 构建render函数
    if (template) {
      /* istanbul ignore if */
      // 性能相关
      if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
        mark('compile')
      }

      const { render, staticRenderFns } = compileToFunctions(template, {
        outputSourceRange: process.env.NODE_ENV !== 'production',
        shouldDecodeNewlines,
        shouldDecodeNewlinesForHref,
        delimiters: options.delimiters, // 解析字符串模板的占位符 默认值是["{{","}}"]
        comments: options.comments // 是否保留注释
      }, this)
      options.render = render
      options.staticRenderFns = staticRenderFns

      /* istanbul ignore if */
      // 性能相关
      if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
        mark('compile end')
        measure(`vue ${this._name} compile`, 'compile', 'compile end')
      }
    }
  }

  // 核心代码
  // 上面的代码核心工作是提供渲染函数
  // 或是用户定义的render选项
  // 或是template或是el
  // 然后去调用刚刚缓存的旧的$mount方法
  return mount.call(this, el, hydrating)
}

/**
 * 获取el元素的父级元素
 * 或把el元素放到一个创建的div元素内，返回div元素
 */
function getOuterHTML (el: Element): string {
  if (el.outerHTML) {
    return el.outerHTML
  } else {
    const container = document.createElement('div')
    container.appendChild(el.cloneNode(true))
    return container.innerHTML
  }
}

Vue.compile = compileToFunctions

export default Vue
