import { ws } from "msw"
import { setupWorker } from "msw/browser"
// import StackWorker from "./stack-worker?worker"

let accepted = false
let curSocket: any = null
const eventQueue: Uint8Array[] = []

let toNetCtrl: Int32Array
let toNetBegin: Int32Array
let toNetEnd: Int32Array
let toNetNotify: Int32Array
let toNetData: Uint8Array
let fromNetCtrl: Int32Array
let fromNetBegin: Int32Array
let fromNetEnd: Int32Array
let fromNetData: Uint8Array
let metaFromNetCtrl: Int32Array
let metaFromNetBegin: Int32Array
let metaFromNetEnd: Int32Array
let metaFromNetStatus: Int32Array
let metaFromNetData: Uint8Array

function registerConnBuffer(to: SharedArrayBuffer, from: SharedArrayBuffer) {
  toNetCtrl = new Int32Array(to, 0, 1)
  toNetBegin = new Int32Array(to, 4, 1)
  toNetEnd = new Int32Array(to, 8, 1)
  toNetNotify = new Int32Array(to, 12, 1)
  toNetData = new Uint8Array(to, 16)
  fromNetCtrl = new Int32Array(from, 0, 1)
  fromNetBegin = new Int32Array(from, 4, 1)
  fromNetEnd = new Int32Array(from, 8, 1)
  fromNetData = new Uint8Array(from, 12)
}

function registerMetaBuffer(meta: SharedArrayBuffer) {
  metaFromNetCtrl = new Int32Array(meta, 0, 1)
  metaFromNetBegin = new Int32Array(meta, 4, 1)
  metaFromNetEnd = new Int32Array(meta, 8, 1)
  metaFromNetStatus = new Int32Array(meta, 12, 1)
  metaFromNetData = new Uint8Array(meta, 16)
}

function sockAccept() {
  accepted = true
  return true
}

function sockSend() {
  if (Atomics.compareExchange(toNetCtrl, 0, 0, 1) != 0) {
    setTimeout(() => sockSend(), 0)
    return
  }

  const data = eventQueue.shift()!
  let begin = toNetBegin[0]
  let end = toNetEnd[0]
  let len: number
  let round: number
  if (end >= begin) {
    len = toNetData.byteLength - end
    round = begin
  } else {
    len = begin - end
    round = 0
  }

  if (len + round < data.length) {
    console.log("FIXME: buffer full; dropping packets")
  } else {
    if (len > 0) {
      if (len > data.length) len = data.length
      toNetData.set(data.subarray(0, len), end)
      toNetEnd[0] = end + len
    }
    if (round > 0 && data.length > len) {
      if (round > data.length - len) round = data.length - len
      toNetData.set(data.subarray(len, len + round), 0)
      toNetEnd[0] = round
    }
  }

  if (Atomics.compareExchange(toNetCtrl, 0, 1, 0) != 1) {
    console.log("UNEXPECTED STATUS")
  }
  Atomics.notify(toNetCtrl, 0, 1)
  Atomics.store(toNetNotify, 0, 1)
  Atomics.notify(toNetNotify, 0)
}

function sockRecvWS(targetLen: number) {
  if (!accepted) return -1

  if (Atomics.compareExchange(fromNetCtrl, 0, 0, 1) != 0) {
    sockRecvWS(targetLen)
    return
  }

  let begin = fromNetBegin[0]
  let end = fromNetEnd[0]
  let len: number
  let round: number
  if (end >= begin) {
    len = end - begin
    round = 0
  } else {
    len = fromNetData.byteLength - begin
    round = end
  }
  if (targetLen < len) {
    len = targetLen
    round = 0
  } else if (targetLen < len + round) {
    round = targetLen - len
  }

  const targetBuf = new Uint8Array(len + round)
  if (len > 0) {
    targetBuf.set(fromNetData.subarray(begin, begin + len), 0)
    fromNetBegin[0] = begin + len
  }
  if (round > 0) {
    targetBuf.set(fromNetData.subarray(0, round), len)
    fromNetBegin[0] = round
  }

  curSocket.send(targetBuf)

  if (Atomics.compareExchange(fromNetCtrl, 0, 1, 0) != 1) {
    console.log("UNEXPECTED STATUS")
  }
  Atomics.notify(fromNetCtrl, 0, 1)

  return len + round
}

function appendData(data1: Uint8Array, data2: Uint8Array<ArrayBufferLike>): Uint8Array {
  const buf = new Uint8Array(data1.byteLength + data2.byteLength)
  buf.set(new Uint8Array(data1), 0)
  buf.set(new Uint8Array(data2), data1.byteLength)
  return buf
}

function isBufReadable() {
  const begin = toNetBegin[0]
  const end = toNetEnd[0]
  let len: number
  let round: number
  if (end >= begin) {
    len = end - begin
    round = 0
  } else {
    len = toNetData.byteLength - begin
    round = end
  }
  return (len + round) > 0
}

function connect(shared: SharedArrayBuffer, toNet: SharedArrayBuffer) {
  const streamCtrl = new Int32Array(shared, 0, 1)
  const streamStatus = new Int32Array(shared, 4, 1)
  const streamLen = new Int32Array(shared, 8, 1)
  const streamData = new Uint8Array(shared, 12)
  const httpConnections: any[] = []
  let curID = 0
  const maxID = 0x7fffffff

  function getID() {
    const startID = curID
    while (true) {
      if (httpConnections[curID] == undefined) return curID
      if (curID >= maxID) {
        curID = 0
      } else {
        curID++
      }
      if (curID == startID) return -1
    }
  }

  function serveData(data: Uint8Array, len: number) {
    let length = len
    if (length > streamData.byteLength) length = streamData.byteLength
    if (length > data.byteLength) length = data.byteLength
    const buf = data.subarray(0, length)
    const remain = data.subarray(length, data.byteLength)
    streamLen[0] = buf.byteLength
    streamData.set(buf, 0)
    return remain
  }

  const toNetNotifyView = new Int32Array(toNet, 12, 1)
  let timeoutHandler: ReturnType<typeof setInterval> | null = null
  let timeoutDeadlineMilli: number | null = null

  return function (msg: MessageEvent) {
    const req_ = msg.data
    if (typeof req_ == "object" && req_.type) {
      switch (req_.type) {
        case "recv-is-readable-cancel":
          if (timeoutHandler) {
            clearTimeout(timeoutHandler)
            timeoutHandler = null
          }
          break
        case "recv-is-readable":
          if (isBufReadable()) {
            streamStatus[0] = 1
            Atomics.store(toNetNotifyView, 0, 1)
            Atomics.notify(toNetNotifyView, 0)
          } else {
            if (req_.timeout != undefined && req_.timeout > 0) {
              if (timeoutHandler) {
                clearTimeout(timeoutHandler)
                timeoutHandler = null
                timeoutDeadlineMilli = null
              }
              timeoutDeadlineMilli = Date.now() + req_.timeout * 1000
              timeoutHandler = setInterval(() => {
                if (isBufReadable()) {
                  streamStatus[0] = 1
                  Atomics.store(toNetNotifyView, 0, 1)
                } else {
                  if (Date.now() < timeoutDeadlineMilli!) return
                  streamStatus[0] = 0
                  Atomics.store(toNetNotifyView, 0, -1)
                }
                Atomics.notify(toNetNotifyView, 0)
                clearTimeout(timeoutHandler!)
                timeoutHandler = null
              }, 0.01)
            } else {
              streamStatus[0] = 0
              Atomics.store(toNetNotifyView, 0, -1)
              Atomics.notify(toNetNotifyView, 0)
            }
          }
          break
        case "notify-send-from-net":
          sockRecvWS(req_.len)
          break
        case "http_send": {
          const reqObj = JSON.parse(new TextDecoder().decode(req_.req))
          reqObj.mode = "cors"
          reqObj.credentials = "omit"
          if (reqObj.headers && reqObj.headers["User-Agent"] != "") {
            delete reqObj.headers["User-Agent"]
          }
          const reqID = getID()
          if (reqID < 0) {
            console.log("failed to get id")
            streamStatus[0] = -1
            break
          }
          httpConnections[reqID] = {
            address: new TextDecoder().decode(req_.address),
            request: reqObj,
            requestSent: false,
            reqBodybuf: new Uint8Array(0),
            reqBodyEOF: false,
            response: null,
            done: null,
            respBodybuf: null,
          }
          streamStatus[0] = reqID
          break
        }
        case "http_writebody": {
          const conn = httpConnections[req_.id]
          if (conn == undefined) {
            conn.reqBodybuf = new Uint8Array(0)
          }
          httpConnections[req_.id].reqBodybuf = appendData(conn.reqBodybuf, req_.body)
          httpConnections[req_.id].reqBodyEOF = req_.isEOF
          streamStatus[0] = 0
          if (req_.isEOF && !conn.requestSent) {
            conn.requestSent = true
            if (conn.request.method != "HEAD" && conn.request.method != "GET") {
              conn.request.body = conn.reqBodybuf
            }
            fetch(conn.address, conn.request)
              .then((resp) => {
                conn.done = false
                conn.respBodybuf = new Uint8Array(0)
                if (resp.ok) {
                  resp
                    .arrayBuffer()
                    .then((data) => {
                      const headers: Record<string, string> = {}
                      for (const key of resp.headers.keys()) {
                        if (data.byteLength > 0) {
                          if (key == "content-encoding") continue
                          if (key == "content-length") {
                            headers[key] = data.byteLength.toString()
                            continue
                          }
                        }
                        headers[key] = resp.headers.get(key)!
                      }
                      conn.response = new TextEncoder().encode(
                        JSON.stringify({
                          bodyUsed: resp.bodyUsed,
                          headers,
                          redirected: resp.redirected,
                          status: resp.status,
                          statusText: resp.statusText,
                          type: resp.type,
                          url: resp.url,
                        }),
                      )
                      conn.respBodybuf = new Uint8Array(data)
                      conn.done = true
                    })
                    .catch((error) => {
                      const headers: Record<string, string> = {}
                      for (const key of resp.headers.keys()) {
                        headers[key] = resp.headers.get(key)!
                      }
                      conn.response = new TextEncoder().encode(
                        JSON.stringify({
                          bodyUsed: resp.bodyUsed,
                          headers,
                          redirected: resp.redirected,
                          status: resp.status,
                          statusText: resp.statusText,
                          type: resp.type,
                          url: resp.url,
                        }),
                      )
                      conn.respBodybuf = new Uint8Array(0)
                      conn.done = true
                      console.log("failed to fetch body: " + error)
                    })
                } else {
                  const headers: Record<string, string> = {}
                  for (const key of resp.headers.keys()) {
                    headers[key] = resp.headers.get(key)!
                  }
                  conn.response = new TextEncoder().encode(
                    JSON.stringify({
                      bodyUsed: resp.bodyUsed,
                      headers,
                      redirected: resp.redirected,
                      status: resp.status,
                      statusText: resp.statusText,
                      type: resp.type,
                      url: resp.url,
                    }),
                  )
                  conn.done = true
                }
              })
              .catch((_error) => {
                conn.response = new TextEncoder().encode(
                  JSON.stringify({
                    status: 503,
                    statusText: "Service Unavailable",
                  }),
                )
                conn.respBodybuf = new Uint8Array(0)
                conn.done = true
              })
          }
          break
        }
        case "http_isreadable":
          if (httpConnections[req_.id] != undefined && httpConnections[req_.id].response != null) {
            streamData[0] = 1
          } else {
            streamData[0] = 0
          }
          streamStatus[0] = 0
          break
        case "http_recv":
          if (httpConnections[req_.id] == undefined || httpConnections[req_.id].response == null) {
            console.log("response is not available")
            streamStatus[0] = -1
            break
          }
          httpConnections[req_.id].response = serveData(httpConnections[req_.id].response, req_.len)
          streamStatus[0] = 0
          if (httpConnections[req_.id].response.byteLength == 0) {
            streamStatus[0] = 1 // isEOF
          }
          break
        case "http_readbody":
          if (httpConnections[req_.id] == undefined || httpConnections[req_.id].response == null) {
            console.log("response body is not available")
            streamStatus[0] = -1
            break
          }
          httpConnections[req_.id].respBodybuf = serveData(httpConnections[req_.id].respBodybuf, req_.len)
          streamStatus[0] = 0
          if (httpConnections[req_.id].done && httpConnections[req_.id].respBodybuf.byteLength == 0) {
            streamStatus[0] = 1
            delete httpConnections[req_.id]
          }
          break
        case "send_cert":
          certBuf = appendData(certBuf, req_.buf)
          if (certResolve) certResolve(certBuf)
          streamStatus[0] = 0
          break
        default:
          console.log("unknown request: " + req_.type)
          return
      }
      Atomics.store(streamCtrl, 0, 1)
      Atomics.notify(streamCtrl, 0)
    }
  }
}

let certBuf: Uint8Array<ArrayBufferLike> = new Uint8Array(0)
let certResolve: ((cert: Uint8Array) => void) | null = null

export async function startNetworkStack(wasmImageUrl: string): Promise<Uint8Array> {
  const address = "http://localhost:9999/"
  console.log("[net-stack] Starting network stack...")

  const mockServer = ws.link(address)
  const handlers = [
    mockServer.addEventListener("connection", ({ client }) => {
      console.log("[net-stack] WebSocket connection received")
      if (curSocket != null) {
        console.log("[net-stack] duplicated connection")
        return
      }
      curSocket = client
      sockAccept()
      client.addEventListener("message", (event) => {
        if (!accepted) return
        eventQueue.push(new Uint8Array(event.data as ArrayBuffer))
        sockSend()
      })
    }),
  ]

  const worker = setupWorker(...handlers)
  console.log("[net-stack] Starting MSW service worker...")
  await worker.start({ quiet: true })
  console.log("[net-stack] MSW started, spawning stack worker...")

  // Firefox + COEP breaks URL-based and module blob workers.
  // Classic blob worker with dynamic import() works around this.
  const workerModuleUrl = new URL("./stack-worker.ts", import.meta.url).href
  const loaderCode = `import(${JSON.stringify(workerModuleUrl)}).catch(e => console.error("[stack-worker] import failed:", e))`
  const stackWorker = new Worker(URL.createObjectURL(new Blob([loaderCode], { type: "text/javascript" })))
  stackWorker.onerror = (e) => {
    console.error("[net-stack] Worker error:", (e as ErrorEvent).message)
  }

  const proxyShared = new SharedArrayBuffer(12 + 1024 * 1024)

  const toShared = new SharedArrayBuffer(1024 * 1024)
  const fromShared = new SharedArrayBuffer(1024 * 1024)
  const toNetCtrlInit = new Int32Array(toShared, 0, 1)
  const toNetBeginInit = new Int32Array(toShared, 4, 1)
  const toNetEndInit = new Int32Array(toShared, 8, 1)
  const toNetNotifyInit = new Int32Array(toShared, 12, 1)
  const fromNetCtrlInit = new Int32Array(fromShared, 0, 1)
  const fromNetBeginInit = new Int32Array(fromShared, 4, 1)
  const fromNetEndInit = new Int32Array(fromShared, 8, 1)
  toNetCtrlInit[0] = 0
  toNetBeginInit[0] = 0
  toNetEndInit[0] = 0
  toNetNotifyInit[0] = 0
  fromNetCtrlInit[0] = 0
  fromNetBeginInit[0] = 0
  fromNetEndInit[0] = 0

  const metaFromShared = new SharedArrayBuffer(4096)
  const metaCtrlInit = new Int32Array(metaFromShared, 0, 1)
  const metaBeginInit = new Int32Array(metaFromShared, 4, 1)
  const metaEndInit = new Int32Array(metaFromShared, 8, 1)
  const metaStatusInit = new Int32Array(metaFromShared, 12, 1)
  metaCtrlInit[0] = 0
  metaBeginInit[0] = 0
  metaEndInit[0] = 0
  metaStatusInit[0] = 0

  registerConnBuffer(toShared, fromShared)
  registerMetaBuffer(metaFromShared)

  const certPromise = new Promise<Uint8Array>((resolve) => {
    certResolve = resolve
  })

  // Wait for worker to signal it's ready before sending init
  // (dynamic import() is async, so onmessage may not be set when postMessage fires)
  const onMessage = connect(proxyShared, toShared)
  await new Promise<void>((resolve) => {
    stackWorker.onmessage = (msg) => {
      if (msg.data?.type === "ready") {
        console.log("[net-stack] Worker ready, sending init...")
        stackWorker.onmessage = onMessage
        resolve()
      }
    }
  })
  stackWorker.postMessage({
    type: "init",
    buf: proxyShared,
    toBuf: toShared,
    fromBuf: fromShared,
    stackWasmURL: wasmImageUrl,
    metaFromBuf: metaFromShared,
  })

  return certPromise
}
