import * as Http from 'http'

const app = Http.createServer(handler)
const io = require('socket.io')(app);

app.listen(80)

function handler(req: Http.IncomingMessage, res: Http.ServerResponse) {
  res.writeHead(200)
  res.end()
}

io.on('connection', function(socket) {
  
  socket.emit('news', { hello: 'world' })
  socket.on('subscribe', function(data: any) {})

})