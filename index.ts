#!/usr/bin/env ts-node-script

import cuillere from '@cuillere/core'
import { channelsPlugin } from '@cuillere/channels'

import { listenAndServe } from './envelope'

const host = process.env.HOST ?? 'localhost'
const port = Number(process.env.PORT ?? 8080)

cuillere(channelsPlugin()).call(listenAndServe, host, port).catch((e) => {
  console.error(e)
  process.exit(1)
})
