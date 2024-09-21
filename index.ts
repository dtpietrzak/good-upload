import fs from 'fs'
import path from 'path'

import express from 'express'
import formidable, { File as FormFile } from 'formidable'
import mime from 'mime-types'

import { PrismaClient } from '@prisma/client'

const UPLOAD_DIRECTORY = path.resolve(__dirname, '../uploads')
const MAX_FILE_SIZE_GIGS = 0.25
const MAX_FILE_SIZE_BYTES = 1024 * 1024 * 1024 * MAX_FILE_SIZE_GIGS

const app = express()
const port = 5001

const prisma = new PrismaClient()

const lock_pathname = new Map<string, boolean>()

type UploadFileDb = {
  app: string;
  filename: string;
  fileurl: string;
  filesize: number;
  filetype: string;
  path: string;
}

type UploadFile = {
  filename: string;
  url: string;
  size: number;
  mimetype: string;
}

app.post('/up', async (req, res, next) => {
  const form = formidable({
    maxFileSize: MAX_FILE_SIZE_BYTES,
    multiples: true,
  })
  
  form.parse(req, async (err, fields, files) => {
    if (err) {
      next(err)
      return
    }

    if (!files || Object.keys(files).length === 0) {
      res.status(400).json('Error: No files uploaded')
      return
    }

    const appName = fields.app?.toString() ?? fields.app as unknown as string
    if (!appName) {
      res.status(400).json('Error: No app specified')
      return
    }

    const subDir = fields.key?.toString() ?? fields.key as unknown as string
    if (!subDir) {
      res.status(400).json('Error: No dir specified')
      return
    }

    const dirPath = path.resolve(UPLOAD_DIRECTORY, 'static', appName, subDir)
    try {
      await ensureDirectoryExists(dirPath)
    } catch (error) {
      res.status(500).json('Error: Failed to create directory - ' + JSON.stringify(error))
      return
    }

    const response: UploadFile[] = []

    try {
      await Promise.all(Object.entries(files).map(async (
        [_fileKey, fileValue],
      ) => {
        const _files = fileValue as FormFile[]

        return await Promise.all(_files.map(async (file) => {
          if (
            !file?.mimetype ||
            !file?.size ||
            !file?.originalFilename
          ) throw Error('Invalid file')

          const newFilename = `${file.newFilename}.${mime.extension(file.mimetype)}`

          const oldPath = file.filepath
          const urlPath = `http://localhost:${port}/${appName}/${subDir}/${newFilename}`
          const newPath = encodeURI(path.resolve(dirPath, newFilename))

          if (!isValidFile(file)) throw Error('Invalid file')

          if (lock_pathname.has(newPath)) throw Error('The file you request is already being accessed. Please try again later.')
          lock_pathname.set(newPath, true)

          let rename_success = false

          try {
            await rename(oldPath, newPath)
            rename_success = true
            const uploadFile: UploadFileDb = {
              app: appName,
              filename: file.originalFilename,
              fileurl: urlPath,
              filesize: file.size,
              filetype: file.mimetype,
              path: newPath,
            }
            await prisma.file.upsert({
              where: {
                path: newPath,
              },
              create: uploadFile,
              update: uploadFile,
            })
            response.push({
              filename: uploadFile.filename,
              url: uploadFile.fileurl,
              mimetype: uploadFile.filetype,
              size: uploadFile.filesize,
            })
          } catch (error) {
            // cleanup on error
            if (rename_success) {
              try {
                // remove file
                await fs.promises.unlink(newPath)
              } catch (error) {
                lock_pathname.delete(newPath)
                console.error(error)
                throw error
              }
            }
            lock_pathname.delete(newPath)
            console.error(error)
            throw error
          }
          return
        }))
      }))

      res.json(response)
    } catch (error) {
      res.status(500).json('Error: Failed to save a file into the proper directory - ' + JSON.stringify(error))
    }
  })
})

app.get('/:app/:key/:id', async (req, res, next) => {
  const app = req.params.app
  const key = req.params.key
  const id = req.params.id

  const filePath = encodeURI(path.resolve(UPLOAD_DIRECTORY, 'static', app, key, id))

  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('Error sending file:', err)
      res.status(500).send('Error serving file')
    }
  })
})

app.listen(port, () => {
  console.log(`Upload app listening on port ${port}`)
})

const isValidFile = (file: FormFile): boolean => {
  // const allowedTypes = ['image/jpeg', 'image/png'] // Add your file types
  // return allowedTypes.includes(file.mimetype ?? '') && file.size > 0

  return true
}

/**
 * Renames (moves) a file from the old path to the new path. If the rename operation fails due to being
 * across different devices (`EXDEV` error), it falls back to copying the file and then deleting the original.
 *
 * @param {string} oldPath - The current location of the file.
 * @param {string} newPath - The new location where the file should be moved.
 * @returns {Promise<string>} A promise that resolves to the new file path if the operation is successful.
 * @throws Will throw an error if the file at `oldPath` does not exist, or if any other error occurs during renaming, copying, or deleting.
 *
 * @example
 * rename('/path/to/source.txt', '/path/to/destination.txt')
 *   .then((newPath) => console.log(`File moved to: ${newPath}`))
 *   .catch((error) => console.error('Error moving file:', error));
 */
const rename = async (oldPath: string, newPath: string): Promise<string> => {
  try {
    if (!fs.existsSync(oldPath)) {
      throw new Error(`File does not exist at path: ${oldPath}`)
    }
    await fs.promises.rename(oldPath, newPath)
  } catch (error: any) {
    if (error?.code === 'EXDEV') {
      // Cross-device file move, copy instead
      await fs.promises.copyFile(oldPath, newPath)
      await fs.promises.unlink(oldPath)
    } else {
      throw error
    }
  }
  return newPath
}

/**
 * Ensures that the directory exists. If it doesn't exist, it creates it.
 * 
 * @param {string} dirPath - The path of the directory to check or create.
 * @returns {Promise<void>}
 */
const ensureDirectoryExists = async (dirPath: string): Promise<void> => {
  let fullPath: string

  try {
    // Resolve the full path
    fullPath = path.resolve(dirPath)
  } catch (error) {
    console.error(error)
    throw error
  }

  try {
    await fs.promises.access(fullPath)
    // directory does exist, so return
    return
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      // directory does not exist, so we create it
      await fs.promises.mkdir(fullPath, { recursive: true })
      return
    } else {
      // other errors should be thrown
      console.error(error)
      throw error
    }
  }
}