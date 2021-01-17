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
  // transform an AST node after built-ins like v-if, v-for are processed
  // 在处理内置指令(v-if v-for)后转换AST
  transformNode: (el: ASTElement) => ?ASTElement;
  // transform an AST node after its children have been processed
  // cannot return replacement in postTransform because tree is already finalized
  postTransformNode: (el: ASTElement) => void;
  genData: (el: ASTElement) => string; // generate extra data string for an element
  transformCode?: (el: ASTElement, code: string) => string; // further transform generated code for an element
  staticKeys?: Array<string>; // AST properties to be considered static
};

declare type ASTModifiers = { [key: string]: boolean };
declare type ASTIfCondition = { exp: ?string; block: ASTElement };
declare type ASTIfConditions = Array<ASTIfCondition>;

declare type ASTAttr = {
  name: string;
  value: any;
  dynamic?: boolean;
  start?: number;
  end?: number
};

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

declare type ASTElement = {
  type: 1;
  tag: string;
  attrsList: Array<ASTAttr>;
  attrsMap: { [key: string]: any };
  rawAttrsMap: { [key: string]: ASTAttr };
  parent: ASTElement | void;
  children: Array<ASTNode>;

  start?: number;
  end?: number;

  processed?: true;

  static?: boolean;
  staticRoot?: boolean;
  staticInFor?: boolean;
  staticProcessed?: boolean;
  hasBindings?: boolean;

  text?: string;
  attrs?: Array<ASTAttr>;
  dynamicAttrs?: Array<ASTAttr>;
  props?: Array<ASTAttr>;
  plain?: boolean;
  pre?: true;
  ns?: string;

  component?: string;
  inlineTemplate?: true;
  transitionMode?: string | null;
  slotName?: ?string;
  slotTarget?: ?string;
  slotTargetDynamic?: boolean;
  slotScope?: ?string;
  scopedSlots?: { [name: string]: ASTElement };

  ref?: string;
  refInFor?: boolean;

  if?: string;
  ifProcessed?: boolean;
  elseif?: string;
  else?: true;
  ifConditions?: ASTIfConditions;

  for?: string;
  forProcessed?: boolean;
  key?: string;
  alias?: string;
  iterator1?: string;
  iterator2?: string;

  staticClass?: string;
  classBinding?: string;
  staticStyle?: string;
  styleBinding?: string;
  events?: ASTElementHandlers;
  nativeEvents?: ASTElementHandlers;

  transition?: string | true;
  transitionOnAppear?: boolean;

  model?: {
    value: string;
    callback: string;
    expression: string;
  };

  directives?: Array<ASTDirective>;

  forbidden?: true;
  once?: true;
  onceProcessed?: boolean;
  wrapData?: (code: string) => string;
  wrapListeners?: (code: string) => string;

  // 2.4 ssr optimization
  ssrOptimizability?: number;

  // weex specific
  appendAsTree?: boolean;
};

declare type ASTExpression = {
  type: 2;
  expression: string;
  text: string;
  tokens: Array<string | Object>;
  static?: boolean;
  // 2.4 ssr optimization
  ssrOptimizability?: number;
  start?: number;
  end?: number;
};

declare type ASTText = {
  type: 3;
  text: string;
  static?: boolean;
  isComment?: boolean;
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
