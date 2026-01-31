import { GraphQLClient } from '../../client/graphql'                                                          // 导入GraphQL客户端
import {
  TransactionCategory,                                                                                   // 交易分类类型
  CategoryGroup,                                                                                          // 分类组类型
  TransactionTag,                                                                                         // 交易标签类型
  CreateCategoryInput,                                                                                    // 创建分类输入类型
  UpdateCategoryInput,                                                                                    // 更新分类输入类型
  CreateTagInput,                                                                                         // 创建标签输入类型
  BulkDeleteResult                                                                                        // 批量删除结果类型
} from '../../types'
import { validateRequired, logger } from '../../utils'                                                    // 导入验证和日志工具

/**
 * 分类API接口
 * 
 * 定义交易分类、分类组和标签管理的所有操作方法
 */
export interface CategoriesAPI {
  /**
   * 分类管理
   * 
   * 获取所有交易分类列表
   */
  getCategories(): Promise<TransactionCategory[]>
  
  /**
   * 通过ID获取分类详情
   * 
   * @param categoryId - 分类ID
   * @returns 分类对象
   */
  getCategoryById(categoryId: string): Promise<TransactionCategory>
  
  /**
   * 创建新分类
   * 
   * @param data - 分类创建数据
   * @returns 创建的分类对象
   */
  createCategory(data: CreateCategoryInput): Promise<TransactionCategory>
  
  /**
   * 更新分类
   * 
   * @param categoryId - 分类ID
   * @param data - 更新数据
   * @returns 更新后的分类对象
   */
  updateCategory(categoryId: string, data: UpdateCategoryInput): Promise<TransactionCategory>
  
  /**
   * 删除单个分类
   * 
   * @param categoryId - 分类ID
   * @returns 如果删除成功返回true
   */
  deleteCategory(categoryId: string): Promise<boolean>
  
  /**
   * 批量删除分类
   * 
   * @param categoryIds - 要删除的分类ID数组
   * @returns 批量删除结果
   */
  deleteCategories(categoryIds: string[]): Promise<BulkDeleteResult>

  /**
   * 分类组管理
   * 
   * 获取所有分类组列表
   */
  getCategoryGroups(): Promise<CategoryGroup[]>
  
  /**
   * 通过ID获取分类组详情
   * 
   * @param groupId - 分类组ID
   * @returns 分类组对象
   */
  getCategoryGroupById(groupId: string): Promise<CategoryGroup>

  /**
   * 标签管理
   * 
   * 获取所有交易标签列表
   */
  getTags(): Promise<TransactionTag[]>
  
  /**
   * 通过ID获取标签详情
   * 
   * @param tagId - 标签ID
   * @returns 标签对象
   */
  getTagById(tagId: string): Promise<TransactionTag>
  
  /**
   * 创建新标签
   * 
   * @param data - 标签创建数据
   * @returns 创建的标签对象
   */
  createTag(data: CreateTagInput): Promise<TransactionTag>
  
  /**
   * 更新标签
   * 
   * @param tagId - 标签ID
   * @param data - 更新数据
   * @returns 更新后的标签对象
   */
  updateTag(tagId: string, data: Partial<CreateTagInput>): Promise<TransactionTag>
  
  /**
   * 删除标签
   * 
   * @param tagId - 标签ID
   * @returns 如果删除成功返回true
   */
  deleteTag(tagId: string): Promise<boolean>

  /**
   * 交易标签管理
   * 
   * 为交易设置标签（替换所有现有标签）
   * 
   * @param transactionId - 交易ID
   * @param tagIds - 要设置的标签ID数组
   * @returns 如果设置成功返回true
   */
  setTransactionTags(transactionId: string, tagIds: string[]): Promise<boolean>
  
  /**
   * 为交易添加标签
   * 
   * @param transactionId - 交易ID
   * @param tagId - 要添加的标签ID
   * @returns 如果添加成功返回true
   */
  addTagToTransaction(transactionId: string, tagId: string): Promise<boolean>
  
  /**
   * 从交易移除标签
   * 
   * @param transactionId - 交易ID
   * @param tagId - 要移除的标签ID
   * @returns 如果移除成功返回true
   */
  removeTagFromTransaction(transactionId: string, tagId: string): Promise<boolean>
}

/**
 * 分类API实现类
 * 
 * 实现CategoriesAPI接口的所有方法
 * 负责与Monarch Money GraphQL API进行交互
 */
export class CategoriesAPIImpl implements CategoriesAPI {
  /**
   * 构造函数
   * @param graphql - GraphQL客户端实例
   */
  constructor(private graphql: GraphQLClient) {}

  /**
   * 分类管理方法
   * 
   * 获取所有交易分类
   */
  async getCategories(): Promise<TransactionCategory[]> {
    logger.debug('正在获取所有交易分类')
    
    // 使用Monarch Web应用的精确查询
    const query = `
      query GetCategories {
        categories {
          ...CategoryFields
          __typename
        }
      }

      fragment CategoryFields on Category {
        id
        order
        name
        icon
        systemCategory
        isSystemCategory
        isDisabled
        group {
          id
          name
          type
          __typename
        }
        __typename
      }
    `

    const result = await this.graphql.query<{
      categories: TransactionCategory[]
    }>(query)

    logger.debug(`使用Web应用模式获取了 ${result.categories.length} 个分类`)
    return result.categories || []
  }

  /**
   * 通过ID获取分类详情
   * 
   * 返回分类的完整信息，包括父分类和子分类
   */
  async getCategoryById(categoryId: string): Promise<TransactionCategory> {
    validateRequired({ categoryId })
    logger.debug(`正在获取分类: ${categoryId}`)

    const query = `
      query GetTransactionCategory($categoryId: ID!) {
        transactionCategory(id: $categoryId) {
          id
          name
          displayName
          shortName
          color
          icon
          order
          isDefault
          isDisabled
          isSystemCategory
          groupId
          group {
            id
            name
            displayName
            color
            icon
            order
          }
          parentCategoryId
          parentCategory {
            id
            name
            displayName
          }
          childCategories {
            id
            name
            displayName
            color
            icon
          }
          createdAt
          updatedAt
        }
      }
    `

    const result = await this.graphql.query<{
      transactionCategory: TransactionCategory
    }>(query, { categoryId })

    if (!result.transactionCategory) {
      throw new Error(`未找到分类: ${categoryId}`)
    }

    return result.transactionCategory
  }

  /**
   * 创建新交易分类
   * 
   * 创建一个新的用户自定义分类
   */
  async createCategory(data: CreateCategoryInput): Promise<TransactionCategory> {
    validateRequired({ name: data.name })
    logger.debug(`正在创建交易分类: ${data.name}`)

    const mutation = `
      mutation CreateTransactionCategory($input: CreateTransactionCategoryInput!) {
        createTransactionCategory(input: $input) {
          category {
            id
            name
            displayName
            shortName
            color
            icon
            order
            isDefault
            isDisabled
            isSystemCategory
            groupId
            parentCategoryId
            createdAt
            updatedAt
          }
          errors {
            field
            message
          }
        }
      }
    `

    const result = await this.graphql.mutation<{
      createTransactionCategory: {
        category: TransactionCategory
        errors: Array<{ field: string; message: string }>
      }
    }>(mutation, { input: data })

    if (result.createTransactionCategory.errors?.length > 0) {
      const errorMessages = result.createTransactionCategory.errors.map(e => e.message).join(', ')
      throw new Error(`创建分类失败: ${errorMessages}`)
    }

    return result.createTransactionCategory.category
  }

  /**
   * 更新交易分类
   * 
   * 更新指定分类的属性
   */
  async updateCategory(categoryId: string, data: UpdateCategoryInput): Promise<TransactionCategory> {
    validateRequired({ categoryId })
    logger.debug(`正在更新分类: ${categoryId}`)

    const mutation = `
      mutation UpdateTransactionCategory($categoryId: ID!, $input: UpdateTransactionCategoryInput!) {
        updateTransactionCategory(id: $categoryId, input: $input) {
          category {
            id
            name
            displayName
            shortName
            color
            icon
            order
            isDefault
            isDisabled
            isSystemCategory
            groupId
            parentCategoryId
            createdAt
            updatedAt
          }
          errors {
            field
            message
          }
        }
      }
    `

    const result = await this.graphql.mutation<{
      updateTransactionCategory: {
        category: TransactionCategory
        errors: Array<{ field: string; message: string }>
      }
    }>(mutation, { categoryId, input: data })

    if (result.updateTransactionCategory.errors?.length > 0) {
      const errorMessages = result.updateTransactionCategory.errors.map(e => e.message).join(', ')
      throw new Error(`更新分类失败: ${errorMessages}`)
    }

    return result.updateTransactionCategory.category
  }

  /**
   * 删除交易分类
   * 
   * 永久删除指定的交易分类
   */
  async deleteCategory(categoryId: string): Promise<boolean> {
    validateRequired({ categoryId })
    logger.debug(`正在删除分类: ${categoryId}`)

    const mutation = `
      mutation DeleteTransactionCategory($categoryId: ID!) {
        deleteTransactionCategory(id: $categoryId) {
          success
          errors {
            field
            message
          }
        }
      }
    `

    const result = await this.graphql.mutation<{
      deleteTransactionCategory: {
        success: boolean
        errors: Array<{ field: string; message: string }>
      }
    }>(mutation, { categoryId })

    if (result.deleteTransactionCategory.errors?.length > 0) {
      const errorMessages = result.deleteTransactionCategory.errors.map(e => e.message).join(', ')
      throw new Error(`删除分类失败: ${errorMessages}`)
    }

    return result.deleteTransactionCategory.success
  }

  /**
   * 批量删除交易分类
   * 
   * 一次性删除多个分类
   */
  async deleteCategories(categoryIds: string[]): Promise<BulkDeleteResult> {
    validateRequired({ categoryIds })
    logger.debug(`正在批量删除 ${categoryIds.length} 个分类`)

    const mutation = `
      mutation DeleteTransactionCategories($categoryIds: [ID!]!) {
        deleteTransactionCategories(ids: $categoryIds) {
          deletedCount
          failedCount
          errors {
            id
            message
          }
        }
      }
    `

    const result = await this.graphql.mutation<{
      deleteTransactionCategories: BulkDeleteResult
    }>(mutation, { categoryIds })

    return result.deleteTransactionCategories
  }

  /**
   * 分类组方法
   * 
   * 获取所有分类组列表
   */
  async getCategoryGroups(): Promise<CategoryGroup[]> {
    logger.debug('正在获取所有分类组')
    
    const query = `
      query GetTransactionCategoryGroups {
        transactionCategoryGroups {
          id
          name
          displayName
          color
          icon
          order
          isDefault
          categories {
            id
            name
            displayName
            color
            icon
          }
          createdAt
          updatedAt
        }
      }
    `

    const result = await this.graphql.query<{
      transactionCategoryGroups: CategoryGroup[]
    }>(query)

    return result.transactionCategoryGroups || []
  }

  /**
   * 通过ID获取分类组详情
   * 
   * 返回分类组的完整信息
   */
  async getCategoryGroupById(groupId: string): Promise<CategoryGroup> {
    validateRequired({ groupId })
    logger.debug(`正在获取分类组: ${groupId}`)

    const query = `
      query GetTransactionCategoryGroup($groupId: ID!) {
        transactionCategoryGroup(id: $groupId) {
          id
          name
          displayName
          color
          icon
          order
          isDefault
          categories {
            id
            name
            displayName
            color
            icon
            order
          }
          createdAt
          updatedAt
        }
      }
    `

    const result = await this.graphql.query<{
      transactionCategoryGroup: CategoryGroup
    }>(query, { groupId })

    if (!result.transactionCategoryGroup) {
      throw new Error(`未找到分类组: ${groupId}`)
    }

    return result.transactionCategoryGroup
  }

  /**
   * 标签管理方法
   * 
   * 获取所有交易标签列表
   */
  async getTags(): Promise<TransactionTag[]> {
    logger.debug('正在获取所有交易标签')
    
    const query = `
      query GetTransactionTags {
        transactionTags {
          id
          name
          color
          order
          isDefault
          createdAt
          updatedAt
        }
      }
    `

    const result = await this.graphql.query<{
      transactionTags: TransactionTag[]
    }>(query)

    return result.transactionTags || []
  }

  /**
   * 通过ID获取标签详情
   * 
   * 返回标签的完整信息
   */
  async getTagById(tagId: string): Promise<TransactionTag> {
    validateRequired({ tagId })
    logger.debug(`正在获取标签: ${tagId}`)

    const query = `
      query GetTransactionTag($tagId: ID!) {
        transactionTag(id: $tagId) {
          id
          name
          color
          order
          isDefault
          createdAt
          updatedAt
        }
      }
    `

    const result = await this.graphql.query<{
      transactionTag: TransactionTag
    }>(query, { tagId })

    if (!result.transactionTag) {
      throw new Error(`未找到标签: ${tagId}`)
    }

    return result.transactionTag
  }

  /**
   * 创建新交易标签
   * 
   * 创建一个新的用户自定义标签
   */
  async createTag(data: CreateTagInput): Promise<TransactionTag> {
    validateRequired({ name: data.name })
    logger.debug(`正在创建交易标签: ${data.name}`)

    const mutation = `
      mutation CreateTransactionTag($input: CreateTransactionTagInput!) {
        createTransactionTag(input: $input) {
          tag {
            id
            name
            color
            order
            isDefault
            createdAt
            updatedAt
          }
          errors {
            field
            message
          }
        }
      }
    `

    const result = await this.graphql.mutation<{
      createTransactionTag: {
        tag: TransactionTag
        errors: Array<{ field: string; message: string }>
      }
    }>(mutation, { input: data })

    if (result.createTransactionTag.errors?.length > 0) {
      const errorMessages = result.createTransactionTag.errors.map(e => e.message).join(', ')
      throw new Error(`创建标签失败: ${errorMessages}`)
    }

    return result.createTransactionTag.tag
  }

  /**
   * 更新交易标签
   * 
   * 更新指定标签的属性
   */
  async updateTag(tagId: string, data: Partial<CreateTagInput>): Promise<TransactionTag> {
    validateRequired({ tagId })
    logger.debug(`正在更新标签: ${tagId}`)

    const mutation = `
      mutation UpdateTransactionTag($tagId: ID!, $input: UpdateTransactionTagInput!) {
        updateTransactionTag(id: $tagId, input: $input) {
          tag {
            id
            name
            color
            order
            isDefault
            createdAt
            updatedAt
          }
          errors {
            field
            message
          }
        }
      }
    `

    const result = await this.graphql.mutation<{
      updateTransactionTag: {
        tag: TransactionTag
        errors: Array<{ field: string; message: string }>
      }
    }>(mutation, { tagId, input: data })

    if (result.updateTransactionTag.errors?.length > 0) {
      const errorMessages = result.updateTransactionTag.errors.map(e => e.message).join(', ')
      throw new Error(`更新标签失败: ${errorMessages}`)
    }

    return result.updateTransactionTag.tag
  }

  /**
   * 删除交易标签
   * 
   * 永久删除指定的交易标签
   */
  async deleteTag(tagId: string): Promise<boolean> {
    validateRequired({ tagId })
    logger.debug(`正在删除标签: ${tagId}`)

    const mutation = `
      mutation DeleteTransactionTag($tagId: ID!) {
        deleteTransactionTag(id: $tagId) {
          success
          errors {
            field
            message
          }
        }
      }
    `

    const result = await this.graphql.mutation<{
      deleteTransactionTag: {
        success: boolean
        errors: Array<{ field: string; message: string }>
      }
    }>(mutation, { tagId })

    if (result.deleteTransactionTag.errors?.length > 0) {
      const errorMessages = result.deleteTransactionTag.errors.map(e => e.message).join(', ')
      throw new Error(`删除标签失败: ${errorMessages}`)
    }

    return result.deleteTransactionTag.success
  }

  /**
   * 交易标签方法
   * 
   * 为交易设置标签（替换所有现有标签）
   */
  async setTransactionTags(transactionId: string, tagIds: string[]): Promise<boolean> {
    validateRequired({ transactionId, tagIds })
    logger.debug(`正在为交易 ${transactionId} 设置标签: ${tagIds.join(', ')}`)

    const mutation = `
      mutation SetTransactionTags($transactionId: ID!, $tagIds: [ID!]!) {
        setTransactionTags(transactionId: $transactionId, tagIds: $tagIds) {
          success
          errors {
            field
            message
          }
        }
      }
    `

    const result = await this.graphql.mutation<{
      setTransactionTags: {
        success: boolean
        errors: Array<{ field: string; message: string }>
      }
    }>(mutation, { transactionId, tagIds })

    if (result.setTransactionTags.errors?.length > 0) {
      const errorMessages = result.setTransactionTags.errors.map(e => e.message).join(', ')
      throw new Error(`设置交易标签失败: ${errorMessages}`)
    }

    return result.setTransactionTags.success
  }

  /**
   * 为交易添加标签
   * 
   * 向交易添加一个新标签，保留现有标签
   */
  async addTagToTransaction(transactionId: string, tagId: string): Promise<boolean> {
    validateRequired({ transactionId, tagId })
    logger.debug(`正在为交易 ${transactionId} 添加标签 ${tagId}`)

    const mutation = `
      mutation AddTagToTransaction($transactionId: ID!, $tagId: ID!) {
        addTagToTransaction(transactionId: $transactionId, tagId: $tagId) {
          success
          errors {
            field
            message
          }
        }
      }
    `

    const result = await this.graphql.mutation<{
      addTagToTransaction: {
        success: boolean
        errors: Array<{ field: string; message: string }>
      }
    }>(mutation, { transactionId, tagId })

    if (result.addTagToTransaction.errors?.length > 0) {
      const errorMessages = result.addTagToTransaction.errors.map(e => e.message).join(', ')
      throw new Error(`添加标签到交易失败: ${errorMessages}`)
    }

    return result.addTagToTransaction.success
  }

  /**
   * 从交易移除标签
   * 
   * 从交易中移除指定标签
   */
  async removeTagFromTransaction(transactionId: string, tagId: string): Promise<boolean> {
    validateRequired({ transactionId, tagId })
    logger.debug(`正在从交易 ${transactionId} 移除标签 ${tagId}`)

    const mutation = `
      mutation RemoveTagFromTransaction($transactionId: ID!, $tagId: ID!) {
        removeTagFromTransaction(transactionId: $transactionId, tagId: $tagId) {
          success
          errors {
            field
            message
          }
        }
      }
    `

    const result = await this.graphql.mutation<{
      removeTagFromTransaction: {
        success: boolean
        errors: Array<{ field: string; message: string }>
      }
    }>(mutation, { transactionId, tagId })

    if (result.removeTagFromTransaction.errors?.length > 0) {
      const errorMessages = result.removeTagFromTransaction.errors.map(e => e.message).join(', ')
      throw new Error(`从交易移除标签失败: ${errorMessages}`)
    }

    return result.removeTagFromTransaction.success
  }
}
