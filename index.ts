import cuillere from '@cuillere/core'
import { channelsPlugin } from '@cuillere/channels'

import { listenAndServe } from './envelope'

cuillere(channelsPlugin()).call(listenAndServe, 'localhost', 8080).catch(() => process.exit(1))
