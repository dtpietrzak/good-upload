import * as GLOBAL from './globals'
import { server } from './globals'

import post from './routes/post'
import get from './routes/get'

// limit and offset hasn't been implemented yet

server.post('/:appName/*', post.uploadFile)

server.get('/file/:appName/*/:id', get.file)
server.get('/data/:appName/*/:id', get.data)
server.get('/list/:appName/*', get.list)

server.listen(GLOBAL.PORT, () => {
  console.log(`Upload app listening on port ${GLOBAL.PORT}`)
})



