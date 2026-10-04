const timeFormatter = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' })
const shortDateFormatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' })
const fullDateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})
const dayMonthFormatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' })

const DAY_MS = 24 * 60 * 60 * 1000

export const formatTime = (timestamp: number): string => timeFormatter.format(timestamp)

export function isSameDay(a: number, b: number): boolean {
  const first = new Date(a)
  const second = new Date(b)
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  )
}

const isYesterday = (timestamp: number, now: number): boolean => {
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  return isSameDay(timestamp, yesterday.getTime()) && now - timestamp < 2 * DAY_MS
}

const isSameYear = (a: number, b: number): boolean =>
  new Date(a).getFullYear() === new Date(b).getFullYear()

/** Chat list time, as in Telegram: "14:05", "вчера", "5 окт.", "05.10.2025" */
export function formatChatTime(timestamp: number, now = Date.now()): string {
  if (isSameDay(timestamp, now)) return formatTime(timestamp)
  if (isYesterday(timestamp, now)) return 'вчера'
  if (isSameYear(timestamp, now)) return shortDateFormatter.format(timestamp)
  return fullDateFormatter.format(timestamp)
}

/** Day label in the message feed: "Сегодня", "Вчера", "5 октября", "5 октября 2025" */
export function formatDayLabel(timestamp: number, now = Date.now()): string {
  if (isSameDay(timestamp, now)) return 'Сегодня'
  if (isYesterday(timestamp, now)) return 'Вчера'
  const dayMonth = dayMonthFormatter.format(timestamp)
  return isSameYear(timestamp, now) ? dayMonth : `${dayMonth} ${new Date(timestamp).getFullYear()}`
}
