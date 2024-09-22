import path from 'path'

import { prisma } from '../../globals'
import * as GLOBAL from '../../globals'
import { Route } from '../../types'

const file: Route = async (req, res, next) => {
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

  const id = req.params.id
  if (!id) {
    res.status(400).json('Error: No id specified')
    return
  }
  const trueId = id.substring(0, id.lastIndexOf('.'))

  const filePath = encodeURI(path.resolve(GLOBAL.UPLOAD_DIRECTORY, 'static', appName, key, id))

  const record = await prisma.file.update({
    where: {
      app: appName,
      key: key,
      id: trueId,
    },
    data: {
      downloads: {
        increment: 1,
      },
    },
  })

  res.setHeader('File-Name', record.filename)

  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('Error sending file:', err)
      res.status(500).send('Error serving file')
    }
  })
}

const data: Route = async (req, res, next) => {
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

  const id = req.params.id
  if (!id) {
    res.status(400).json('Error: No id specified')
    return
  }
  const trueId = id.substring(0, id.lastIndexOf('.'))

  const record = await prisma.file.findUnique({
    where: {
      app: appName,
      key: key,
      id: trueId,
    },
    select: {
      downloads: true,
      filename: true,
      filesize: true,
      filetype: true,
      fileurl: true,
    },
  })

  res.json(record)
}

export default {
  file,
  data,
}

