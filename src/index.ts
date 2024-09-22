import * as GLOBAL from './globals'
import { server } from './globals'

import post from './routes/post'
import get from './routes/get'

server.post('/:appName/*', post.uploadFile)

server.get('/file/:appName/*/:id', get.file)
server.get('/data/:appName/*/:id', get.data)


server.listen(GLOBAL.PORT, () => {
  console.log(`Upload app listening on port ${GLOBAL.PORT}`)
})



