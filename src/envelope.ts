import * as net from 'net'
import { once } from 'events'

import { defer, fork } from '@cuillere/core'
import { chan, ChanKey, recv, select, send } from '@cuillere/channels'
import * as winston from 'winston'

import { BufferedReader } from './buffered-reader'

class Server {
  
  logger: winston.Logger

  welcomeMessage = 'Welcome to envelope! Please enter your username:'

  listener = new net.Server()

  clients = new Map<net.Socket, string>()

  register: ChanKey

  unregister: ChanKey

  broadcast: ChanKey

  constructor(logger: winston.Logger) {
    this.logger = logger
  }

  * run() {
    yield fork(() => this.listen())

    while (true) {
      yield select(
        [recv(this.register), function* (c: Connection) {
          this.clients.set(c.conn, c.username)
          this.logger.info('client connection registered')
          yield send(this.broadcast, `${c.username} joined envelope\n`)
          yield fork(this.handle(c))
        }.bind(this)],
        [recv(this.broadcast), (msg: string) => {
          for (const conn of this.clients.keys()) {
            conn.write(msg, err => {
              if (err) this.logger.error('sending message failed: %s', err)
            })
          }
        }],
        [recv(this.unregister), (conn: net.Socket) => {
          this.clients.delete(conn)
          this.logger.info('client connection unregistered')
        }],
      )
    }
  }

  async* listen() {
    while (true) {
      let conn: net.Socket

      try {
        [conn] = await once(this.listener, 'connection')
      } catch (err) {
        this.logger.error('connection failed: %s', err.message)
        continue
      }

      try {
        await new Promise((resolve, reject) => conn.write(`${this.welcomeMessage}\n`, err => {
          if (err) reject(err)
          else resolve()
        }))
      } catch (err) {
        this.logger.error('sending message failed: %s', err.message)
        continue
      }

      let username: string
      try {
        const br = new BufferedReader(conn)
        username = await br.readLine()
      } catch (err) {
        this.logger.error('reading username failed: %s', err.message)
        continue
      }

      const c: Connection = {
        conn,
        username,
      }

      yield send(this.register, c)
    }
  }

  async* handle(c: Connection) {
    yield defer(send(this.unregister, c.conn))

    const br = new BufferedReader(c.conn)
    let msg: string

    while (true) {
      try {
        msg = await br.readLine()
      } catch (err) {
        if (err.message === 'EOF') {
          this.logger.info('client connection closed')
        }
        this.logger.error('receiving message failed: %s', err.message)
        return
      }

      yield send(this.broadcast, `${c.username}: ${msg}\n`)
    }
  }
}

interface Connection {
  conn: net.Socket
  username: string
}

export function* listenAndServe(hostname: string, port: number) {
  return yield listenAndServeWithLogger(hostname, port, winston.createLogger({
    format: winston.format.combine(
      winston.format.splat(),
      winston.format.timestamp({ format: 'YYYY-MM-DD hh:mm:ss' }),
      winston.format.printf(({ message, timestamp, level }) => `${timestamp} ${level} ${message}`),
    ),
    transports: new winston.transports.Console(),
  }))
}

export async function* listenAndServeWithLogger(hostname: string, port: number, logger: winston.Logger) {
  const s = new Server(logger)

  s.register = yield chan(1)
  s.unregister = yield chan(1)
  s.broadcast = yield chan(10)

  s.listener.listen(port, hostname)

  try{
    await once(s.listener, 'listening')
  } catch (err) {
    logger.error(err)
    throw err
  }

  logger.log('info', `Listening on %s:%d`, hostname, port)

  yield s.run()
}
