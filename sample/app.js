console.log('Staring')

const req = {
  url: 'http://localhost:8000/test.txt',
  headers: {}
}

const socket = io('localhost:3000')

socket.on('connect', () => socket.emit('subscribe', req))
socket.on('response', console.log)
socket.connect()