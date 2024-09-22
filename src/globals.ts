import path from 'path'

import express from 'express'
import { PrismaClient } from '@prisma/client'

export const UPLOAD_DIRECTORY = path.resolve(__dirname, '../../uploads')
export const MAX_FILE_SIZE_GIGS = 0.25
export const MAX_FILE_SIZE_BYTES = 1024 * 1024 * 1024 * MAX_FILE_SIZE_GIGS
export const PORT = 5001

export const server = express()
export const prisma = new PrismaClient()