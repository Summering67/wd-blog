# Express 后端开发进阶指南

这份文档承接《Express 后端开发入门指南》。入门阶段重点是把“请求进来，响应出去”写熟；进阶阶段要开始解决真实项目里的问题：数据存哪里、用户怎么登录、接口怎么限制权限、文件怎么上传、系统怎么抗住更多请求、线上出了问题怎么排查。

你可以把后端进阶能力理解成一条完整链路：

```text
请求进入 -> 鉴权 -> 权限判断 -> 业务处理 -> 数据库读写 -> 缓存加速 -> 异步任务入队 -> 返回响应 -> 监控记录
```

## 1. 进阶项目推荐结构

入门项目可以把逻辑都写在路由里，但真实项目建议拆开：

```text
src
├─ app.js
├─ config
│  └─ env.js
├─ db
│  └─ prisma.js
├─ middlewares
│  ├─ auth.js
│  ├─ error.js
│  └─ upload.js
├─ routes
│  ├─ auth.js
│  ├─ user.js
│  └─ file.js
├─ services
│  ├─ authService.js
│  └─ userService.js
└─ utils
   ├─ jwt.js
   └─ password.js
```

职责建议：

| 目录 | 负责什么 |
| --- | --- |
| `routes` | 接收请求、读取参数、返回响应 |
| `services` | 写业务逻辑 |
| `middlewares` | 鉴权、错误处理、上传处理 |
| `db` | 数据库连接 |
| `utils` | 通用工具函数 |
| `config` | 环境变量和配置 |

核心原则：路由层不要堆太多业务逻辑。

## 2. 数据库

后端不能只把数据放在内存里，因为服务重启后内存数据会消失。真实项目通常用数据库持久化数据。

常见选择：

| 数据库 | 特点 | 适合场景 |
| --- | --- | --- |
| MySQL | 稳定、成熟、使用广 | 大部分业务系统 |
| PostgreSQL | 功能强、类型丰富 | 中大型业务、复杂查询 |
| MongoDB | 文档型、结构灵活 | 内容系统、快速原型 |
| Redis | 内存数据库，速度快 | 缓存、验证码、限流 |

如果是 Node.js 项目，推荐先用 ORM。ORM 可以把数据库表映射成 JavaScript 对象，减少手写 SQL。

常见 ORM：

- Prisma：类型友好，适合现代 Node.js 项目
- Sequelize：老牌 ORM，资料多
- TypeORM：常见于 TypeScript 项目

### Prisma 基础示例

`prisma/schema.prisma`：

```prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  password  String
  name      String?
  role      String   @default("user")
  createdAt DateTime @default(now())
}
```

创建数据库连接：

```js
import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient()
```

查询用户：

```js
import { prisma } from '../db/prisma.js'

export const getUserById = async (id) => {
  if (!id) return null

  return prisma.user.findUnique({
    where: { id: Number(id) }
  })
}
```

新增用户：

```js
export const createUser = async ({ email, password, name }) => {
  if (!email || !password) return null

  return prisma.user.create({
    data: { email, password, name }
  })
}
```

### 路由中调用 service

```js
router.get('/:id', async (req, res, next) => {
  try {
    const user = await getUserById(req.params.id)

    if (!user) return res.status(404).json({ message: '用户不存在' })

    res.json({ data: user })
  } catch (error) {
    next(error)
  }
})
```

## 3. 登录鉴权

登录鉴权要解决两个问题：

```text
你是谁？ -> 认证 Authentication
你能做什么？ -> 授权 Authorization
```

常见登录流程：

```text
用户提交邮箱和密码
后端查询用户
后端校验密码
后端生成 token
前端保存 token
前端每次请求带上 token
后端解析 token，识别当前用户
```

### 密码不能明文存

错误做法：

```js
await prisma.user.create({
  data: { email, password: '123456' }
})
```

正确做法：存加密后的 hash。

```js
import bcrypt from 'bcryptjs'

export const hashPassword = (password) => {
  if (!password) return ''

  return bcrypt.hash(password, 10)
}

export const comparePassword = (password, hashedPassword) => {
  if (!password || !hashedPassword) return false

  return bcrypt.compare(password, hashedPassword)
}
```

### JWT 登录示例

生成 token：

```js
import jwt from 'jsonwebtoken'

const secret = process.env.JWT_SECRET

export const signToken = (payload) => {
  if (!payload || !secret) return ''

  return jwt.sign(payload, secret, { expiresIn: '7d' })
}
```

注册接口：

```js
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, name } = req.body

    if (!email || !password) return res.status(400).json({ message: '邮箱和密码不能为空' })

    const exists = await prisma.user.findUnique({ where: { email } })

    if (exists) return res.status(409).json({ message: '邮箱已注册' })

    const hashedPassword = await hashPassword(password)
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name }
    })

    res.status(201).json({
      data: { id: user.id, email: user.email, name: user.name }
    })
  } catch (error) {
    next(error)
  }
})
```

登录接口：

```js
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body

    if (!email || !password) return res.status(400).json({ message: '邮箱和密码不能为空' })

    const user = await prisma.user.findUnique({ where: { email } })

    if (!user) return res.status(401).json({ message: '账号或密码错误' })

    const matched = await comparePassword(password, user.password)

    if (!matched) return res.status(401).json({ message: '账号或密码错误' })

    const token = signToken({ id: user.id, role: user.role })

    res.json({
      data: {
        token,
        user: { id: user.id, email: user.email, name: user.name, role: user.role }
      }
    })
  } catch (error) {
    next(error)
  }
})
```

### 鉴权中间件

```js
import jwt from 'jsonwebtoken'
import { prisma } from '../db/prisma.js'

export const auth = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization

    if (!authorization) return res.status(401).json({ message: '请先登录' })

    const token = authorization.replace('Bearer ', '')
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    const user = await prisma.user.findUnique({ where: { id: payload.id } })

    if (!user) return res.status(401).json({ message: '登录状态已失效' })

    req.user = user
    next()
  } catch (error) {
    res.status(401).json({ message: '登录状态已失效' })
  }
}
```

前端请求时带上 token：

```js
const res = await fetch('/api/users/me', {
  headers: {
    Authorization: `Bearer ${token}`
  }
})
```

## 4. 权限设计

登录只能证明“你是谁”，权限决定“你能访问什么”。

最常见的是角色权限：

| 角色 | 能做什么 |
| --- | --- |
| `admin` | 管理所有数据 |
| `editor` | 创建和编辑内容 |
| `user` | 查看自己的数据 |

### 角色鉴权中间件

```js
export const allowRoles = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: '请先登录' })

  if (!roles.includes(req.user.role)) return res.status(403).json({ message: '没有权限' })

  next()
}
```

使用方式：

```js
router.delete('/users/:id', auth, allowRoles('admin'), async (req, res, next) => {
  try {
    await prisma.user.delete({
      where: { id: Number(req.params.id) }
    })

    res.json({ message: '删除成功' })
  } catch (error) {
    next(error)
  }
})
```

### 数据归属权限

很多业务不是只看角色，还要看数据是不是自己的。

```js
router.get('/orders/:id', auth, async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: Number(req.params.id) }
    })

    if (!order) return res.status(404).json({ message: '订单不存在' })

    if (order.userId !== req.user.id) return res.status(403).json({ message: '没有权限' })

    res.json({ data: order })
  } catch (error) {
    next(error)
  }
})
```

权限设计建议：

- 先做角色权限，再做细粒度权限
- 管理员能力要谨慎开放
- 修改和删除接口必须做权限校验
- 前端隐藏按钮不是权限控制，后端必须判断

## 5. 文件上传

文件上传本质是：前端用 `FormData` 发送文件，后端解析文件并保存。

常见保存位置：

| 保存方式 | 特点 |
| --- | --- |
| 本地磁盘 | 简单，适合学习和内网项目 |
| 对象存储 | 适合生产环境，比如 OSS、S3、COS |
| 数据库存二进制 | 不推荐，容易让数据库变大 |

### 使用 multer 上传文件

上传中间件：

```js
import multer from 'multer'

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/')
  },
  filename: (req, file, cb) => {
    const filename = `${Date.now()}-${file.originalname}`

    cb(null, filename)
  }
})

export const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 5 }
})
```

上传接口：

```js
router.post('/avatar', auth, upload.single('avatar'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: '请选择文件' })

  res.json({
    data: {
      filename: req.file.filename,
      url: `/uploads/${req.file.filename}`
    }
  })
})
```

前端调用：

```js
const uploadAvatar = async (file, token) => {
  const formData = new FormData()
  formData.append('avatar', file)

  const res = await fetch('/api/files/avatar', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  })

  return res.json()
}
```

注意：上传文件时不要手动设置 `Content-Type`，浏览器会自动处理。

### 文件上传安全建议

- 限制文件大小
- 限制文件类型
- 文件名不要直接信任用户输入
- 私密文件不要直接暴露静态访问路径
- 生产环境优先上传到对象存储

限制文件类型示例：

```js
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']

  if (!allowedTypes.includes(file.mimetype)) return cb(new Error('只允许上传图片'))

  cb(null, true)
}
```

## 6. 缓存

缓存是为了减少重复计算和重复查询。最常见的是 Redis。

适合缓存的数据：

- 首页配置
- 热门列表
- 用户权限
- 短时间不会频繁变化的数据
- 验证码和短信码

不适合缓存的数据：

- 强实时余额
- 高频变化库存
- 刚写入后马上要绝对一致的数据

### Redis 基础使用

```js
import { createClient } from 'redis'

export const redis = createClient({
  url: process.env.REDIS_URL
})

redis.on('error', (error) => {
  console.error('Redis 错误', error)
})

await redis.connect()
```

查询列表时先读缓存：

```js
router.get('/hot', async (req, res, next) => {
  try {
    const cacheKey = 'articles:hot'
    const cached = await redis.get(cacheKey)

    if (cached) return res.json({ data: JSON.parse(cached), fromCache: true })

    const articles = await prisma.article.findMany({
      orderBy: { viewCount: 'desc' },
      take: 10
    })

    await redis.set(cacheKey, JSON.stringify(articles), { EX: 60 })

    res.json({ data: articles, fromCache: false })
  } catch (error) {
    next(error)
  }
})
```

缓存常见策略：

| 策略 | 说明 |
| --- | --- |
| 过期时间 | 设置 TTL，到期自动失效 |
| 主动删除 | 数据更新后删除对应缓存 |
| 缓存空值 | 避免不存在的数据被反复查询 |
| key 规范 | 用清晰前缀区分业务 |

更新数据后删除缓存：

```js
router.patch('/articles/:id', auth, async (req, res, next) => {
  try {
    const article = await prisma.article.update({
      where: { id: Number(req.params.id) },
      data: req.body
    })

    await redis.del('articles:hot')

    res.json({ data: article })
  } catch (error) {
    next(error)
  }
})
```

## 7. 队列

队列用来处理不适合阻塞接口响应的任务。

适合放进队列的任务：

- 发送邮件
- 发送短信
- 图片压缩
- 视频转码
- 生成报表
- 同步第三方系统

不使用队列：

```text
用户注册 -> 后端发送邮件 -> 邮件服务慢 -> 用户一直等
```

使用队列：

```text
用户注册 -> 写入数据库 -> 投递邮件任务 -> 立即返回 -> worker 后台发送邮件
```

### 使用 BullMQ

创建队列：

```js
import { Queue } from 'bullmq'

export const emailQueue = new Queue('email', {
  connection: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT)
  }
})
```

接口里投递任务：

```js
router.post('/register', async (req, res, next) => {
  try {
    const { email, password } = req.body

    if (!email || !password) return res.status(400).json({ message: '邮箱和密码不能为空' })

    const user = await createUser({ email, password })

    await emailQueue.add('welcome', {
      userId: user.id,
      email: user.email
    })

    res.status(201).json({ data: user })
  } catch (error) {
    next(error)
  }
})
```

后台 worker：

```js
import { Worker } from 'bullmq'

export const emailWorker = new Worker('email', async (job) => {
  const { email } = job.data

  await sendEmail({
    to: email,
    subject: '欢迎注册',
    text: '欢迎使用我们的产品'
  })
}, {
  connection: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT)
  }
})
```

队列设计建议：

- 任务必须可以重试
- 任务数据不要太大
- 失败原因要记录
- 重要任务要有告警
- worker 和 API 服务可以分开部署

## 8. 部署

本地开发时，服务跑在你的电脑上；部署是把服务放到线上服务器，让真实用户访问。

部署前必须准备：

- 环境变量
- 数据库地址
- Redis 地址
- 静态文件或对象存储配置
- 日志输出
- 进程守护

### 环境变量

不要把密钥写死在代码里：

```js
export const env = {
  port: Number(process.env.PORT || 3000),
  jwtSecret: process.env.JWT_SECRET,
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL
}
```

启动时检查关键配置：

```js
const requiredEnvs = ['JWT_SECRET', 'DATABASE_URL']

requiredEnvs.forEach((key) => {
  if (!process.env[key]) throw new Error(`缺少环境变量：${key}`)
})
```

### 常见部署方式

| 方式 | 说明 |
| --- | --- |
| PM2 | 简单部署 Node.js 服务 |
| Docker | 环境一致，适合团队和生产 |
| 云函数 | 适合轻量接口 |
| Kubernetes | 适合复杂微服务 |

### PM2 思路

PM2 的作用是守护 Node.js 进程。服务崩了，它可以自动拉起。

常见配置文件：

```js
export default {
  apps: [
    {
      name: 'express-api',
      script: 'src/app.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
}
```

### Nginx 反向代理

生产环境通常不会直接暴露 Node.js 端口，而是让 Nginx 接收外部请求，再转发给 Node.js。

```text
用户 -> Nginx:80/443 -> Express:3000
```

这样可以统一处理：

- HTTPS
- 域名绑定
- 静态资源
- 反向代理
- 请求体大小限制

## 9. 监控和日志

线上系统最怕的是：用户已经报错了，后端却不知道发生了什么。

至少要关注：

- 接口是否报错
- 接口耗时是否变长
- CPU 和内存是否异常
- 数据库连接是否正常
- 队列任务是否堆积
- 磁盘是否快满

### 请求日志

```js
const requestLogger = (req, res, next) => {
  const start = Date.now()

  res.on('finish', () => {
    console.log({
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: Date.now() - start
    })
  })

  next()
}
```

### 统一错误日志

```js
export const errorHandler = (err, req, res, next) => {
  console.error({
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    userId: req.user?.id
  })

  res.status(500).json({ message: '服务器内部错误' })
}
```

### 健康检查接口

健康检查用于告诉部署平台：服务是否还活着。

```js
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString()
  })
})
```

更完整的健康检查可以检查数据库：

```js
router.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`

    res.json({ status: 'ok' })
  } catch (error) {
    res.status(503).json({ status: 'error' })
  }
})
```

### 常见监控工具

| 工具 | 用途 |
| --- | --- |
| Sentry | 错误收集 |
| Prometheus | 指标采集 |
| Grafana | 指标可视化 |
| ELK | 日志收集和搜索 |
| 云厂商监控 | CPU、内存、磁盘、网络 |

## 10. 一个更真实的请求流程

假设用户上传头像：

```text
前端选择文件
前端携带 token 和 FormData 请求后端
后端 auth 中间件解析 token
后端确认用户存在
upload 中间件解析文件
后端校验文件大小和类型
后端上传到对象存储或保存本地
后端把文件地址写入数据库
后端删除用户信息缓存
后端返回新的头像地址
日志记录接口耗时
异常时进入错误处理中间件
```

对应接口伪代码：

```js
router.post('/me/avatar', auth, upload.single('avatar'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: '请选择头像' })

    const avatarUrl = `/uploads/${req.file.filename}`
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatarUrl }
    })

    await redis.del(`user:${req.user.id}`)

    res.json({
      data: {
        id: user.id,
        avatarUrl: user.avatarUrl
      }
    })
  } catch (error) {
    next(error)
  }
})
```

## 11. 后端进阶学习路线

建议按这个顺序练习：

```text
1. 用 Prisma 接入数据库，完成用户表和 Todo 表
2. 做注册、登录、获取当前用户接口
3. 用 JWT 保护 Todo 接口
4. 增加角色权限，比如 admin 才能删除用户
5. 增加头像上传
6. 用 Redis 缓存用户信息或热门列表
7. 用队列异步发送欢迎邮件
8. 增加请求日志、错误日志、健康检查
9. 部署到一台服务器
10. 接入错误监控
```

每一步都应该能回答：

- 前端怎么请求
- 后端怎么接参数
- 数据库怎么变化
- 失败时返回什么
- 是否需要权限
- 是否需要日志

## 12. 真实项目里的底线

下面这些不是优化，而是后端项目的底线：

- 密码必须 hash 后存储
- 登录态必须有过期时间
- 修改和删除接口必须校验权限
- 用户输入必须校验
- 文件上传必须限制大小和类型
- 密钥必须使用环境变量
- 线上必须有日志
- 关键错误必须能被监控发现
- 数据库和 Redis 连接失败要有兜底
- 不要把详细错误堆栈返回给前端

前端工程师学习后端时，最容易忽略的是“信任边界”。前端传来的所有内容都不可信，包括用户 id、角色、价格、订单状态、文件类型。后端必须自己校验，不能只相信前端页面上的限制。

## 13. 最终应该具备的能力

学完这份进阶文档后，你应该能理解并实现：

- 使用数据库保存业务数据
- 用 JWT 完成登录鉴权
- 用中间件保护接口
- 基于角色和数据归属做权限判断
- 支持文件上传并处理基础安全限制
- 用 Redis 做缓存
- 用队列处理异步任务
- 理解部署时需要准备什么
- 增加日志、健康检查和基础监控

到这里，你已经不只是会写 Express 接口，而是开始具备完整后端工程意识。继续往后学，重点就会变成：建模能力、系统设计、性能优化、安全攻防、可观测性和稳定性治理。
