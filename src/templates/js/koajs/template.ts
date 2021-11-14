/**
 * [[code]]/[[name]] [[nameLocale]]子路由/控制器模块
 *
 * 实现基础CRUD功能，并可扩展其它功能
 *
 * ORM
 * https://www.prisma.io/docs/concepts/components/prisma-client/crud
 *
 * 路由
 * https://github.com/koajs/router/blob/master/API.md
 * import [[name]] from './[[name]]'
 * Router.use('/[[name]]', [[name]].routes(), [[name]].allowedMethods())
 *
 * author: Kamas Lau<kamaslau@dingtalk.com>
 */
import KoaRouter from '@koa/router'
import Basic from '../controllers/utils'
import BasicTypes from '../../types'
import BasicModel from '../models/basic'
const Router = new KoaRouter()

// 基础配置
const routeCode: string = '[[code]]' // 路由编码
const modelName: string = '[[name]]' // 模块名称
const modelNameLocale: string = '[[nameLocale]]' // 模块本地化名称
const pkName: string = '[[pk]]' // 相关数据表主键名

// 可排序字段
const defaultSorter = { ...Basic.defaultSorter }
const allowedSorters = ['name', ...Object.keys(defaultSorter)]
// console.log(`${routeCode} allowedSorters: `, allowedSorters)

/**
 * Get Count
 */
Router.get('/count', async (ctx) => {
  const apiCode = `${routeCode}0` // API编码；仅API功能有此项
  const body: BasicTypes.responseBody = {
    apiCode,
    inputBody: ctx.request.body
  }

  const filter = undefined // 筛选器

  const basicModel = new BasicModel(modelName, ctx) // Init model
  const result = await basicModel.count(filter)
  body.data = result

  ctx.status = typeof result === 'number' ? 200 : 500
  ctx.body = body
})

/**
 * Get List
 */
Router.get('/', async (ctx) => {
  const apiCode = `${routeCode}1`
  const body: BasicTypes.responseBody = {
    apiCode,
    inputBody: ctx.request.body,
    inputQuery: ctx.query
  }

  const sorter =
    ctx.query.sorter?.length > 0
      ? Basic.composeSorter(ctx.query.sorter, allowedSorters)
      : {} // 排序器
  const filter = undefined // 筛选器
  const offset = ctx.query?.offset ? Number(ctx.query.offset) : 0
  const limit = ctx.query?.limit ? Number(ctx.query.limit) : undefined

  const basicModel = new BasicModel(modelName, ctx) // Init model
  const result = await basicModel.findMany(filter, sorter, offset, limit)
  body.data = result

  ctx.status = result.length === 0 ? 404 : 200
  ctx.body = body
})

/**
 * Get by ID
 */
Router.get('/:id', async (ctx) => {
  const apiCode = `${routeCode}2`
  const body: BasicTypes.responseBody = {
    apiCode,
    inputBody: ctx.request.body
  }

  const basicModel = new BasicModel(modelName, ctx) // Init model
  const result = await basicModel.findUnique(pkName, ctx.params.id)
  body.data = result

  ctx.status = result === null ? 404 : 200
  ctx.body = body
})

/**
 * Create
 */
Router.post('/', async (ctx) => {
  const apiCode = `${routeCode}3`
  const body: BasicTypes.responseBody = {
    apiCode,
    inputBody: ctx.request.body
  }

  const createInput = ctx.request.body

  // 操作验证
  // Basic.clientTypeCheck()
  // const user: any = Basic.requireUser(ctx.state?.user?.user_id ?? null)
  // const stuff: any = Basic.requireStuff(user.user_id)
  // Basic.permissionCheck(stuff)
  Basic.namesCheck(createInput)

  const basicModel = new BasicModel(modelName, ctx) // Init model
  const result = await basicModel.create(createInput)

  // 组装响应体
  if (result === null) {
    body.message = '数据写入失败'
    ctx.status = 500
  } else {
    body.data = result
    ctx.status = 200
  }
  ctx.body = body
})

/**
 * Update&Delete
 */
Router.put('/:id', async (ctx) => {
  const apiCode = `${routeCode}4`
  const body: BasicTypes.responseBody = {
    apiCode,
    inputBody: ctx.request.body
  }

  const updateInput = ctx.request.body

  // 操作验证
  // Basic.clientTypeCheck()
  // const user: any = Basic.requireUser(ctx.state?.user?.user_id ?? null)
  // const stuff: any = Basic.requireStuff(user.user_id)
  // Basic.permissionCheck(stuff)
  Basic.namesCheck(updateInput)

  const basicModel = new BasicModel(modelName, ctx) // Init model
  const result = await basicModel.update(updateInput, pkName, +ctx.params.id)

  // 组装响应体
  if (result === null) {
    body.message = '数据更新失败'
    ctx.status = 500
  } else {
    body.data = result
    ctx.status = 200
  }
  ctx.body = body
})

export default Router
