/* @flow */
/**
 * 和标签属性有关的一些工具函数
 */
import { makeMap } from 'shared/util'

// these are reserved for web because they are directly compiled away
// during template compilation
/**
 * 检查是否是保留属性
 * style || class
 */
export const isReservedAttr = makeMap('style,class')

// attributes that should be using props for binding
/**
 * 检查是否为接收value的标签
 */
const acceptValue = makeMap('input,textarea,option,select,progress')
/**
 * 检查该标签是否一定要写该属性
 * @param {string} tag 标签
 * @param {?string} type 类型
 * @param {string} attr 属性
 * @returns {boolean}
 */
export const mustUseProp = (tag: string, type: ?string, attr: string): boolean => {
  return (
    (attr === 'value' && acceptValue(tag)) && type !== 'button' ||
    (attr === 'selected' && tag === 'option') ||
    (attr === 'checked' && tag === 'input') ||
    (attr === 'muted' && tag === 'video')
  )
}

/**
 * 检查是否是枚举属性
 */
export const isEnumeratedAttr = makeMap('contenteditable,draggable,spellcheck')

/**
 * 检查是否是内容可编辑属性
 */
const isValidContentEditableValue = makeMap('events,caret,typing,plaintext-only')

/**
 * 
 */
export const convertEnumeratedValue = (key: string, value: any) => {
  return isFalsyAttrValue(value) || value === 'false'
    ? 'false'
    // allow arbitrary string value for contenteditable
    : key === 'contenteditable' && isValidContentEditableValue(value)
      ? value
      : 'true'
}

/**
 * 检查是否是填写真假值的属性
 */
export const isBooleanAttr = makeMap(
  'allowfullscreen,async,autofocus,autoplay,checked,compact,controls,declare,' +
  'default,defaultchecked,defaultmuted,defaultselected,defer,disabled,' +
  'enabled,formnovalidate,hidden,indeterminate,inert,ismap,itemscope,loop,multiple,' +
  'muted,nohref,noresize,noshade,novalidate,nowrap,open,pauseonexit,readonly,' +
  'required,reversed,scoped,seamless,selected,sortable,translate,' +
  'truespeed,typemustmatch,visible'
)

export const xlinkNS = 'http://www.w3.org/1999/xlink'

export const isXlink = (name: string): boolean => {
  return name.charAt(5) === ':' && name.slice(0, 5) === 'xlink'
}

export const getXlinkProp = (name: string): string => {
  return isXlink(name) ? name.slice(6, name.length) : ''
}

/**
 * 判断是否为假值
 * null || fafse
 */
export const isFalsyAttrValue = (val: any): boolean => {
  return val == null || val === false
}
