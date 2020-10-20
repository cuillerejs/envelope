import { on, once } from 'events'
import { Readable } from 'stream'

export class BufferedReader {
  #b = Buffer.from('')

  #r: Readable

  #close: Promise<any[]>

  constructor(r: Readable) {
    this.#r = r
    this.#close = this.once('close')
  }

  async readLine() {
    while (true) {
      const i = this.#b.indexOf('\n')
      if (i !== -1) {
        const s = this.#b.toString('utf8', 0, i)
        this.#b = this.#b.slice(i + 1)
  
        return s
      }

      const [e, data] = await Promise.race([
        this.once('data'),
        this.#close,
      ])

      if (e === 'close') throw Error('EOF')

      this.#b = Buffer.concat([this.#b, data])
    }
  }

  private async once(event: string): Promise<any[]> {
    return once(this.#r, event).then((args) => [event, ...args])
  }
}