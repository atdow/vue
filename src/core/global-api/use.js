/*
 * @Author: atdow
 * @Date: 2022-02-10 21:22:08
 * @LastEditors: null
 * @LastEditTime: 2022-03-09 21:58:36
 * @Description: file description
 */
/* @flow */

import { toArray } from '../util/index'

/**
 * 安装Vue.js插件（注册插件）
 * 如果插件是一个对象，必须提供install方法。如果插件是一个函数，它会被作为install方法。调用install方法时，会将Vue作为参数传入。
 * install方法被同一个插件调用多次时，插件只会注册一次
 */
export function initUse (Vue: GlobalAPI) {
  Vue.use = function (plugin: Function | Object) {
    const installedPlugins = (this._installedPlugins || (this._installedPlugins = []))
    // 判断插件是否已经被注册，如果已经被注册，直接返回
    if (installedPlugins.indexOf(plugin) > -1) {
      return this
    }

    // additional parameters
    const args = toArray(arguments, 1)
    args.unshift(this) // args === [Vue, ...args]
    // 插件是一个对象，必须提供install方法
    if (typeof plugin.install === 'function') {
      plugin.install.apply(plugin, args)
    } else if (typeof plugin === 'function') { // 插件是一个函数
      plugin.apply(null, args) // 如果插件是一个函数，它会被作为install方法
    }
    installedPlugins.push(plugin) // 注册插件
    return this
  }
}
