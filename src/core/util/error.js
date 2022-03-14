/*
 * @Author: atdow
 * @Date: 2022-02-10 21:22:08
 * @LastEditors: null
 * @LastEditTime: 2022-03-12 13:32:58
 * @Description: file description
 */
/* @flow */

import config from '../config'
import { warn } from './debug'
import { inBrowser, inWeex } from './env'
import { isPromise } from 'shared/util'
import { pushTarget, popTarget } from '../observer/dep'

/**
 * 1.将所有所有错误发送给config.errorHandler  globalHandleError()
 * 2.如果一个组件继承的链路或其父组件链路中存在多个errorCaptured钩子函数，则它们将会被相同的错误逐个唤起
 * 3.如果errorCaptured钩子函数自身抛出了一个错误，那么这个错误和原本被捕获的错误都会发送给全局的config.errorHandler
 * 4.一个errorCaptured钩子函数能够返回false来阻止错误继续向上传播。他会阻止其他被这个错误唤起的errorCaptured钩子函数和全局config.errorHandler
 */
export function handleError (err: Error, vm: any, info: string) {
  // Deactivate deps tracking while processing error handler to avoid possible infinite rendering.
  // See: https://github.com/vuejs/vuex/issues/1505
  pushTarget()
  try {
    if (vm) {
      let cur = vm
      /**
       * 2.如果一个组件继承的链路或其父组件链路中存在多个errorCaptured钩子函数，则它们将会被相同的错误逐个唤起
       * while语句自底向上不停循环获取父组件，直到根组件。
       * 自底向上的每一层都会读出当前组件的errorCaptured钩子函数列表，并依次执行列表中的每一个钩子函数；所以errorCaptured
       * 可以捕获来自子孙组件抛出的错误。
       */
      while ((cur = cur.$parent)) {
        const hooks = cur.$options.errorCaptured
        if (hooks) {
          for (let i = 0; i < hooks.length; i++) {
            try {
              const capture = hooks[i].call(cur, err, vm, info) === false
              // 4.一个errorCaptured钩子函数能够返回false来阻止错误继续向上传播。他会阻止其他被这个错误唤起的errorCaptured钩子函数和全局config.errorHandler
              // 因为是自底向上的循环方式，所以只要returen了就不会再向上传播
              if (capture) return
            } catch (e) {
              // 3.如果errorCaptured钩子函数自身抛出了一个错误，那么这个错误和原本被捕获的错误都会发送给全局的config.errorHandler
              globalHandleError(e, cur, 'errorCaptured hook')
            }
          }
        }
      }
    }
    globalHandleError(err, vm, info)
  } finally {
    popTarget()
  }
}

export function invokeWithErrorHandling (
  handler: Function,
  context: any,
  args: null | any[],
  vm: any,
  info: string
) {
  let res
  try {
    res = args ? handler.apply(context, args) : handler.call(context)
    if (res && !res._isVue && isPromise(res) && !res._handled) {
      res.catch(e => handleError(e, vm, info + ` (Promise/async)`))
      // issue #9511
      // avoid catch triggering multiple times when nested calls
      res._handled = true
    }
  } catch (e) {
    handleError(e, vm, info)
  }
  return res
}

// 将错误发送给config.errorHandler
function globalHandleError (err, vm, info) {
  // 这里的config.errorHandler就是Vue.config.errorHandler
  if (config.errorHandler) {
    try {
      return config.errorHandler.call(null, err, vm, info)
    } catch (e) {
      // if the user intentionally throws the original error in the handler,
      // do not log it twice
      if (e !== err) {
        logError(e, null, 'config.errorHandler')
      }
    }
  }
  logError(err, vm, info)
}

function logError (err, vm, info) {
  if (process.env.NODE_ENV !== 'production') {
    warn(`Error in ${info}: "${err.toString()}"`, vm)
  }
  /* istanbul ignore else */
  if ((inBrowser || inWeex) && typeof console !== 'undefined') {
    console.error(err)
  } else {
    throw err
  }
}
