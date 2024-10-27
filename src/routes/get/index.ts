import path from 'path'

import { prisma } from '../../globals'
import * as GLOBAL from '../../globals'
import { Route } from '../../types'

/**
 * route = /file/:appName/*\/:id
 */
const file: Route = async (req, res) => {
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

  res.sendFile(filePath, async (err) => {
    if (err) {
      // @ts-ignore
      if (err?.code === 'ENOENT') {
        await prisma.file.delete({
          where: {
            app: appName,
            key: key,
            id: trueId,
          },
        })
        res.status(404).send('File not found')
        return
      }
      console.error('Error sending file:', err)
      res.status(500).send('Error serving file')
    }
  })
}

/**
 * route = /data/:appName/*\/:id
 */
const data: Route = async (req, res) => {
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
      suffixId: true,
    },
  })

  res.json(record)
}

/**
 * route = /list/:appName/*
 */
const list: Route = async (req, res) => {
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

  const record = await prisma.file.findMany({
    where: {
      app: appName,
      key: key,
    },
    select: {
      id: true,
      key: true,
      suffixId: true,
      filename: true,
      filesize: true,
      filetype: true,
      downloads: true,
    },
  })

  

  res.json(record)
}

export default {
  file,
  data,
  list,
}

