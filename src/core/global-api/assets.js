/* @flow */

import { ASSET_TYPES } from 'shared/constants'
import { isPlainObject, validateComponentName } from '../util/index'

export function initAssetRegisters (Vue: GlobalAPI) {
  /**
   * Create asset registration methods.
   */
  ASSET_TYPES.forEach(type => {
    Vue[type] = function (
      id: string,
      definition: Function | Object
    ): Function | Object | void {
      if (!definition) {
        return this.options[type + 's'][id]
      } else {
        /* istanbul ignore if */
        if (process.env.NODE_ENV !== 'production' && type === 'component') {
          validateComponentName(id)
        }
        //component屬性擴充(component全局註冊),這邊會檢查傳入的definition是不是一個普通對像,
        //如果不是,代表傳入可能是函數(factory工廠函數),表示該組件為異步組件)
        if (type === 'component' && isPlainObject(definition)) {
          definition.name = definition.name || id
          //this.options._base.extend就是Vue.extend
          //也就是將傳入Component擴展成子組件的結構
          definition = this.options._base.extend(definition)
        }
        if (type === 'directive' && typeof definition === 'function') {
          definition = { bind: definition, update: definition }
        }
        //將結果存入options.[components || directive].id
        this.options[type + 's'][id] = definition
        return definition
      }
    }
  })
}
