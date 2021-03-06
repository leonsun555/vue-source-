/* @flow */

import type Watcher from './watcher'
import { remove } from '../util/index'
import config from '../config'

let uid = 0

/**
 * A dep is an observable that can have multiple
 * directives subscribing to it.
 */
//Dep對象記錄了當前的渲染watcher(target)和其訂閱者watcher(subs)
//因為同一時間只能有一個Watcher被計算,故Dep可以視為全局Watcher,
//Dep實際上就是對每個響應式組件的Wathcer進行管理,
//而每個響應式對象的getter都持有一個dep可以存取dep的方法,該dep的subs中紀錄了有哪些watcher訂閱了自己
export default class Dep {
  static target: ?Watcher;
  id: number;
  subs: Array<Watcher>;

  constructor () {
    this.id = uid++
    this.subs = []
  }

  addSub (sub: Watcher) {
    this.subs.push(sub)
  }

  removeSub (sub: Watcher) {
    remove(this.subs, sub)
  }

  depend () {
    if (Dep.target) {
      //addDep方法定義再watcher.js
      Dep.target.addDep(this)
    }
  }

  notify () {
    // stabilize the subscriber list first
    //將訂閱者watchers存至subs準備進行update
    const subs = this.subs.slice()
    if (process.env.NODE_ENV !== 'production' && !config.async) {
      // subs aren't sorted in scheduler if not running async
      // we need to sort them now to make sure they fire in correct
      // order
      subs.sort((a, b) => a.id - b.id)
    }
    for (let i = 0, l = subs.length; i < l; i++) {
      //依序通知訂閱者執行update()
      subs[i].update()
    }
  }
}

// The current target watcher being evaluated.
// This is globally unique because only one watcher
// can be evaluated at a time.
Dep.target = null
const targetStack = []

export function pushTarget (target: ?Watcher) {
  targetStack.push(target)
  Dep.target = target
}

export function popTarget () {
  targetStack.pop()
  //Stack概念,永遠pop最新push進Stack的物件
  Dep.target = targetStack[targetStack.length - 1]
}
