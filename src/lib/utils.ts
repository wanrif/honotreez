import { nanoid } from 'nanoid'

export const generateId = (size = 32) => nanoid(size)
