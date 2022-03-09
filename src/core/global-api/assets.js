/*
 * @Author: atdow
 * @Date: 2022-02-10 21:22:08
 * @LastEditors: null
 * @LastEditTime: 2022-03-09 21:31:23
 * @Description: file description
 */
/* @flow */

import { ASSET_TYPES } from 'shared/constants'
import { isPlainObject, validateComponentName } from '../util/index'

/**
 * 初始化Vue.component、Vue.directive和Vue.filter
 */
export function initAssetRegisters (Vue: GlobalAPI) {
  /**
   * Create asset registration methods.
   * ASSET_TYPES === ['component', 'directive', 'filter']
   */
  ASSET_TYPES.forEach(type => {
    Vue[type] = function (
      id: string,
      definition: Function | Object
    ): Function | Object | void {
      if (!definition) {
        return this.options[type + 's'][id] // 获取操作
      } else {
        /**
         * 注册操作
         */
        /* istanbul ignore if */
        if (process.env.NODE_ENV !== 'production' && type === 'component') {
          validateComponentName(id)
        }
        /**
         * Vue.component
         * 参数支持选项对象和构造函数
         */
        if (type === 'component' && isPlainObject(definition)) {
          definition.name = definition.name || id // 如果选项中没有设置组件名，则自动使用给定的id设置组件的名称
          definition = this.options._base.extend(definition) // 如果参数是选项对象，则调用Vue.extend转成构造函数(this.options._base===Vue)
        }
        // Vue.directive
        if (type === 'directive' && typeof definition === 'function') {
          definition = { bind: definition, update: definition }
        }
        this.options[type + 's'][id] = definition // 存储起来
        return definition
      }
    }
  })
}
