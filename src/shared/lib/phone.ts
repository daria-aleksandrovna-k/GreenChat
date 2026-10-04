export const normalizePhone = (raw: string): string => raw.replace(/\D/g, '')

export const isValidPhone = (digits: string): boolean => /^\d{10,15}$/.test(digits)

export const toChatId = (digits: string): string => `${digits}@c.us`

export const formatPhone = (digits: string): string => `+${digits}`
