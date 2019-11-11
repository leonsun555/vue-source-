/* @flow */

import {
  warn,
  once,
  isDef,
  isUndef,
  isTrue,
  isObject,
  hasSymbol,
  isPromise,
  remove
} from 'core/util/index'

import { createEmptyVNode } from 'core/vdom/vnode'
import { currentRenderingInstance } from 'core/instance/render'

function ensureCtor (comp: any, base) {
  if (
    comp.__esModule ||
    (hasSymbol && comp[Symbol.toStringTag] === 'Module')
  ) {
    comp = comp.default
  }
  return isObject(comp)
    ? base.extend(comp)
    : comp
}

//創建一個空的vnode,並傳入異步工廠函數及meta
export function createAsyncPlaceholder (
  factory: Function,
  data: ?VNodeData,
  context: Component,
  children: ?Array<VNode>,
  tag: ?string
): VNode {
  const node = createEmptyVNode()
  node.asyncFactory = factory
  node.asyncMeta = { data, context, children, tag }
  return node
}

export function resolveAsyncComponent (
  factory: Function,
  baseCtor: Class<Component>
): Class<Component> | void {
  if (isTrue(factory.error) && isDef(factory.errorComp)) {
    return factory.errorComp
  }
  
  //如果函數已解析完成,代表該異步Vue Component已經經過resolve產出Sub建構子了,直接返回Sub
  if (isDef(factory.resolved)) {
    return factory.resolved
  }

  //owner就是當前傳入vm object
  const owner = currentRenderingInstance
  if (owner && isDef(factory.owners) && factory.owners.indexOf(owner) === -1) {
    // already pending
    factory.owners.push(owner)
  }

  if (isTrue(factory.loading) && isDef(factory.loadingComp)) {
    return factory.loadingComp
  }

  if (owner && !isDef(factory.owners)) {
    //把自身存入factory.owners屬性
    const owners = factory.owners = [owner]
    let sync = true
    let timerLoading = null
    let timerTimeout = null

    ;(owner: any).$on('hook:destroyed', () => remove(owners, owner))

    //強制重新渲染
    const forceRender = (renderCompleted: boolean) => {
      for (let i = 0, l = owners.length; i < l; i++) {
        //owners底下的每個component重新強制更新(vm_watcher.update())
        (owners[i]: any).$forceUpdate()
      }

      //還在loading過程中,不清除計時器,
      //完成渲染後,把timerLoading & timerTimeout設為null,
      //disable error & loading handler
      if (renderCompleted) {
        owners.length = 0
        if (timerLoading !== null) {
          clearTimeout(timerLoading)
          timerLoading = null
        }
        if (timerTimeout !== null) {
          clearTimeout(timerTimeout)
          timerTimeout = null
        }
      }
    }

    //定義resolve函數處理方式,並確保他只執行一次
    const resolve = once((res: Object | Class<Component>) => {
      // cache resolved
      //將工廠函數傳入之Component透過webpack編譯後傳入,
      //並確保有實作Vue.extend方法,並存入factory.resolved
      //如果工廠函數傳入的只是函式,則直接原樣存入factory.resolved就好
      factory.resolved = ensureCtor(res, baseCtor)
      // invoke callbacks only if this is not a synchronous resolve
      // (async resolves are shimmed as synchronous during SSR)
      if (!sync) {
        //異步處理時,強制重新渲染
        forceRender(true)
      } else {
        owners.length = 0
      }
    })

    //定義reject函數處理方式,並確保他只執行一次
    const reject = once(reason => {
      process.env.NODE_ENV !== 'production' && warn(
        `Failed to resolve async component: ${String(factory)}` +
        (reason ? `\nReason: ${reason}` : '')
      )
      if (isDef(factory.errorComp)) {
        factory.error = true
        forceRender(true)
      }
    })

    //將定義過的resolve及reject處理方式傳給傳入之工廠函數進行apply
    const res = factory(resolve, reject)

    if (isObject(res)) {
      if (isPromise(res)) {
        // () => Promise
        if (isUndef(factory.resolved)) {
          res.then(resolve, reject)
        }
      //高級異步組件邏輯
      } else if (isPromise(res.component)) {
        //等待res解析,等待的過程中會先執行以下步驟,在loading的過程中,會先返回loading component,
        //如果失敗或timeout,則返回reject警告
        res.component.then(resolve, reject)

        //高級異步組件配置,如果error時有配置component,則確保它實作Vue.extend方法
        if (isDef(res.error)) {
          factory.errorComp = ensureCtor(res.error, baseCtor)
        }

        //同上,高級異步組件配置,loading載入的Component
        if (isDef(res.loading)) {
          factory.loadingComp = ensureCtor(res.loading, baseCtor)
          if (res.delay === 0) {
            //如果delay屬性為0,直接渲染成loading component
            factory.loading = true
          } else {
            //計時超過delay時間則渲染成loading component
            timerLoading = setTimeout(() => {
              timerLoading = null
              if (isUndef(factory.resolved) && isUndef(factory.error)) {
                factory.loading = true
                forceRender(false)
              }
            }, res.delay || 200)
          }
        }

        //超過Timeout時間則返回reject函式,並顯示timeout訊息,及將factory.error設為true,
        //渲染error component
        if (isDef(res.timeout)) {
          timerTimeout = setTimeout(() => {
            timerTimeout = null
            if (isUndef(factory.resolved)) {
              reject(
                process.env.NODE_ENV !== 'production'
                  ? `timeout (${res.timeout}ms)`
                  : null
              )
            }
          }, res.timeout)
        }
      }
    }

    sync = false
    // return in case resolved synchronously
    //如果factory.loading為true,代表載入的組件正在載入中,
    //返回高級配置的loading component
    return factory.loading
      ? factory.loadingComp
      : factory.resolved
  }
}
