# @cuillere/envelope 🥄📨

**@cuillere/envelope** is a rewrite of [@tgirier/envelope](https://github.com/tgirier/envelope) in NodeJS, 🙏 thanks to [@tgirier](https://github.com/tgirier) for his original work.

**Envelope** is a basic chat server using TCP websockets, which broadcasts messages to all connected users.

**@cuillere/envelope** is an example project of using [@cuillere/channels](https://github.com/cuillerejs/cuillere/tree/master/channels).

## Usage

Run **@cuillere/envelope** using [npx](https://github.com/npm/npx#readme):

```sh
$ npx @cuillere/envelope
2020-10-20 12:08:44 info Listening on localhost:8080
```

Use `HOST` and `PORT` environment variables to configure the address of the server:

```sh
$ HOST=192.168.1.1 PORT=1234 npx @cuillere/envelope
2020-10-20 12:24:00 info Listening on 192.168.1.136:1234
```

## Author

👤 **Nicolas Lepage**

* Twitter: [@njblepage](https://twitter.com/njblepage)
* Github: [@nlepage](https://github.com/nlepage)

## Show your support

Give a ⭐️ if this project helped you!

## 📝 License

Copyright © 2020 [CuillereJS](https://github.com/cuillerejs).<br />
This project is [Apache-2.0](https://spdx.org/licenses/Apache-2.0.html) licensed.
