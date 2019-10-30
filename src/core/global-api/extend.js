/* @flow */

import { ASSET_TYPES } from 'shared/constants'
import { defineComputed, proxy } from '../instance/state'
import { extend, mergeOptions, validateComponentName } from '../util/index'

export function initExtend (Vue: GlobalAPI) {
  /**
   * Each instance constructor, including Vue, has a unique
   * cid. This enables us to create wrapped "child
   * constructors" for prototypal inheritance and cache them.
   */
  Vue.cid = 0
  let cid = 1

  /**
   * Class inheritance
   */
  Vue.extend = function (extendOptions: Object): Function {
    extendOptions = extendOptions || {}
    const Super = this
    const SuperId = Super.cid
    const cachedCtors = extendOptions._Ctor || (extendOptions._Ctor = {})
    //判斷傳入Component是否有初始化過
    if (cachedCtors[SuperId]) {
      //如果有則直接返回Component
      return cachedCtors[SuperId]
    }

    const name = extendOptions.name || Super.options.name
    if (process.env.NODE_ENV !== 'production' && name) {
      //檢查Component名稱是否合法和衝突
      validateComponentName(name)
    }

    //初始化VueComponent為Sub的構造函數
    const Sub = function VueComponent (options) {
      //因為下面繼承了Vue Object,故可以調用vue._init()方法做初始化
      this._init(options)
    }
    //原型鍊繼承,意即在Vue(Super) Object上建立下線Sub(VueComponent)繼承Vue Object,
    //目的在於讓Sub擁有與Vue一樣的功能
    Sub.prototype = Object.create(Super.prototype)
    //constructor構建
    Sub.prototype.constructor = Sub
    Sub.cid = cid++
    //Vue.options與自身定義options合併
    Sub.options = mergeOptions(
      Super.options,
      extendOptions
    )
    //將Vue Object加入自身屬性:super
    Sub['super'] = Super

    // For props and computed properties, we define the proxy getters on
    // the Vue instances at extension time, on the extended prototype. This
    // avoids Object.defineProperty calls for each instance created.
    //如果有props屬性則進行初始化
    if (Sub.options.props) {
      initProps(Sub)
    }
    //如果有computed屬性,則進行初始化
    if (Sub.options.computed) {
      initComputed(Sub)
    }

    // allow further extension/mixin/plugin usage
    // 以下將Vue的功能屬性複製給Sub
    Sub.extend = Super.extend
    Sub.mixin = Super.mixin
    Sub.use = Super.use

    // create asset registers, so extended classes
    // can have their private assets too.
    ASSET_TYPES.forEach(function (type) {
      Sub[type] = Super[type]
    })
    // enable recursive self-lookup
    if (name) {
      Sub.options.components[name] = Sub
    }

    // keep a reference to the super options at extension time.
    // later at instantiation we can check if Super's options have
    // been updated.
    Sub.superOptions = Super.options
    Sub.extendOptions = extendOptions
    Sub.sealedOptions = extend({}, Sub.options)

    // cache constructor
    //暫存此新建立的Sub Component,以便以後再次呼叫到時,不用重新init,
    //等同於快取功能
    cachedCtors[SuperId] = Sub
    return Sub
  }
}

function initProps (Comp) {
  const props = Comp.options.props
  for (const key in props) {
    proxy(Comp.prototype, `_props`, key)
  }
}

function initComputed (Comp) {
  const computed = Comp.options.computed
  for (const key in computed) {
    defineComputed(Comp.prototype, key, computed[key])
  }
}
