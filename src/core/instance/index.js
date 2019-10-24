import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'


//真正Vue Object定義的地方
function Vue (options) {
  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue)
  ) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  //此方法在initMixin中
  this._init(options)
}

//一系列的方法混入
//初始化Vue object定義
initMixin(Vue)
//state實作,相關屬性賦予set,get方法,並加入watch監聽方法
stateMixin(Vue)
//events方法實作
eventsMixin(Vue)
//生命週期實作
lifecycleMixin(Vue)
//render函數實作
renderMixin(Vue)

export default Vue
