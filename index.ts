import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
// @ts-ignore
import { createNecessaryDirectoriesSync } from 'filesac'

import express from 'express'
import formidable, { File as FormFile } from 'formidable'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)


const UPLOAD_DIRECTORY = path.resolve(__dirname, '../uploads')
const MAX_FILE_SIZE_GIGS = 0.25
const MAX_FILE_SIZE_BYTES = 1024 * 1024 * 1024 * MAX_FILE_SIZE_GIGS

const app = express()
const port = 5001

app.post('/up', async (req, res, next) => {
  const form = formidable({
    maxFileSize: MAX_FILE_SIZE_BYTES,
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

    const appName = fields.app
    if (!appName) {
      res.status(400).json('Error: No app specified')
      return
    }

    const appPath = `${UPLOAD_DIRECTORY}/${appName}`
    try {
      createNecessaryDirectoriesSync(appPath)
    } catch (error) {
      res.status(500).json('Error: Failed to create directory - ' + JSON.stringify(error))
      return
    }

    try {
      await Promise.all(Object.entries(files).map(async (
        [_fileKey, fileValue],
      ) => {     
        // @ts-ignore   
        const file = fileValue[0] as FormFile

        if (!isValidFile(file)) throw Error('Invalid file')
        
        const oldPath = file.filepath
        const newPath = path.resolve(appPath, file.newFilename)
    
        return rename(oldPath, newPath)
          
      }))

      res.json({ fields, files })
    } catch (error) {
      res.status(500).json('Error: Failed to save a file into the proper directory - ' + JSON.stringify(error))
    }
  })
})

app.listen(port, () => {
  console.log(`Upload app listening on port ${port}`)
})

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

const isValidFile = (file: FormFile): boolean => {
  // const allowedTypes = ['image/jpeg', 'image/png'] // Add your file types
  // return allowedTypes.includes(file.mimetype ?? '') && file.size > 0

  return true
}