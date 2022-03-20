/*
 * @Author: atdow
 * @Date: 2022-02-10 21:22:08
 * @LastEditors: null
 * @LastEditTime: 2022-03-20 21:08:52
 * @Description: file description
 */
/* @flow */

import { identity, resolveAsset } from 'core/util/index'
// identity = (_: any) => _
/**
 * Runtime helper for resolving filters
 * _f函数是activated函数的别名
 */
export function resolveFilter (id: string): Function {
  return resolveAsset(this.$options, 'filters', id, true) || identity
}
