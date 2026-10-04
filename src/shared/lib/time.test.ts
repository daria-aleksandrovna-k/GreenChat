import { formatChatTime, formatDayLabel, formatTime, isSameDay } from './time'

describe('formatTime', () => {
  it('formats local time as HH:mm', () => {
    expect(formatTime(new Date(2026, 0, 1, 9, 5).getTime())).toBe('09:05')
    expect(formatTime(new Date(2026, 0, 1, 23, 59).getTime())).toBe('23:59')
  })
})

const now = new Date(2026, 9, 5, 15, 0).getTime()
const at = (month: number, day: number, hour = 10, minute = 0, year = 2026) =>
  new Date(year, month, day, hour, minute).getTime()

describe('formatChatTime', () => {
  it('shows time for today', () => {
    expect(formatChatTime(at(9, 5, 9, 5), now)).toBe('09:05')
  })
  it('shows "вчера" for yesterday', () => {
    expect(formatChatTime(at(9, 4, 23, 59), now)).toBe('вчера')
  })
  it('shows day and short month within the year', () => {
    expect(formatChatTime(at(8, 14), now)).toBe('14 сент.')
  })
  it('shows the full date for earlier years', () => {
    expect(formatChatTime(at(11, 31, 10, 0, 2025), now)).toBe('31.12.2025')
  })
})

describe('formatDayLabel', () => {
  it('names today and yesterday', () => {
    expect(formatDayLabel(at(9, 5), now)).toBe('Сегодня')
    expect(formatDayLabel(at(9, 4), now)).toBe('Вчера')
  })
  it('shows day and month within the year, with the year otherwise', () => {
    expect(formatDayLabel(at(8, 14), now)).toBe('14 сентября')
    expect(formatDayLabel(at(11, 31, 10, 0, 2025), now)).toBe('31 декабря 2025')
  })
})

describe('isSameDay', () => {
  it('compares calendar days in local time', () => {
    expect(isSameDay(at(9, 5, 0, 1), at(9, 5, 23, 59))).toBe(true)
    expect(isSameDay(at(9, 4, 23, 59), at(9, 5, 0, 1))).toBe(false)
  })
})
