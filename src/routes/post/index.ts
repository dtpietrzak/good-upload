import fs from 'fs'
import path from 'path'

import formidable, { File as FormFile } from 'formidable'
import mime from 'mime-types'

import sharp from 'sharp'

import { prisma } from '../../globals'
import * as GLOBAL from '../../globals'
import { UploadFile, UploadFileDb, Route } from '../../types'

import * as LOCK from '../../locks'

import { ensureDirectoryExists, rename } from '../../utils'
import { isValidFile } from '../../utils/validation'

/**
 * route = /:appName/*
 */
const uploadFile: Route = async (req, res, next) => {
  const appName = req.params.appName
  if (!appName) {
    res.status(400).json('Error: No app specified')
    return
  }

  const key = req.params[0]
  if (!key) {
    res.status(400).json('Error: No key specified')
    return
  }

  const form = formidable({
    maxFileSize: GLOBAL.MAX_FILE_SIZE_BYTES,
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

    const dirPath = path.resolve(GLOBAL.UPLOAD_DIRECTORY, 'static', appName, key)
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
          const fileUrlPath = `http://localhost:${GLOBAL.PORT}/file/${appName}/${key}/${newFilename}`
          const dataUrlPath = `http://localhost:${GLOBAL.PORT}/data/${appName}/${key}/${newFilename}`
          const newPath = encodeURI(path.resolve(dirPath, newFilename))

          if (!isValidFile(file)) throw Error('Invalid file')

          if (LOCK.pathnames.has(newPath)) throw Error('The file you request is already being accessed. Please try again later.')
          LOCK.pathnames.set(newPath, true)

          let process_success = false
          const processedPath = `${oldPath}-processed-temp`
          try {
            const image_pipe = sharp(oldPath).clone()
            let resize: sharp.ResizeOptions | undefined
            const resize_string = req.query?.resize
            if (typeof resize_string === 'string') {
              try {
                resize = JSON.parse(decodeURIComponent(resize_string))
              } catch (error) {
                throw Error('Failed to parse resize query search param')
              }
              if (resize) image_pipe.resize(resize)
            }
            await image_pipe.toFile(processedPath)
            process_success = true
          } catch (error) {
            res.status(500).json('Error: Failed to process the file - ' + JSON.stringify(error))
            return
          }

          let rename_success = false
          try {
            // file management
            if (process_success) {
              fs.unlinkSync(oldPath)
              await rename(processedPath, newPath)
            } else {
              await rename(oldPath, newPath)
            }
            rename_success = true

            // handle db
            const uploadFile: Omit<UploadFileDb, 'downloads'> = {
              id: file.newFilename,
              app: appName,
              key: key,
              path: newPath,

              filename: file.originalFilename,
              fileurl: fileUrlPath,
              filesize: file.size,
              filetype: file.mimetype,

              dataurl: dataUrlPath,
            }
            await prisma.file.upsert({
              where: {
                path: newPath,
              },
              create: {
                ...uploadFile,
                downloads: 0,
              },
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
                LOCK.pathnames.delete(newPath)
                console.error(error)
                throw error
              }
            }
            LOCK.pathnames.delete(newPath)
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
}

export default {
  uploadFile,
}