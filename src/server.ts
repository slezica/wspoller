import * as Http from 'http'
import fetch, * as Fetch from 'node-fetch'
import deepEqual from 'deep-equal'
import socketIO from 'socket.io'


type Headers = { [key: string]: string }

interface PollerRequest {
  url: string
  headers: Headers
}

interface PollerResponse {
  status: number
  headers: Headers
  body: string
}

type PollerCallback = (newRes: PollerResponse) => any

class Poller {
  private isPolling: boolean
  private req?: PollerRequest
  private lastRes?: PollerResponse
  private callback: PollerCallback

  constructor(callback: PollerCallback) {
    this.isPolling = false
    this.lastRes = null
    this.callback = callback
  }

  async start(req: PollerRequest) {
    if (this.isPolling) return
    this.isPolling = true

    while (this.isPolling) {
      const newRes = await this.makeRequest(req)
      const hasChanged = !deepEqual(newRes, this.lastRes, { strict: true })

      if (hasChanged && this.isPolling) {
        this.lastRes = newRes
        console.log("RES", newRes)
        this.callback(newRes)
      }

      await this.sleep(1000)
    }
  }

  stop() {
    this.isPolling = false
  }

  private async makeRequest(req: PollerRequest) {
    console.log("REQ", req)
    const res = await fetch(req.url, { headers: req.headers })
  
    const status = res.status
    const headers = this.toPlainHeaders(res.headers)
    const body = await res.text()
  
    return { status, headers, body } as PollerResponse
  }

  private toPlainHeaders(fetchHeaders: Fetch.Headers) {
    const headers: Headers = {}
  
    for (let entry in fetchHeaders.entries()) {
      const [ key, value ] = entry
      if (! (key in headers)) headers[key] = value
    }
  
    return headers
  }

  private async sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}


class SocketHandler {
  private socket: SocketIO.Socket
  private poller: Poller

  constructor(socket: SocketIO.Socket) {
    console.log("CON", socket.handshake.address)
    this.poller = new Poller(this.onPollerResponse)

    this.socket = socket
    this.socket.on('subscribe', this.onSubscribe)
    this.socket.on('disconnect', this.onDisconnect)
  }

  private onSubscribe = (req: PollerRequest) => {
    console.log("SUB", req)
    this.poller.start(req)
  }

  private onPollerResponse = (res: PollerResponse) => {
    if (this.socket.connected) this.socket.emit('response', res)
  }

  private onDisconnect = () => {
    this.poller.stop()
    this.poller = null
    this.socket = null
  }
}


function handleHttpRequest(req: Http.IncomingMessage, res: Http.ServerResponse) {
  res.writeHead(200)
  res.end()
}

const httpServer = Http.createServer(handleHttpRequest)

const io = socketIO(httpServer)
io.on('connection', socket => new SocketHandler(socket))

httpServer.listen(3000)
httpServer.on('error', console.error)
