<!--
 * @Author: atdow
 * @Date: 2022-02-10 21:36:03
 * @LastEditors: null
 * @LastEditTime: 2022-02-10 21:40:15
 * @Description: file description
-->
## 变化侦听
```js
function defineReactive(data, key, val){
  Object.defineProperty(data, key, {
    enumerable: true,
    configurable: true,
    get: function(){
      // 收集依赖
      return val;
    },
    set: function(newVal){
      // 触发依赖
      if(val === newVal){
        val = newVal;
      }
    }
  })
}
```
> 在getter中收集依赖（用到对应变量的地方），在setter中触发依赖
