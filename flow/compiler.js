// 编译器的选项,编译器工厂函数可以据此生成编译器
declare type CompilerOptions = {
  warn?: Function; // 允许在不同环境自定义警告内容
  modules?: Array<ModuleOptions>; // 平台特有的模块 比如class styles
  directives?: { [key: string]: Function }; // 平台特有的指令
  staticKeys?: string; // 一份静态的AST属性列表,为了优化而使用
  isUnaryTag?: (tag: string) => ?boolean; // 一元标签,即单标签
  canBeLeftOpenTag?: (tag: string) => ?boolean; // 是否不用闭合标签 比如tr、td等
  isReservedTag?: (tag: string) => ?boolean; // 是否是保留标签
  preserveWhitespace?: boolean; // 保留元素间的空格(已弃用)
  whitespace?: 'preserve' | 'condense'; // 空格处理策略
  optimize?: boolean; // 是否优化静态内容

  // web specific
  // web特有的
  mustUseProp?: (tag: string, type: ?string, name: string) => boolean; // 检查标签上的attribute是否应该绑定到props上
  isPreTag?: (attr: string) => ?boolean; // 判断tag标签是否叫'pre' (实现方式很粗暴,pre标签内的文本保留空格和换行)
  getTagNamespace?: (tag: string) => ?string; // 获取标签的命名空间
  expectHTML?: boolean; // 是否是html(一般都是true)
  isFromDOM?: boolean; // 好像没用上,看意思应该是是否来自DOM?
  shouldDecodeTags?: boolean; // 是否需要解码标签 没用上
  shouldDecodeNewlines?:  boolean; // 是否需要对换行符和制表符做兼容处理  &#10和&#9
  shouldDecodeNewlinesForHref?: boolean; // 是否需要对a标签的 href 属性值中的换行符或制表符做兼容处理
  outputSourceRange?: boolean; // 非生产环境需要  输出源

  // 用户定义的选项内容
  delimiters?: [string, string]; // 用户定义的delimiters选项
  comments?: boolean; // 保留tempalte里面的注释

  // for ssr optimization compiler
  // ssr优化专用
  scopeId?: string;
};

// warning消息格式
declare type WarningMessage = {
  msg: string;
  start?: number;
  end?: number;
};

// 解析后的返回
declare type CompiledResult = {
  ast: ?ASTElement; // ast 抽象语法树
  render: string; // 渲染器表达式
  staticRenderFns: Array<string>; // 静态渲染函数
  stringRenderFns?: Array<string>; // 字符串渲染函数
  errors?: Array<string | WarningMessage>; // 错误返回信息
  tips?: Array<string | WarningMessage>; // 提示
};

// 模块的选项
declare type ModuleOptions = {
  // 在处理任何attributes之前转换ast节点
  // 从pretransforms返回一个ASTElement将替换该元素
  preTransformNode: (el: ASTElement) => ?ASTElement;
  // 在处理内置指令(v-if v-for)后转换AST
  transformNode: (el: ASTElement) => ?ASTElement;
  // 在子节点被处理前转换ast
  // 不能返回东西因为ast树已经完成
  postTransformNode: (el: ASTElement) => void;
  // 为元素生成额外的data字符串
  genData: (el: ASTElement) => string;
  // 进一步转换为元素生成的代码
  transformCode?: (el: ASTElement, code: string) => string;
  // 静态ast属性列表
  staticKeys?: Array<string>; // AST properties to be considered static
};
// ast修改器
declare type ASTModifiers = { [key: string]: boolean };
// ast中的v-if的判断条件
declare type ASTIfCondition = { exp: ?string; block: ASTElement };
declare type ASTIfConditions = Array<ASTIfCondition>;

// ast属性
declare type ASTAttr = {
  name: string;
  value: any;
  dynamic?: boolean;
  start?: number;
  end?: number
};
// ast元素的方法
declare type ASTElementHandler = {
  value: string;
  params?: Array<any>;
  modifiers: ?ASTModifiers;
  dynamic?: boolean;
  start?: number;
  end?: number;
};

declare type ASTElementHandlers = {
  [key: string]: ASTElementHandler | Array<ASTElementHandler>;
};
// ast指令
declare type ASTDirective = {
  name: string;
  rawName: string;
  value: string;
  arg: ?string;
  isDynamicArg: boolean;
  modifiers: ?ASTModifiers;
  start?: number;
  end?: number;
};

declare type ASTNode = ASTElement | ASTText | ASTExpression;

// <ul :class="bindCls" class="list" v-if="isShow">
//  <li v-for="(item,index) in data" @click="clickItem(index)">{{item}}:{{index}}</li>
// </ul>

// ast = {
//   'type': 1,
//   'tag': 'ul',
//   'attrsList': [],
//   'attrsMap': {
//     ':class': 'bindCls',
//     'class': 'list',
//     'v-if': 'isShow'
//   },
//   'if': 'isShow',
//   'ifConditions': [{
//     'exp': 'isShow',
//     'block': // ul ast element
//   }],
//   'parent': undefined,
//   'plain': false,
//   'staticClass': 'list',
//   'classBinding': 'bindCls',
//   'children': [{
//     'type': 1,
//     'tag': 'li',
//     'attrsList': [{
//       'name': '@click',
//       'value': 'clickItem(index)'
//     }],
//     'attrsMap': {
//       '@click': 'clickItem(index)',
//       'v-for': '(item,index) in data'
//      },
//     'parent': // ul ast element
//     'plain': false,
//     'events': {
//       'click': {
//         'value': 'clickItem(index)'
//       }
//     },
//     'hasBindings': true,
//     'for': 'data',
//     'alias': 'item',
//     'iterator1': 'index',
//     'children': [
//       'type': 2,
//       'expression': '_s(item)+":"+_s(index)'
//       'text': '{{item}}:{{index}}',
//       'tokens': [
//         {'@binding':'item'},
//         ':',
//         {'@binding':'index'}
//       ]
//     ]
//   }]
// }


// 元素节点的ast
declare type ASTElement = {
  type: 1;
  tag: string; // 标签名
  attrsList: Array<ASTAttr>; // 是一个对象数组，存储着原始的 html 属性名和值。
  // [
  //   {
  //     name: 'v-for',
  //     value: 'obj of list'
  //   },
  //   {
  //     name: 'class',
  //     value: 'box'
  //   }
  // ]
  attrsMap: { [key: string]: any }; // attrsMap 是以键值对的方式保存 html 属性名和值的
  rawAttrsMap: { [key: string]: ASTAttr }; // 原始的属性键值对
  parent: ASTElement | void; // 父节点元素描述对象的引用
  children: Array<ASTNode>; // 该节点所有子节点的元素描述对象

  start?: number;
  end?: number;

  processed?: true;

  static?: boolean; // 是否静态节点
  staticRoot?: boolean; // 是否静态根节点
  staticInFor?: boolean; // 是否v-for中的静态节点
  staticProcessed?: boolean; // 
  hasBindings?: boolean; // 如果模板使用了指令(任何指令 包括v-on v-bind等)会出现该属性

  text?: string; // 文本内容
  // 节点元素描述对象的 attrs 属性也是一个数组，并且也只有当节点类型为 1，即节点为标签的时候，其元素描述对象才会包含这个属性。
  // 不同之处在于:
  // attrsList 属性仅用于解析阶段，而 attrs 属性则用于代码生成阶段，甚至运行时阶段。
  // attrsList 属性所包含的内容作为元素材料被解析器使用，而 attrs 属性所包含的内容在运行时阶段会使用原生 DOM 操作方法 setAttribute 真正将属性设置给 DOM 元素
  // http://caibaojian.com/vue-design/appendix/ast.html#attrs
  attrs?: Array<ASTAttr>;
  dynamicAttrs?: Array<ASTAttr>; // 动态attrs
  props?: Array<ASTAttr>; // http://caibaojian.com/vue-design/appendix/ast.html#props
  plain?: boolean; // 如果为true 该节点的VNodeData将为空 v-pre标签的子标签plain都为true
  pre?: true; // 是否使用了v-pre v-pre: 跳过这个元素和它的子元素的编译过程.可以用来显示原始 Mustache 标签.
  ns?: string; // namespace 通常svg和math标签会有

  component?: string; // 如果使用了is特性,就会拥有该字段,值为is的值
  inlineTemplate?: true; // 一个组件使用内联模板 子组件内的内容既可以作为被分发的内容(slot)也可以作为内联模板 当使用了内联模板使会出现该属性
  transitionMode?: string | null;
  slotName?: ?string; // 具名插槽名称 slot标签特有
  slotTarget?: ?string; // <div slot="slotTarget"></div>
  slotTargetDynamic?: boolean;
  slotScope?: ?string; // 插槽作用域 <div slot-scope="slotScope"></div>
  scopedSlots?: { [name: string]: ASTElement }; // 作用域插槽

  ref?: string; // ref属性
  refInFor?: boolean; // 如果一个使用了 ref 特性的标签是使用了 v-for 指令标签的子代节点，则该标签元素描述对象的 checkInFor 属性将会为 true，否则为 false

  if?: string; // v-if中的内容
  ifProcessed?: boolean;
  elseif?: string; // v-else-if 中的内容
  else?: true; // v-else 中的内容
  // 如果一个标签使用 v-if 指令，则该标签的元素描述对象将会拥有 ifConditions 属性，它是一个数组。如果一个标签使用 v-else-if 或 v-else 指令，则该标签不会被添加到其父节点元素描述对象的 children 数组中，而是会被添加到相符的带有 v-if 指令节点的元素描述对象的 ifConditions 数组中。
  ifConditions?: ASTIfConditions; // 如果一个插槽是作用域插槽,则该插槽节点的元素描述对象不会作为组件的 children 属性存在，而是会被添加到组件元素描述对象的 scopedSlots 属性中

  // v-for特有
  // <div v-for="(obj, key, index) of list"></div>
  // ast = {
  //   for: 'list',
  //   alias: 'obj',
  //   iterator1: 'key'
  //   iterator2: 'index'
  // }
  for?: string; // obj of list 中的list
  forProcessed?: boolean;
  key?: string; // :key
  alias?: string;
  iterator1?: string; // v-for的第二个参数
  iterator2?: string;

  staticClass?: string; // 静态class <div class="a">
  classBinding?: string; // 绑定的class <div class="{ active: true }"
  staticStyle?: string; // 静态style
  styleBinding?: string; // 绑定的style
  events?: ASTElementHandlers; // v-on事件
  nativeEvents?: ASTElementHandlers; // 原生事件

  transition?: string | true;
  transitionOnAppear?: boolean;

  model?: { // v-model相关内容
    value: string; // 值
    callback: string; // 回调
    expression: string; // 表达式 "'abc'+_s(name)+'def'"
  };

  directives?: Array<ASTDirective>; // 保存所有的指令信息 v-on v-bind除外

  forbidden?: true; // 是否被禁止使用 如 style标签 没有type属性的script标签 type为'text/javascript'的script标签
  once?: true; // v-once
  onceProcessed?: boolean;
  wrapData?: (code: string) => string;
  wrapListeners?: (code: string) => string;

  // 2.4 ssr optimization
  ssrOptimizability?: number;

  // weex specific
  appendAsTree?: boolean;
};

// 表达式ast
declare type ASTExpression = {
  type: 2;
  expression: string; // 字面量表达式
  text: string;
  tokens: Array<string | Object>; // weex用的
  static?: boolean;
  // 2.4 ssr optimization
  ssrOptimizability?: number;
  start?: number;
  end?: number;
};

// 文本节点ast
declare type ASTText = {
  type: 3;
  text: string;
  static?: boolean;
  isComment?: boolean; // 是否是注释节点
  // 2.4 ssr optimization
  ssrOptimizability?: number;
  start?: number;
  end?: number;
};

// SFC-parser related declarations

// an object format describing a single-file component
declare type SFCDescriptor = {
  template: ?SFCBlock;
  script: ?SFCBlock;
  styles: Array<SFCBlock>;
  customBlocks: Array<SFCBlock>;
  errors: Array<string | WarningMessage>;
}

declare type SFCBlock = {
  type: string;
  content: string;
  attrs: {[attribute:string]: string};
  start?: number;
  end?: number;
  lang?: string;
  src?: string;
  scoped?: boolean;
  module?: string | boolean;
};
