import * as net from 'net'
import * as readline from 'readline'
import { on, once } from 'events'

import { defer, fork } from '@cuillere/core'
import { chan, ChanKey, recv, select, send } from '@cuillere/channels'
import * as winston from 'winston'

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
    for await (const [conn] of on(this.listener, 'connection') as AsyncIterableIterator<[net.Socket]>) {
      // FIXME this.logger('connection failed %s', err)

      conn.write(`${this.welcomeMessage}\n`, err => {
        if (err) this.logger.error('sending message failed: %s', err)
      })  

      const r = readline.createInterface(conn)

      let username: string

      [username] = await once(r, 'line')
      // FIXME this.logger.error('reading username failed: %s', err)

      username = username.trimEnd()

      const c: Connection = {
        conn,
        username,
      }

      yield send(this.register, c)
    }
  }

  async* handle(c: Connection) {
    const r = readline.createInterface(c.conn)

    for await (const msg of r) {
      yield send(this.broadcast, `${c.username}: ${msg}\n`)
    }

    // FIXME not so good
    yield fork(async function* () {
      yield defer(send(this.unregister, c.conn))

      try {
        await once(c.conn, 'close')
        this.logger.info('client connection closed')
      } catch (err) {
        this.logger.error('receiving message failed: %s', err)
      }
    }.bind(this))
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
