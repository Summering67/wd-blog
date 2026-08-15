# Express 后端开发入门指南

这份文档面向已经会前端的工程师。你可以把后端理解成：前端发起请求，后端接住请求，处理业务，然后把结果返回给前端。

Express 是 Node.js 生态里最常用的 Web 框架之一。它不替你规定太多目录结构和写法，核心能力很清晰：定义接口、读取请求、返回响应、组织中间件。

## 1. 后端到底在做什么

前端常见工作是：

```js
const res = await fetch('/api/users')
const data = await res.json()
```

后端对应做的事情是：

```js
app.get('/api/users', (req, res) => {
  res.json([{ id: 1, name: '小明' }])
})
```

两边连接起来就是：

```text
浏览器页面 -> 发 HTTP 请求 -> Express 接收请求 -> 处理数据 -> 返回 JSON -> 前端渲染页面
```

所以学习 Express，重点不是背 API，而是掌握这几个问题：

- 请求从哪里来
- 参数放在哪里
- 后端怎么处理
- 响应怎么返回
- 错误怎么处理

## 2. 最小 Express 服务

先看一个最小可用版本：

```js
import express from 'express'

const app = express()
const port = 3000

app.get('/', (req, res) => {
  res.send('Hello Express')
})

app.listen(port, () => {
  console.log(`服务已启动：http://localhost:${port}`)
})
```

如果你熟悉前端，可以这样类比：

- `express()`：创建一个后端应用
- `app.get()`：定义一个 GET 接口
- `req`：前端发来的请求信息
- `res`：后端要返回给前端的响应
- `app.listen()`：启动服务，开始监听请求

## 3. 推荐的入门目录结构

刚开始不需要复杂架构，建议这样组织：

```text
express-demo
├─ package.json
└─ src
   ├─ app.js
   └─ routes
      └─ todo.js
```

`src/app.js` 负责创建应用和挂载路由：

```js
import express from 'express'
import todoRouter from './routes/todo.js'

const app = express()
const port = 3000

app.use(express.json())
app.use('/api/todos', todoRouter)

app.listen(port, () => {
  console.log(`服务已启动：http://localhost:${port}`)
})
```

`src/routes/todo.js` 负责具体接口：

```js
import { Router } from 'express'

const router = Router()

router.get('/', (req, res) => {
  res.json([{ id: 1, title: '学习 Express', done: false }])
})

export default router
```

## 4. 请求方法和业务动作

HTTP 方法可以理解成“这次请求想做什么”：

| 方法 | 常见含义 | 示例接口 |
| --- | --- | --- |
| GET | 查询数据 | `GET /api/todos` |
| POST | 新增数据 | `POST /api/todos` |
| PUT | 整体更新 | `PUT /api/todos/1` |
| PATCH | 局部更新 | `PATCH /api/todos/1` |
| DELETE | 删除数据 | `DELETE /api/todos/1` |

Express 里对应写法：

```js
router.get('/', (req, res) => {
  res.json({ message: '查询列表' })
})

router.post('/', (req, res) => {
  res.json({ message: '新增数据' })
})

router.patch('/:id', (req, res) => {
  res.json({ message: `更新 ${req.params.id}` })
})

router.delete('/:id', (req, res) => {
  res.json({ message: `删除 ${req.params.id}` })
})
```

## 5. 三种常见参数

后端读取参数主要看它在请求里的位置。

### 5.1 路径参数：req.params

适合表达“某一个资源”。

```js
router.get('/:id', (req, res) => {
  const { id } = req.params

  res.json({ id, title: `Todo ${id}` })
})
```

请求示例：

```text
GET /api/todos/1
```

### 5.2 查询参数：req.query

适合列表筛选、分页、搜索。

```js
router.get('/', (req, res) => {
  const { keyword = '', page = '1' } = req.query

  res.json({
    keyword,
    page: Number(page),
    list: []
  })
})
```

请求示例：

```text
GET /api/todos?keyword=express&page=1
```

### 5.3 请求体：req.body

适合新增或修改数据。

```js
router.post('/', (req, res) => {
  const { title } = req.body

  if (!title) return res.status(400).json({ message: 'title 不能为空' })

  res.status(201).json({
    id: Date.now(),
    title,
    done: false
  })
})
```

注意：想读取 `req.body`，必须先在 `app.js` 里加：

```js
app.use(express.json())
```

## 6. 响应：后端怎么返回数据

最常用的是 `res.json()`：

```js
router.get('/profile', (req, res) => {
  res.json({
    id: 1,
    name: '小明'
  })
})
```

设置状态码：

```js
router.post('/users', (req, res) => {
  res.status(201).json({ message: '创建成功' })
})
```

常见状态码：

| 状态码 | 含义 |
| --- | --- |
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未登录 |
| 403 | 没权限 |
| 404 | 资源不存在 |
| 500 | 服务端错误 |

建议统一返回 JSON：

```js
res.json({
  data: [],
  message: 'success'
})
```

错误时：

```js
res.status(400).json({
  message: '参数错误'
})
```

## 7. 中间件是什么

中间件就是请求正式进入接口前，会经过的一层层函数。

```text
请求 -> 日志中间件 -> JSON 解析中间件 -> 鉴权中间件 -> 路由处理函数 -> 响应
```

一个简单日志中间件：

```js
const logger = (req, res, next) => {
  console.log(`${req.method} ${req.url}`)
  next()
}

app.use(logger)
```

关键点：

- 中间件也是函数
- `req` 和 `res` 可以继续往后传
- 调用 `next()` 才会进入下一个处理环节
- 如果已经返回响应，就不要再调用 `next()`

### 鉴权中间件示例

```js
const auth = (req, res, next) => {
  const token = req.headers.authorization

  if (!token) return res.status(401).json({ message: '请先登录' })

  next()
}

router.get('/me', auth, (req, res) => {
  res.json({ id: 1, name: '小明' })
})
```

这段代码的意思是：访问 `/me` 前，必须先经过 `auth`。

## 8. 错误处理

接口里可能出现异常，比如数据库查询失败、参数格式不正确、代码运行报错。

Express 可以用统一错误处理中间件兜底：

```js
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ message: '服务器内部错误' })
})
```

如果在异步接口中捕获错误，可以传给 `next`：

```js
router.get('/error-demo', async (req, res, next) => {
  try {
    await Promise.reject(new Error('模拟错误'))
    res.json({ message: '不会执行到这里' })
  } catch (error) {
    next(error)
  }
})
```

实际开发中，参数不对要提前 return：

```js
router.get('/:id', (req, res) => {
  const id = Number(req.params.id)

  if (!Number.isInteger(id)) return res.status(400).json({ message: 'id 必须是数字' })

  res.json({ id })
})
```

## 9. 前端如何调用 Express 接口

查询列表：

```js
const getTodos = async () => {
  const res = await fetch('/api/todos')
  return res.json()
}
```

新增数据：

```js
const createTodo = async (title) => {
  const res = await fetch('/api/todos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title })
  })

  return res.json()
}
```

处理错误：

```js
const request = async (url, options) => {
  const res = await fetch(url, options)
  const data = await res.json()

  if (!res.ok) throw new Error(data.message || '请求失败')

  return data
}
```

## 10. 跨域问题

如果前端运行在 `http://localhost:5173`，后端运行在 `http://localhost:3000`，浏览器会认为它们不是同一个源，可能出现跨域问题。

常见处理方式是使用 `cors`：

```js
import cors from 'cors'

app.use(cors())
```

更严格一点可以指定来源：

```js
app.use(cors({
  origin: 'http://localhost:5173'
}))
```

跨域是浏览器限制，不是 Express 本身拒绝请求。

## 11. Todo API 小实战

下面是一个不依赖数据库的 Todo API，数据存在内存里，适合理解 Express 基础流程。

`src/routes/todo.js`：

```js
import { Router } from 'express'

const router = Router()

let todos = [
  { id: 1, title: '学习 Express', done: false },
  { id: 2, title: '写一个 Todo API', done: false }
]

const findTodo = (id) => todos.find((todo) => todo.id === Number(id))

router.get('/', (req, res) => {
  const { keyword = '' } = req.query
  const list = keyword ? todos.filter((todo) => todo.title.includes(keyword)) : todos

  res.json({ data: list })
})

router.get('/:id', (req, res) => {
  const todo = findTodo(req.params.id)

  if (!todo) return res.status(404).json({ message: 'Todo 不存在' })

  res.json({ data: todo })
})

router.post('/', (req, res) => {
  const { title } = req.body

  if (!title) return res.status(400).json({ message: 'title 不能为空' })

  const todo = { id: Date.now(), title, done: false }
  todos = [todo, ...todos]

  res.status(201).json({ data: todo })
})

router.patch('/:id', (req, res) => {
  const todo = findTodo(req.params.id)

  if (!todo) return res.status(404).json({ message: 'Todo 不存在' })

  const nextTodo = { ...todo, ...req.body, id: todo.id }
  todos = todos.map((item) => item.id === todo.id ? nextTodo : item)

  res.json({ data: nextTodo })
})

router.delete('/:id', (req, res) => {
  const todo = findTodo(req.params.id)

  if (!todo) return res.status(404).json({ message: 'Todo 不存在' })

  todos = todos.filter((item) => item.id !== todo.id)

  res.json({ message: '删除成功' })
})

export default router
```

`src/app.js`：

```js
import express from 'express'
import cors from 'cors'
import todoRouter from './routes/todo.js'

const app = express()
const port = 3000

app.use(cors())
app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/todos', todoRouter)

app.use((req, res) => {
  res.status(404).json({ message: '接口不存在' })
})

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ message: '服务器内部错误' })
})

app.listen(port, () => {
  console.log(`服务已启动：http://localhost:${port}`)
})
```

前端调用示例：

```js
const api = 'http://localhost:3000/api/todos'

const getTodos = async () => {
  const res = await fetch(api)
  const result = await res.json()
  return result.data
}

const addTodo = async (title) => {
  const res = await fetch(api, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title })
  })

  const result = await res.json()
  return result.data
}
```

## 12. Express 开发思维

写 Express 接口时，建议按这个顺序想：

```text
1. 这个接口的路径是什么？
2. 用什么 HTTP 方法？
3. 参数从 params、query 还是 body 来？
4. 参数不合法时怎么提前返回？
5. 正常情况下返回什么 JSON？
6. 找不到资源时返回什么？
7. 异常时有没有统一兜底？
```

例如新增 Todo：

```text
路径：POST /api/todos
参数：body.title
校验：title 不能为空
成功：201 + 新创建的 todo
失败：400 + 错误信息
```

对应代码：

```js
router.post('/', (req, res) => {
  const { title } = req.body

  if (!title) return res.status(400).json({ message: 'title 不能为空' })

  const todo = { id: Date.now(), title, done: false }

  res.status(201).json({ data: todo })
})
```

## 13. 常见坑

### 忘记加 express.json()

现象：`req.body` 是 `undefined`。

解决：

```js
app.use(express.json())
```

### 路由顺序不对

Express 会从上往下匹配路由。更具体的路由应该放在更前面。

```js
router.get('/search', (req, res) => {
  res.json({ message: '搜索' })
})

router.get('/:id', (req, res) => {
  res.json({ id: req.params.id })
})
```

如果把 `/:id` 放在 `/search` 前面，`/search` 可能会被当成 id。

### 接口返回两次响应

错误写法：

```js
router.get('/:id', (req, res) => {
  const todo = null

  if (!todo) res.status(404).json({ message: '不存在' })

  res.json({ data: todo })
})
```

正确写法：

```js
router.get('/:id', (req, res) => {
  const todo = null

  if (!todo) return res.status(404).json({ message: '不存在' })

  res.json({ data: todo })
})
```

## 14. 学完后应该掌握什么

学完这份文档后，你应该能做到：

- 搭建一个最小 Express 服务
- 写 GET、POST、PATCH、DELETE 接口
- 读取 params、query、body
- 返回统一 JSON 响应
- 使用中间件处理日志、JSON、鉴权、错误
- 知道前端如何调用后端接口
- 能独立写出一个简单 Todo API

Express 的核心并不复杂。真正的后端能力，后续会逐渐扩展到数据库、登录鉴权、文件上传、权限设计、缓存、队列、部署和监控。但第一步，就是先把“请求进来，响应出去”这条链路写熟。
