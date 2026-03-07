console.log("[stack-worker] Module loading...")

import { WASI } from "@bjorn3/browser_wasi_shim"
import * as wasitype from "@bjorn3/browser_wasi_shim"
import { Event, EventType, Subscription, wasiHackSocket } from "./wasi-util"

console.log("[stack-worker] Imports resolved, worker ready")
postMessage({ type: "ready" })

const ERRNO_INVAL = 28

let streamCtrl: Int32Array
let streamStatus: Int32Array
let streamLen: Int32Array
let streamData: Uint8Array

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

const errStatus = { val: 0 }
let accepted = false

function registerSocketBuffer(shared: SharedArrayBuffer) {
  streamCtrl = new Int32Array(shared, 0, 1)
  streamStatus = new Int32Array(shared, 4, 1)
  streamLen = new Int32Array(shared, 8, 1)
  streamData = new Uint8Array(shared, 12)
}

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

function sockAccept(): boolean {
  accepted = true
  return true
}

function sockSend(data: Uint8Array): number {
  if (!accepted) return -1

  for (;;) {
    if (Atomics.compareExchange(fromNetCtrl, 0, 0, 1) == 0) break
    Atomics.wait(fromNetCtrl, 0, 1)
  }

  let begin = fromNetBegin[0]
  let end = fromNetEnd[0]
  let len: number
  let round: number
  if (end >= begin) {
    len = fromNetData.byteLength - end
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
      fromNetData.set(data.subarray(0, len), end)
      fromNetEnd[0] = end + len
    }
    if (round > 0 && data.length > len) {
      if (round > data.length - len) round = data.length - len
      fromNetData.set(data.subarray(len, len + round), 0)
      fromNetEnd[0] = round
    }
  }

  if (Atomics.compareExchange(fromNetCtrl, 0, 1, 0) != 1) {
    console.log("UNEXPECTED STATUS")
  }
  Atomics.notify(fromNetCtrl, 0, 1)

  // notify data is sent from stack
  streamCtrl[0] = 0
  postMessage({ type: "notify-send-from-net", len: data.length })
  Atomics.wait(streamCtrl, 0, 0)

  return 0
}

function sockRecv(targetBuf: Uint8Array, targetOffset: number, targetLen: number): number {
  if (!accepted) return -1

  for (;;) {
    if (Atomics.compareExchange(toNetCtrl, 0, 0, 1) == 0) break
    Atomics.wait(toNetCtrl, 0, 1)
  }

  let begin = toNetBegin[0]
  let end = toNetEnd[0]
  let len: number
  let round: number
  if (end >= begin) {
    len = end - begin
    round = 0
  } else {
    len = toNetData.byteLength - begin
    round = end
  }
  if (targetLen < len) {
    len = targetLen
    round = 0
  } else if (targetLen < len + round) {
    round = targetLen - len
  }

  if (len > 0) {
    targetBuf.set(toNetData.subarray(begin, begin + len), targetOffset)
    toNetBegin[0] = begin + len
  }
  if (round > 0) {
    targetBuf.set(toNetData.subarray(0, round), targetOffset + len)
    toNetBegin[0] = round
  }

  if (Atomics.compareExchange(toNetCtrl, 0, 1, 0) != 1) {
    console.log("UNEXPECTED STATUS")
  }
  Atomics.notify(toNetCtrl, 0, 1)

  return len + round
}

function sockWaitForReadable(timeout: number): boolean | typeof errStatus {
  if (!accepted) {
    errStatus.val = -1
    return errStatus
  }

  for (;;) {
    if (Atomics.compareExchange(toNetCtrl, 0, 0, 1) == 0) break
    Atomics.wait(toNetCtrl, 0, 1)
  }

  let begin = toNetBegin[0]
  let end = toNetEnd[0]
  let len: number
  let round: number
  if (end >= begin) {
    len = end - begin
    round = 0
  } else {
    len = toNetData.byteLength - begin
    round = end
  }
  const ready = (len + round) > 0

  if (Atomics.compareExchange(toNetCtrl, 0, 1, 0) != 1) {
    console.log("UNEXPECTED STATUS")
  }
  Atomics.notify(toNetCtrl, 0, 1)

  if (ready) return true
  if (timeout == 0) return false

  // buffer not ready; wait for readable
  streamCtrl[0] = 0
  Atomics.store(toNetNotify, 0, 0)
  postMessage({ type: "recv-is-readable", timeout: timeout })
  Atomics.wait(streamCtrl, 0, 0)
  Atomics.wait(toNetNotify, 0, 0)
  const res = Atomics.load(toNetNotify, 0)

  streamCtrl[0] = 0
  postMessage({ type: "recv-is-readable-cancel" })
  Atomics.wait(streamCtrl, 0, 0)

  Atomics.store(toNetNotify, 0, 0)
  return res == 1
}

function sendCert(data: Uint8Array) {
  streamCtrl[0] = 0
  postMessage({ type: "send_cert", buf: data })
  Atomics.wait(streamCtrl, 0, 0)
}

function appendData(data1: Uint8Array, data2: Uint8Array<ArrayBufferLike>): Uint8Array {
  const buf = new Uint8Array(data1.byteLength + data2.byteLength)
  buf.set(new Uint8Array(data1), 0)
  buf.set(new Uint8Array(data2), data1.byteLength)
  return buf
}

function wasiHack(wasi: any, certfd: number, connfd: number) {
  let certbuf: Uint8Array<ArrayBufferLike> = new Uint8Array(0)

  const _fd_close = wasi.wasiImport.fd_close
  wasi.wasiImport.fd_close = (fd: number) => {
    if (fd == certfd) {
      sendCert(certbuf)
      return 0
    }
    return _fd_close.apply(wasi.wasiImport, [fd])
  }

  const _fd_fdstat_get = wasi.wasiImport.fd_fdstat_get
  wasi.wasiImport.fd_fdstat_get = (fd: number, fdstat_ptr: number) => {
    if (fd == certfd) return 0
    return _fd_fdstat_get.apply(wasi.wasiImport, [fd, fdstat_ptr])
  }

  wasi.wasiImport.fd_fdstat_set_flags = (_fd: number, _fdflags: number) => {
    return 0
  }

  const _fd_write = wasi.wasiImport.fd_write
  wasi.wasiImport.fd_write = (fd: number, iovs_ptr: number, iovs_len: number, nwritten_ptr: number) => {
    if (fd == 1 || fd == 2 || fd == certfd) {
      const buffer = new DataView(wasi.inst.exports.memory.buffer)
      const buffer8 = new Uint8Array(wasi.inst.exports.memory.buffer)
      const iovecs = wasitype.wasi.Ciovec.read_bytes_array(buffer, iovs_ptr, iovs_len)
      let wtotal = 0
      for (let i = 0; i < iovecs.length; i++) {
        const iovec = iovecs[i]
        const buf = buffer8.slice(iovec.buf, iovec.buf + iovec.buf_len)
        if (buf.length == 0) continue
        console.log(new TextDecoder().decode(buf))
        if (fd == certfd) {
          certbuf = appendData(certbuf, buf)
        }
        wtotal += buf.length
      }
      buffer.setUint32(nwritten_ptr, wtotal, true)
      return 0
    }
    console.log("fd_write: unknown fd " + fd)
    return _fd_write.apply(wasi.wasiImport, [fd, iovs_ptr, iovs_len, nwritten_ptr])
  }

  wasi.wasiImport.poll_oneoff = (in_ptr: number, out_ptr: number, nsubscriptions: number, nevents_ptr: number) => {
    if (nsubscriptions == 0) return ERRNO_INVAL

    const buffer = new DataView(wasi.inst.exports.memory.buffer)
    const in_ = Subscription.read_bytes_array(buffer, in_ptr, nsubscriptions)
    let isReadPollStdin = false
    let isReadPollConn = false
    let isClockPoll = false
    let pollSubConn: any
    let clockSub: any
    let timeout = Number.MAX_VALUE

    for (const sub of in_) {
      if (sub.u.tag.variant == "fd_read") {
        if ((sub.u.data as any).fd != 0 && (sub.u.data as any).fd != connfd) {
          return ERRNO_INVAL
        }
        if ((sub.u.data as any).fd == 0) {
          isReadPollStdin = true
        } else {
          isReadPollConn = true
          pollSubConn = sub
        }
      } else if (sub.u.tag.variant == "clock") {
        if ((sub.u.data as any).timeout < timeout) {
          timeout = (sub.u.data as any).timeout
          isClockPoll = true
          clockSub = sub
        }
      } else {
        return ERRNO_INVAL
      }
    }

    if (!isClockPoll) timeout = 0

    const events: Event[] = []
    if (isReadPollStdin || isReadPollConn || isClockPoll) {
      const sockreadable = sockWaitForReadable(timeout / 1000000000)
      if (isReadPollConn) {
        if (sockreadable === errStatus) {
          return ERRNO_INVAL
        } else if (sockreadable === true) {
          const event = new Event()
          event.userdata = pollSubConn.userdata
          event.error = 0
          event.type = new EventType("fd_read")
          events.push(event)
        }
      }
      if (isClockPoll) {
        const event = new Event()
        event.userdata = clockSub.userdata
        event.error = 0
        event.type = new EventType("clock")
        events.push(event)
      }
    }

    Event.write_bytes_array(buffer, out_ptr, events)
    buffer.setUint32(nevents_ptr, events.length, true)
    return 0
  }
}

function envHack(wasi: any) {
  return {
    http_send(addressP: number, addresslen: number, reqP: number, reqlen: number, idP: number) {
      const buffer = new DataView(wasi.inst.exports.memory.buffer)
      const address = new Uint8Array(wasi.inst.exports.memory.buffer, addressP, addresslen)
      const req = new Uint8Array(wasi.inst.exports.memory.buffer, reqP, reqlen)
      streamCtrl[0] = 0
      postMessage({
        type: "http_send",
        address: address.slice(0, address.length),
        req: req.slice(0, req.length),
      })
      Atomics.wait(streamCtrl, 0, 0)
      if (streamStatus[0] < 0) return ERRNO_INVAL
      buffer.setUint32(idP, streamStatus[0], true)
      return 0
    },
    http_writebody(id: number, bodyP: number, bodylen: number, nwrittenP: number, isEOF: number) {
      const buffer = new DataView(wasi.inst.exports.memory.buffer)
      const body = new Uint8Array(wasi.inst.exports.memory.buffer, bodyP, bodylen)
      streamCtrl[0] = 0
      postMessage({
        type: "http_writebody",
        id,
        body: body.slice(0, body.length),
        isEOF,
      })
      Atomics.wait(streamCtrl, 0, 0)
      if (streamStatus[0] < 0) return ERRNO_INVAL
      buffer.setUint32(nwrittenP, bodylen, true)
      return 0
    },
    http_isreadable(id: number, isOKP: number) {
      const buffer = new DataView(wasi.inst.exports.memory.buffer)
      streamCtrl[0] = 0
      postMessage({ type: "http_isreadable", id })
      Atomics.wait(streamCtrl, 0, 0)
      if (streamStatus[0] < 0) return ERRNO_INVAL
      buffer.setUint32(isOKP, streamData[0] == 1 ? 1 : 0, true)
      return 0
    },
    http_recv(id: number, respP: number, bufsize: number, respsizeP: number, isEOFP: number) {
      const buffer = new DataView(wasi.inst.exports.memory.buffer)
      const buffer8 = new Uint8Array(wasi.inst.exports.memory.buffer)
      streamCtrl[0] = 0
      postMessage({ type: "http_recv", id, len: bufsize })
      Atomics.wait(streamCtrl, 0, 0)
      if (streamStatus[0] < 0) return ERRNO_INVAL
      const ddlen = streamLen[0]
      buffer8.set(streamData.subarray(0, ddlen), respP)
      buffer.setUint32(respsizeP, ddlen, true)
      buffer.setUint32(isEOFP, streamStatus[0] == 1 ? 1 : 0, true)
      return 0
    },
    http_readbody(id: number, bodyP: number, bufsize: number, bodysizeP: number, isEOFP: number) {
      const buffer = new DataView(wasi.inst.exports.memory.buffer)
      const buffer8 = new Uint8Array(wasi.inst.exports.memory.buffer)
      streamCtrl[0] = 0
      postMessage({ type: "http_readbody", id, len: bufsize })
      Atomics.wait(streamCtrl, 0, 0)
      if (streamStatus[0] < 0) return ERRNO_INVAL
      const ddlen = streamLen[0]
      buffer8.set(streamData.subarray(0, ddlen), bodyP)
      buffer.setUint32(bodysizeP, ddlen, true)
      buffer.setUint32(isEOFP, streamStatus[0] == 1 ? 1 : 0, true)
      return 0
    },
  }
}

self.onmessage = (msg: MessageEvent) => {
  const req_ = msg.data
  if (typeof req_ != "object" || req_.type != "init") return

  console.log("[stack-worker] init received, setting up buffers...")

  if (req_.buf) {
    registerSocketBuffer(req_.buf)
    registerConnBuffer(req_.toBuf, req_.fromBuf)
    registerMetaBuffer(req_.metaFromBuf)
  }

  const certfd = 3
  const listenfd = 4
  const connfd = 5
  const fds: any[] = [
    undefined, // 0: stdin
    undefined, // 1: stdout
    undefined, // 2: stderr
    undefined, // 3: certfd
    undefined, // 4: listenfd
    undefined, // 5: connfd
  ]
  const args = ["arg0", "--certfd=" + certfd, "--net-listenfd=" + listenfd, "--debug"]
  const wasi = new WASI(args, [], fds)
  wasiHack(wasi, certfd, connfd)
  wasiHackSocket(wasi, listenfd, connfd, sockAccept, sockSend, sockRecv)

  console.log("[stack-worker] Fetching c2w-net-proxy.wasm from:", req_.stackWasmURL)
  fetch(req_.stackWasmURL)
    .then((resp) => {
      console.log("[stack-worker] Fetch response:", resp.status, resp.statusText)
      return resp.blob()
    })
    .then((blob) => {
      console.log("[stack-worker] Decompressing gzip, blob size:", blob.size)
      const ds = new DecompressionStream("gzip")
      return new Response(blob.stream().pipeThrough(ds)).arrayBuffer()
    })
    .then((wasm) => {
      console.log("[stack-worker] WASM decompressed, size:", wasm.byteLength, "- instantiating...")
      WebAssembly.instantiate(wasm, {
        wasi_snapshot_preview1: wasi.wasiImport,
        env: envHack(wasi),
      }).then((inst) => {
        console.log("[stack-worker] WASM instantiated, starting...")
        wasi.start(inst.instance as any)
      })
    })
    .catch((err) => {
      console.error("[stack-worker] Failed to load c2w-net-proxy:", err)
    })
}
