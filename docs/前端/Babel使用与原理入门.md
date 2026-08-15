# Babel 使用与原理入门
> 知道 Babel 是什么、为什么需要它、基本原理、如何在项目中配置和使用
>

## 1. Babel 是什么
Babel 是一个 JavaScript 编译器，主要作用是把新版 JavaScript 代码转换成兼容性更好的旧版 JavaScript 代码。  
Babel 的价值就是让我们可以写现代代码，再把代码转换成目标环境能运行的版本。

它常用于：

+ 把 ES6+ 语法转换成旧浏览器可识别的代码
+ 转换 JSX、TypeScript 等语法
+ 配合打包工具处理前端工程代码
+ 通过插件做代码转换、代码注入、按需引入等

例如我们写：

```javascript
const add = (a, b) => a + b
```

Babel 可以转换成：

```javascript
var add = function add(a, b) {
  return a + b
}
```



## 3. Babel 能做什么，不能做什么
Babel 主要处理“语法转换”。  
但 Babel 默认不能直接补齐运行时 API。

简单理解：

+ Babel：负责语法降级
+ polyfill：负责补齐旧环境没有的 API

## 4. Babel 的核心原理
Babel 的工作流程可以分成 3 步：

```plain
源码 -> 解析 AST -> 转换 AST -> 生成代码
```



整个过程可以理解成：

```plain
字符串代码 -> 对象树 -> 修改对象树 -> 新字符串代码
```

## 5. Babel 的几个重要概念
### 5.1 plugin
plugin 是 Babel 的最小转换单元。

一个插件通常只处理一个能力，例如：

+ 转换箭头函数
+ 转换 class
+ 转换可选链
+ 转换 JSX



### 5.2 preset
preset 是一组 plugin 的集合。

如果每个语法都手动配插件，会非常麻烦：

所以实际项目通常使用 preset：

```json
{
  "presets": ["@babel/preset-env"]
}
```

`@babel/preset-env` 会根据目标环境自动决定需要哪些转换。

### 5.3 polyfill
polyfill 用来补齐旧环境缺失的 API。

这些不是语法，而是运行时能力。旧环境没有这些 API 时，需要 polyfill。



## 
## 6 创建 Babel 配置
`babel.config.json`：

```json
{
  "presets": [
    [
      "@babel/preset-env",
      {
        "targets": "> 0.25%, not dead"
      }
    ]
  ]
}
```

含义：

+ `@babel/preset-env`：根据目标环境自动转换
+ `targets`：指定要兼容哪些浏览器或运行环境
+ `> 0.25%, not dead`：兼容市场占有率大于 0.25% 且仍维护的浏览器

## 7. targets 怎么理解
`targets` 决定 Babel 要把代码转换到什么程度。

如果目标环境很现代，Babel 转换得少：

```json
{
  "targets": {
    "chrome": "120"
  }
}
```

如果目标环境比较旧，Babel 转换得多：

```json
{
  "targets": {
    "ie": "11"
  }
}
```

## 8. 配置 polyfill
安装：

```bash
npm i core-js
```

配置：

```typescript
{
  "presets": [
    [
      "@babel/preset-env",
      {
        "useBuiltIns": "usage",
        "corejs": 3
      }
    ]
  ]
}
```

```json
{
  "presets": [
    [
      "@babel/preset-env",
      {
        "useBuiltIns": "usage",	// 按代码实际用到的 API 自动引入 polyfill
        "corejs": 3
      }
    ]
  ]
}
```

## 9. Babel 和 Webpack / Vite 的关系
| Webpack / Vite | Babel |
| --- | --- |
| **构建工具 / 打包工具** | **代码编译器 / 转译器** |
| 关注的是：模块、依赖、资源、打包、开发服务器 | 关注的是：语法转换、兼容性转换 |
| 可以处理 JS、CSS、图片、字体等资源 | 主要处理 JavaScript 相关代码 |
| 最终输出可部署的项目文件 | 输出转换后的 JS 代码 |
| Webpack 通过 `babel-loader`<br/> 使用 Babel | Babel 本身不打包项目 |
| Vite 默认更多用 `esbuild`<br/>，也可以接入 Babel | Babel 可以被 Webpack / Vite 调用 |
| 解决“项目怎么构建运行”的问题 | 解决“代码语法浏览器是否支持”的问题 |


在 Webpack 中通常通过 `babel-loader` 使用 Babel：

```bash
npm i -D babel-loader @babel/core @babel/preset-env
```

`webpack.config.js`：

```javascript
export default {
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: 'babel-loader'
      }
    ]
  }
}
```



## 11. TypeScript 项目中的 Babel
Babel 只移除 TypeScript 类型，不做类型检查。

所以 TypeScript 项目通常还需要：

```bash
tsc --noEmit
```

简单理解：

+ Babel：负责转代码
+ TypeScript Compiler：负责查类型

## 12. 常见配置文件
Babel 常见配置文件有：

```plain
babel.config.json
.babelrc
.babelrc.json
package.json 中的 babel 字段
```

推荐：

```plain
babel.config.json
```

原因：

+ 适合项目级配置
+ 行为更明确
+ 在 monorepo 中更稳定

示例：

```json
{
  "presets": [
    [
      "@babel/preset-env",
      {
        "targets": "> 0.25%, not dead",
        "useBuiltIns": "usage",
        "corejs": 3
      }
    ]
  ],
  "plugins": []
}
```

## 13. 写一个最简单的 Babel 插件
Babel 插件本质上是一个函数，返回 visitor。

目标：把变量名 `oldName` 改成 `newName`。

`rename-plugin.js`：

```javascript
export default function renamePlugin() {
  return {
    visitor: {
      Identifier(path) {
        if (path.node.name !== 'oldName') return
        path.node.name = 'newName'
      }
    }
  }
}
```

源码：

```javascript
const oldName = 'Tom'
console.log(oldName)
```

转换后：

```javascript
const newName = 'Tom'
console.log(newName)
```

这里的核心点：

+ `Identifier` 表示标识符节点
+ `path.node` 是当前 AST 节点
+ 修改 `path.node.name` 就是在修改代码结构

真实项目中的 Babel 插件也是基于类似思想，只是会处理更多边界情况。

## 14. 常见问题
### 14.1 为什么 Babel 转换后代码变多了
因为 Babel 需要把高级语法转换成低级语法，有时还要注入辅助函数。

例如 class、async / await、解构赋值等语法，转换后通常会更长。

### 14.2 为什么配置了 Babel，代码还是在旧浏览器报错
常见原因：

+ 没有配置正确的 `targets`
+ 只做了语法转换，没有加 polyfill
+ 依赖包里的代码没有被 Babel 处理
+ 使用了目标浏览器完全不支持的特性

### 14.3 为什么 node_modules 通常不走 Babel
因为依赖包通常已经发布成兼容性较好的代码。

如果全部转换 `node_modules`：

+ 构建会变慢
+ 可能引入额外问题

但有些现代依赖只发布 ESModule 或 ES6+ 代码，低版本浏览器兼容时可能需要单独处理。

### 14.4 Babel 和 SWC、esbuild 有什么区别
简单理解：

+ Babel：生态成熟，插件丰富，适合复杂代码转换
+ SWC：Rust 编写，速度快，常用于 Next.js
+ esbuild：Go 编写，速度很快，常用于 Vite 依赖预构建

如果只是常规语法转换，SWC 和 esbuild 很快。  
如果需要复杂自定义转换，Babel 的插件生态更强。





## AST节点
| 代码 | AST 节点类型 | 人话 |
| --- | --- | --- |
| `function add() {}` | `FunctionDeclaration` | 普通函数声明 |
| `const add = function() {}` | `FunctionExpression` | 函数表达式 |
| `const add = () => {}` | `ArrowFunctionExpression` | 箭头函数 |
| `obj.say()` | `CallExpression` | 函数调用 |
| `new Person()` | `NewExpression` | 构造函数调用 |
| `const obj = { say() {} }` | `ObjectMethod` | 对象方法 |
| `class A { say() {} }` | `ClassMethod` | 类方法 |
| `class A { #say() {} }` | `ClassPrivateMethod` | 私有类方法 |
| `fn?.()` | `OptionalCallExpression`<br/> / `CallExpression` | 可选链调用 |
| `tag\`<br/>hello`` | `TaggedTemplateExpression` | 标签模板函数调用 |


| 代码 | AST 节点 | 人话 |
| --- | --- | --- |
| `const a = 1` | `VariableDeclaration` | 变量声明整体 |
| `a = 1` | `VariableDeclarator` | 某一个具体变量声明 |
| `a` | `Identifier` | 变量名/标识符 |
| `1` | `NumericLiteral` | 数字字面量 |
| `'hello'` | `StringLiteral` | 字符串字面量 |
| `true` | `BooleanLiteral` | 布尔字面量 |
| `null` | `NullLiteral` | null 字面量 |


| 代码 | AST 节点 | 人话 |
| --- | --- | --- |
| `a + b` | `BinaryExpression` | 二元表达式 |
| `a = b` | `AssignmentExpression` | 赋值表达式 |
| `a++` | `UpdateExpression` | 自增/自减 |
| `!a` | `UnaryExpression` | 一元表达式 |
| `a && b` | `LogicalExpression` | 逻辑表达式 |
| `a ? b : c` | `ConditionalExpression` | 三元表达式 |


| 代码 | AST 节点 | 人话 |
| --- | --- | --- |
| `function add() {}` | `FunctionDeclaration` | 函数声明 |
| `const add = function() {}` | `FunctionExpression` | 函数表达式 |
| `const add = () => {}` | `ArrowFunctionExpression` | 箭头函数 |
| `async function fn() {}` | `FunctionDeclaration + async` | async 函数 |
| `function* gen() {}` | `FunctionDeclaration + generator` | generator 函数 |


| 代码 | AST 节点 | 人话 |
| --- | --- | --- |
| `add(1, 2)` | `CallExpression` | 函数调用 |
| `obj.say()` | `CallExpression + MemberExpression` | 对象方法调用 |
| `new Person()` | `NewExpression` | new 调用 |
| `fn?.()` | `OptionalCallExpression` | 可选链函数调用 |
| `tag\`<br/>hello`` | `TaggedTemplateExpression` | 标签模板调用 |


| 代码 | AST 节点 | 人话 |
| --- | --- | --- |
| `{ name: 'Tom' }` | `ObjectExpression` | 对象字面量 |
| `name: 'Tom'` | `ObjectProperty` | 对象属性 |
| `{ say() {} }` | `ObjectMethod` | 对象方法 |
| `[1, 2, 3]` | `ArrayExpression` | 数组字面量 |
| `arr[0]` | `MemberExpression` | 成员访问 |
| `obj.name` | `MemberExpression` | 属性访问 |


| 代码 | AST 节点 | 人话 |
| --- | --- | --- |
| `if (...) {}` | `IfStatement` | if 判断 |
| `else {}` | `alternate` | else 分支 |
| `switch (...) {}` | `SwitchStatement` | switch |
| `case 1:` | `SwitchCase` | case 分支 |


| 代码 | AST 节点 | 人话 |
| --- | --- | --- |
| `for (...) {}` | `ForStatement` | for 循环 |
| `while (...) {}` | `WhileStatement` | while 循环 |
| `do {} while (...)` | `DoWhileStatement` | do while 循环 |
| `for (const x of arr)` | `ForOfStatement` | for...of |
| `for (const k in obj)` | `ForInStatement` | for...in |
| `break` | `BreakStatement` | 跳出循环 |
| `continue` | `ContinueStatement` | 跳过本轮 |


| 代码 | AST 节点 | 人话 |
| --- | --- | --- |
| `return a` | `ReturnStatement` | 返回语句 |
| `throw err` | `ThrowStatement` | 抛异常 |
| `try {} catch {}` | `TryStatement` | try catch |
| `catch (e) {}` | `CatchClause` | catch 块 |
| `finally {}` | `finalizer` | finally 块 |


| 代码 | AST 节点 | 人话 |
| --- | --- | --- |
| `import React from 'react'` | `ImportDeclaration` | 导入语句 |
| `React` | `ImportDefaultSpecifier` | 默认导入 |
| `import { useState } from 'react'` | `ImportSpecifier` | 命名导入 |
| `export default App` | `ExportDefaultDeclaration` | 默认导出 |
| `export const a = 1` | `ExportNamedDeclaration` | 命名导出 |


| 代码 | AST 节点 | 人话 |
| --- | --- | --- |
| `class User {}` | `ClassDeclaration` | 类声明 |
| `constructor() {}` | `ClassMethod` | 构造函数 |
| `say() {}` | `ClassMethod` | 类方法 |
| `static create() {}` | `ClassMethod + static` | 静态方法 |
| `#name` | `PrivateName` | 私有字段 |
| `class A extends B` | `superClass` | 父类 |


| 代码 | AST 节点 | 人话 |
| --- | --- | --- |
| `<div></div>` | `JSXElement` | JSX 元素 |
| `div` | `JSXIdentifier` | JSX 标签名 |
| `<div id="app" />` | `JSXAttribute` | JSX 属性 |
| `{name}` | `JSXExpressionContainer` | JSX 中的 JS 表达式 |
| `<>...</>` | `JSXFragment` | JSX Fragment |
| `<App />` | `JSXElement` | React 组件调用 |


