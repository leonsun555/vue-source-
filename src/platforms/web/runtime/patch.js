/* @flow */

//實際DOM 操作
import * as nodeOps from 'web/runtime/node-ops'
import { createPatchFunction } from 'core/vdom/patch'
//基本生成DOM的Moudules
import baseModules from 'core/vdom/modules/index'
//具有平台差異性的生成DOM的Modules
import platformModules from 'web/runtime/modules/index'

// the directive module should be applied last, after all
// built-in modules have been applied.
/* 
   因為Vue可以執行於web端及server端(weex),產生DOM的方法及相關參數都不一樣,
   故先把這些Modules做分類並統一包成一個patch Function,透過額外傳入nodeOps參數判斷需要調用哪些方法
*/
const modules = platformModules.concat(baseModules)

export const patch: Function = createPatchFunction({ nodeOps, modules })
