/* @flow */

import { parse } from './parser/index'
import { optimize } from './optimizer'
import { generate } from './codegen/index'
import { createCompilerCreator } from './create-compiler'

// `createCompilerCreator` allows creating compilers that use alternative
// parser/optimizer/codegen, e.g the SSR optimizing compiler.
// Here we just export a default compiler using the default parts.
// “createCompilerCreator”允许创建使用替代解析器/优化器/codegen的编译器
// e.g. SSR优化编译器。
// 这里我们只是使用默认部分导出一个默认编译器。
export const createCompiler = createCompilerCreator(function baseCompile (
  template: string,
  options: CompilerOptions
): CompiledResult {
  // 1、parse，将templat转成AST模型
  const ast = parse(template.trim(), options)
  // 2、optimize，标注静态节点
  // 静态节点就是那些永远不会变化的节点
  // 重新渲染时，作为常量，无需创建新节点
  if (options.optimize !== false) {
    optimize(ast, options)
  }
  // 3、generate，用AST生成render表达式
  const code = generate(ast, options)
  return {
    ast,
    render: code.render,
    staticRenderFns: code.staticRenderFns
  }
})
