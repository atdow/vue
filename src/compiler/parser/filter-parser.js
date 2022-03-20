/*
 * @Author: atdow
 * @Date: 2022-02-10 21:22:08
 * @LastEditors: null
 * @LastEditTime: 2022-03-20 21:42:19
 * @Description: file description
 */
/* @flow */

const validDivisionCharRE = /[\w).+\-_$\]]/

/**
 * 解析过滤器
 */
export function parseFilters (exp: string): string {
  let inSingle = false
  let inDouble = false
  let inTemplateString = false
  let inRegex = false
  let curly = 0
  let square = 0
  let paren = 0
  let lastFilterIndex = 0
  let c, prev, i, expression, filters

  for (i = 0; i < exp.length; i++) {
    prev = c
    c = exp.charCodeAt(i)
    if (inSingle) {
      if (c === 0x27 && prev !== 0x5C) inSingle = false
    } else if (inDouble) {
      if (c === 0x22 && prev !== 0x5C) inDouble = false
    } else if (inTemplateString) {
      if (c === 0x60 && prev !== 0x5C) inTemplateString = false
    } else if (inRegex) {
      if (c === 0x2f && prev !== 0x5C) inRegex = false
    } else if (
      c === 0x7C && // pipe
      exp.charCodeAt(i + 1) !== 0x7C &&
      exp.charCodeAt(i - 1) !== 0x7C &&
      !curly && !square && !paren
    ) {
      if (expression === undefined) {
        // first filter, end of expression
        lastFilterIndex = i + 1
        expression = exp.slice(0, i).trim()
      } else {
        pushFilter()
      }
    } else {
      switch (c) {
        case 0x22: inDouble = true; break         // "
        case 0x27: inSingle = true; break         // '
        case 0x60: inTemplateString = true; break // `
        case 0x28: paren++; break                 // (
        case 0x29: paren--; break                 // )
        case 0x5B: square++; break                // [
        case 0x5D: square--; break                // ]
        case 0x7B: curly++; break                 // {
        case 0x7D: curly--; break                 // }
      }
      if (c === 0x2f) { // /
        let j = i - 1
        let p
        // find first non-whitespace prev char
        for (; j >= 0; j--) {
          p = exp.charAt(j)
          if (p !== ' ') break
        }
        if (!p || !validDivisionCharRE.test(p)) {
          inRegex = true
        }
      }
    }
  }

  if (expression === undefined) {
    expression = exp.slice(0, i).trim()
  } else if (lastFilterIndex !== 0) {
    pushFilter()
  }

  function pushFilter () {
    (filters || (filters = [])).push(exp.slice(lastFilterIndex, i).trim())
    lastFilterIndex = i + 1
  }
  /**
   * {{ message | filterA | filterB}}
   * let filters = exp.split('|')
   * let expression = filters.shift().trim() [message, filterA, filterB]
   */

  if (filters) {
    // 循环遍历过滤器，因为过滤器支持串联（前面过滤器的结果将会作为下一个过滤器的输入）
    for (i = 0; i < filters.length; i++) {
      expression = wrapFilter(expression, filters[i])
    }
  }

  return expression
}

/**
 * 拼接过滤器字符串
 * @param {*} exp 表达式
 * @param {*} filter 过滤器
 * @returns
 */
function wrapFilter (exp: string, filter: string): string {
  const i = filter.indexOf('(') // 如果过滤器字符串中包含字符(，说明过滤器携带了其他参数
  // filterA('arg1',arg2)
  if (i < 0) {
    // _f: resolveFilter
    return `_f("${filter}")(${exp})`
  } else {
    const name = filter.slice(0, i) // filterA
    const args = filter.slice(i + 1) // 'arg1',arg2)
    return `_f("${name}")(${exp}${args !== ')' ? ',' + args : args}` // 在后面这里已经将args最后的)去掉
  }
}
