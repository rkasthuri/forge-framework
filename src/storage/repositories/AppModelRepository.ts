import { getDb } from '../db'
import { AppModel, NewAppModel } from '../types'

export class AppModelRepository {

  async upsert(model: NewAppModel): Promise<AppModel> {
    const db = getDb()
    await db.updateTable('app_models')
      .set({ status: 'superseded' })
      .where('app_name', '=', model.app_name)
      .where('status', '=', 'active')
      .execute()

    return db.insertInto('app_models')
      .values(model)
      .returningAll()
      .executeTakeFirstOrThrow()
  }

  async findActive(appName: string): Promise<AppModel | null> {
    const db = getDb()
    const result = await db.selectFrom('app_models')
      .selectAll()
      .where('app_name', '=', appName)
      .where('status', '=', 'active')
      .executeTakeFirst()
    return result ?? null
  }

  async findHistory(appName: string): Promise<AppModel[]> {
    const db = getDb()
    return db.selectFrom('app_models')
      .selectAll()
      .where('app_name', '=', appName)
      .orderBy('crawled_at', 'desc')
      .execute()
  }

  async markStale(appName: string): Promise<void> {
    const db = getDb()
    await db.updateTable('app_models')
      .set({ status: 'stale' })
      .where('app_name', '=', appName)
      .where('status', '=', 'active')
      .execute()
  }

  async findAll(): Promise<AppModel[]> {
    const db = getDb()
    return db.selectFrom('app_models')
      .selectAll()
      .where('status', '=', 'active')
      .orderBy('crawled_at', 'desc')
      .execute()
  }

  async getModelJson(appName: string): Promise<Record<string, unknown> | null> {
    const model = await this.findActive(appName)
    if (!model) return null
    try {
      return JSON.parse(model.model_json)
    } catch {
      return null
    }
  }
}
