// 机构 API 模块 - 提供金融机构和账户凭证管理功能
// Institutions API module - provides financial institution and account credential management functionality

// 导入 GraphQL 客户端 - 用于与 Monarch Money API 进行 GraphQL 查询
import { GraphQLClient } from '../../client/graphql'

/**
 * 金融机构接口
 * 
 * 定义金融机构的基本信息
 */
export interface Institution {
  id: string           // 金融机构唯一标识符
  name: string         // 金融机构名称（如 'Chase'、'Bank of America'）
  url?: string         // 金融机构官网 URL
  logoUrl?: string     // 机构 Logo 图片 URL
  primaryColor?: string // 机构主色调（十六进制颜色码）
}

/**
 * 凭证接口
 * 
 * 表示用户连接到某个金融机构的登录凭据
 * 包含凭据状态和关联的机构信息
 */
export interface Credential {
  id: string                                         // 凭证唯一标识符
  updateRequired: boolean                            // 是否需要更新密码或安全问题
  disconnectedFromDataProviderAt?: string            // 与数据提供商断开连接的时间戳
  displayLastUpdatedAt?: string                      // 显示的最后更新时间
  dataProvider: string                               // 数据提供商名称（如 'plaid'）
  institution: {                                     // 关联的金融机构信息
    id: string                                       // 机构 ID
    name: string                                     // 机构名称
    url: string                                      // 机构官网 URL
  } | null                                           // 可能为 null（如果机构信息不可用）
}

/**
 * 机构设置接口
 * 
 * 包含用户的所有金融机构设置
 * 包括凭证、账户和订阅信息
 */
export interface InstitutionSettings {
  credentials: Credential[]                                             // 所有凭证列表
  accounts: Array<{                                                     // 所有账户列表（包括已删除的）
    id: string                                                          // 账户唯一标识符
    displayName: string                                                 // 账户显示名称
    subtype?: {                                                         // 账户子类型
      display: string                                                   // 子类型显示名称（如 'checking'、'savings'）
    }
    mask?: string                                                       // 账户号码后四位
    credential: {                                                       // 关联的凭证
      id: string                                                        // 凭证 ID
    }
    deletedAt?: string                                                  // 账户删除时间（如果已删除）
  }>
  subscription: {                                                       // 订阅信息
    isOnFreeTrial: boolean                                              // 是否在免费试用期间
    hasPremiumEntitlement: boolean                                       // 是否有高级订阅权限
  }
}

/**
 * 机构 API 接口
 * 
 * 定义金融机构管理的所有操作方法
 * 包含以下功能：
 * - 获取所有可用的金融机构列表
 * - 获取详细的机构设置（包括凭证和关联账户）
 */
export interface InstitutionsAPI {
  /**
   * 获取所有可用的金融机构
   * 
   * 返回用户已连接的所有金融机构列表
   * 金融机构信息从凭证中提取
   * 
   * @returns 金融机构数组
   */
  getInstitutions(): Promise<Institution[]>

  /**
   * 获取详细的机构设置（包括凭证和关联账户）
   * 
   * 返回完整的机构设置信息
   * 包含所有凭证、账户和订阅状态的详细信息
   * 
   * @returns 机构设置对象
   */
  getInstitutionSettings(): Promise<InstitutionSettings>
}

/**
 * 机构 API 实现类
 * 
 * 实现了 InstitutionsAPI 接口的所有方法
 * 使用 GraphQL 与 Monarch Money API 进行通信
 */
export class InstitutionsAPIImpl implements InstitutionsAPI {
  // 构造函数 - 注入 GraphQL 客户端
  constructor(private graphql: GraphQLClient) {}

  /**
   * 获取所有可用的金融机构
   * 
   * @returns 金融机构数组
   */
  async getInstitutions(): Promise<Institution[]> {
    // FIXED: 由于 'institutions' 字段不存在，从凭证中提取
    // 优雅地处理用户没有机构数据的情况
    const query = `
      query {
        credentials {
          id
          institution {
            id
            name
            url
            __typename
          }
          __typename
        }
      }
    `

    // 执行 GraphQL 查询
    const result = await this.graphql.query<{ 
      credentials: Array<{ 
        institution: Institution | null
      }> 
    }>(query)
    
    // 从凭证中提取唯一的金融机构（处理空机构的情况）
    const institutionsMap = new Map<string, Institution>()
    result.credentials.forEach(cred => {
      if (cred.institution && cred.institution.id) {
        institutionsMap.set(cred.institution.id, cred.institution)
      }
    })
    
    // 返回去重后的金融机构数组
    return Array.from(institutionsMap.values())
  }

  /**
   * 获取详细的机构设置（包括凭证和关联账户）
   * 
   * @returns 机构设置对象
   */
  async getInstitutionSettings(): Promise<InstitutionSettings> {
    // FIXED: 使用精确的 Python 片段结构
    const query = `
      query Web_GetInstitutionSettings {
        credentials {
          id
          updateRequired
          disconnectedFromDataProviderAt
          displayLastUpdatedAt
          dataProvider
          institution {
            id
            name
            url
            __typename
          }
          __typename
        }
        accounts(filters: {includeDeleted: true}) {
          id
          displayName
          subtype {
            display
            __typename
          }
          mask
          credential {
            id
            __typename
          }
          deletedAt
          __typename
        }
        subscription {
          isOnFreeTrial
          hasPremiumEntitlement
          __typename
        }
      }
    `

    // 执行 GraphQL 查询并返回结果
    const result = await this.graphql.query<InstitutionSettings>(query)
    return result
  }
}