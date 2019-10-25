/* @flow */

import config from 'core/config'
import { warn, cached } from 'core/util/index'
import { mark, measure } from 'core/util/perf'

import Vue from './runtime/index'
import { query } from './util/index'
import { compileToFunctions } from './compiler/index'
import { shouldDecodeNewlines, shouldDecodeNewlinesForHref } from './util/compat'

const idToTemplate = cached(id => {
  const el = query(id)
  return el && el.innerHTML
})

//暫存$mount,Vue import來源為'./runtime/index'
const mount = Vue.prototype.$mount
//為runtime + complier運行模式定義一個新的mount屬性,外加一些特定邏輯
Vue.prototype.$mount = function (
  el?: string | Element,
  hydrating?: boolean
): Component {
  //query(el)返回DOM Object
  el = el && query(el)

  /* istanbul ignore if */
  //如果傳入的el為body或document的話,則報錯
  if (el === document.body || el === document.documentElement) {
    process.env.NODE_ENV !== 'production' && warn(
      `Do not mount Vue to <html> or <body> - mount to normal elements instead.`
    )
    return this
  }

  const options = this.$options
  // resolve template/el and convert to render function
  //判斷是否有render函數
  if (!options.render) {
    let template = options.template
    //如果有template屬性
    if (template) {
      //template為字串
      if (typeof template === 'string') {
        if (template.charAt(0) === '#') {
          template = idToTemplate(template)
          /* istanbul ignore if */
          if (process.env.NODE_ENV !== 'production' && !template) {
            warn(
              `Template element not found or is empty: ${options.template}`,
              this
            )
          }
        }
      //template為合法的Node節點
      } else if (template.nodeType) {
        template = template.innerHTML
      //都不是則報錯
      } else {
        if (process.env.NODE_ENV !== 'production') {
          warn('invalid template option:' + template, this)
        }
        return this
      }
    //如果template沒定義,但el傳入已是DOM Object,則直接get el底下所有DOM對象
    } else if (el) {
      template = getOuterHTML(el)
    }
    //經上述處理後,再次判斷是否有template
    if (template) {
      /* istanbul ignore if */
      if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
        mark('compile')
      }

      //定義render函數並將template compile成render函數
      const { render, staticRenderFns } = compileToFunctions(template, {
        outputSourceRange: process.env.NODE_ENV !== 'production',
        shouldDecodeNewlines,
        shouldDecodeNewlinesForHref,
        delimiters: options.delimiters,
        comments: options.comments
      }, this)
      options.render = render
      options.staticRenderFns = staticRenderFns

      /* istanbul ignore if */
      if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
        mark('compile end')
        measure(`vue ${this._name} compile`, 'compile', 'compile end')
      }
    }
  }
  //將此修改後的mount物件重新帶入原本定義的mount物件
  return mount.call(this, el, hydrating)
}

/**
 * Get outerHTML of elements, taking care
 * of SVG elements in IE as well.
 */
function getOuterHTML (el: Element): string {
  //如果可以取得outerHTML則直接返回
  if (el.outerHTML) {
    return el.outerHTML
  } else {
    //沒有的話則外包一個div元素,把el append進該div元素再返回innerHTML
    const container = document.createElement('div')
    container.appendChild(el.cloneNode(true))
    return container.innerHTML
  }
}

Vue.compile = compileToFunctions

export default Vue
