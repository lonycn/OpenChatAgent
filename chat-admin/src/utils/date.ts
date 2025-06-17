/**
 * 日期时间工具函数
 */

/**
 * 格式化日期时间
 * @param dateString 日期字符串
 * @param format 格式化模式
 * @returns 格式化后的日期字符串
 */
export function formatDateTime(
  dateString?: string | null,
  format: 'datetime' | 'date' | 'time' | 'relative' = 'datetime'
): string {
  if (!dateString) return '-'

  const date = new Date(dateString)
  if (isNaN(date.getTime())) return '-'

  const now = new Date()
  const diff = now.getTime() - date.getTime()

  // 相对时间格式
  if (format === 'relative') {
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (seconds < 60) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 7) return `${days}天前`

    // 超过7天显示具体日期
    return formatDateTime(dateString, 'date')
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  const second = String(date.getSeconds()).padStart(2, '0')

  switch (format) {
    case 'date':
      return `${year}-${month}-${day}`
    case 'time':
      return `${hour}:${minute}:${second}`
    case 'datetime':
    default:
      return `${year}-${month}-${day} ${hour}:${minute}`
  }
}

/**
 * 格式化相对时间
 * @param dateString 日期字符串
 * @returns 相对时间字符串
 */
export function formatRelativeTime(dateString?: string | null): string {
  return formatDateTime(dateString, 'relative')
}

/**
 * 获取今天的日期范围
 * @returns [开始时间, 结束时间]
 */
export function getTodayRange(): [string, string] {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

  return [start.toISOString(), end.toISOString()]
}

/**
 * 获取本周的日期范围
 * @returns [开始时间, 结束时间]
 */
export function getThisWeekRange(): [string, string] {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek)
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 7)

  return [start.toISOString(), end.toISOString()]
}

/**
 * 获取本月的日期范围
 * @returns [开始时间, 结束时间]
 */
export function getThisMonthRange(): [string, string] {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  return [start.toISOString(), end.toISOString()]
}

/**
 * 检查日期是否为今天
 * @param dateString 日期字符串
 * @returns 是否为今天
 */
export function isToday(dateString: string): boolean {
  const date = new Date(dateString)
  const today = new Date()

  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  )
}

/**
 * 检查日期是否为昨天
 * @param dateString 日期字符串
 * @returns 是否为昨天
 */
export function isYesterday(dateString: string): boolean {
  const date = new Date(dateString)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  return (
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  )
}

/**
 * 获取时间段标签
 * @param dateString 日期字符串
 * @returns 时间段标签
 */
export function getTimePeriodLabel(dateString: string): string {
  if (isToday(dateString)) return '今天'
  if (isYesterday(dateString)) return '昨天'

  const date = new Date(dateString)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 7) return `${diffDays}天前`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}个月前`

  return `${Math.floor(diffDays / 365)}年前`
}
