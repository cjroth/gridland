import * as wasitype from "@bjorn3/browser_wasi_shim"

export class EventType {
  variant: "clock" | "fd_read" | "fd_write"

  constructor(variant: "clock" | "fd_read" | "fd_write") {
    this.variant = variant
  }

  static from_u8(data: number): EventType {
    switch (data) {
      case wasitype.wasi.EVENTTYPE_CLOCK:
        return new EventType("clock")
      case wasitype.wasi.EVENTTYPE_FD_READ:
        return new EventType("fd_read")
      case wasitype.wasi.EVENTTYPE_FD_WRITE:
        return new EventType("fd_write")
      default:
        throw "Invalid event type " + String(data)
    }
  }

  to_u8(): number {
    switch (this.variant) {
      case "clock":
        return wasitype.wasi.EVENTTYPE_CLOCK
      case "fd_read":
        return wasitype.wasi.EVENTTYPE_FD_READ
      case "fd_write":
        return wasitype.wasi.EVENTTYPE_FD_WRITE
      default:
        throw "unreachable"
    }
  }
}

export class Event {
  userdata!: bigint
  error!: number
  type!: EventType

  write_bytes(view: DataView, ptr: number) {
    view.setBigUint64(ptr, this.userdata, true)
    view.setUint8(ptr + 8, this.error)
    view.setUint8(ptr + 9, 0)
    view.setUint8(ptr + 10, this.type.to_u8())
  }

  static write_bytes_array(view: DataView, ptr: number, events: Array<Event>) {
    for (let i = 0; i < events.length; i++) {
      events[i].write_bytes(view, ptr + 32 * i)
    }
  }
}

export class SubscriptionClock {
  timeout!: number

  static read_bytes(view: DataView, ptr: number): SubscriptionClock {
    const self = new SubscriptionClock()
    self.timeout = Number(view.getBigUint64(ptr + 8, true))
    return self
  }
}

export class SubscriptionFdReadWrite {
  fd!: number

  static read_bytes(view: DataView, ptr: number): SubscriptionFdReadWrite {
    const self = new SubscriptionFdReadWrite()
    self.fd = view.getUint32(ptr, true)
    return self
  }
}

export class SubscriptionU {
  tag!: EventType
  data!: SubscriptionClock | SubscriptionFdReadWrite

  static read_bytes(view: DataView, ptr: number): SubscriptionU {
    const self = new SubscriptionU()
    self.tag = EventType.from_u8(view.getUint8(ptr))
    switch (self.tag.variant) {
      case "clock":
        self.data = SubscriptionClock.read_bytes(view, ptr + 8)
        break
      case "fd_read":
      case "fd_write":
        self.data = SubscriptionFdReadWrite.read_bytes(view, ptr + 8)
        break
      default:
        throw "unreachable"
    }
    return self
  }
}

export class Subscription {
  userdata!: bigint
  u!: SubscriptionU

  static read_bytes(view: DataView, ptr: number): Subscription {
    const subscription = new Subscription()
    subscription.userdata = view.getBigUint64(ptr, true)
    subscription.u = SubscriptionU.read_bytes(view, ptr + 8)
    return subscription
  }

  static read_bytes_array(view: DataView, ptr: number, len: number): Array<Subscription> {
    const subscriptions = []
    for (let i = 0; i < len; i++) {
      subscriptions.push(Subscription.read_bytes(view, ptr + 48 * i))
    }
    return subscriptions
  }
}

export function wasiHackSocket(
  wasi: any,
  listenfd: number,
  connfd: number,
  sockAcceptFn: () => boolean,
  sockSendFn: (data: Uint8Array) => number,
  sockRecvFn: (buf: Uint8Array, offset: number, len: number) => number,
) {
  const ERRNO_INVAL = 28
  const ERRNO_AGAIN = 6
  let connfdUsed = false

  const _fd_close = wasi.wasiImport.fd_close
  wasi.wasiImport.fd_close = (fd: number) => {
    if (fd == connfd) {
      connfdUsed = false
      return 0
    }
    return _fd_close.apply(wasi.wasiImport, [fd])
  }

  const _fd_read = wasi.wasiImport.fd_read
  wasi.wasiImport.fd_read = (fd: number, iovs_ptr: number, iovs_len: number, nread_ptr: number) => {
    if (fd == connfd) {
      return wasi.wasiImport.sock_recv(fd, iovs_ptr, iovs_len, 0, nread_ptr, 0)
    }
    return _fd_read.apply(wasi.wasiImport, [fd, iovs_ptr, iovs_len, nread_ptr])
  }

  const _fd_write = wasi.wasiImport.fd_write
  wasi.wasiImport.fd_write = (fd: number, iovs_ptr: number, iovs_len: number, nwritten_ptr: number) => {
    if (fd == connfd) {
      return wasi.wasiImport.sock_send(fd, iovs_ptr, iovs_len, 0, nwritten_ptr)
    }
    return _fd_write.apply(wasi.wasiImport, [fd, iovs_ptr, iovs_len, nwritten_ptr])
  }

  const _fd_fdstat_get = wasi.wasiImport.fd_fdstat_get
  wasi.wasiImport.fd_fdstat_get = (fd: number, fdstat_ptr: number) => {
    if ((fd == listenfd) || (fd == connfd && connfdUsed)) {
      const buffer = new DataView(wasi.inst.exports.memory.buffer)
      buffer.setUint8(fdstat_ptr, 6) // filetype = socket_stream
      buffer.setUint8(fdstat_ptr + 1, 2) // fdflags = nonblock
      return 0
    }
    return _fd_fdstat_get.apply(wasi.wasiImport, [fd, fdstat_ptr])
  }

  const _fd_prestat_get = wasi.wasiImport.fd_prestat_get
  wasi.wasiImport.fd_prestat_get = (fd: number, prestat_ptr: number) => {
    if ((fd == listenfd) || (fd == connfd)) {
      const buffer = new DataView(wasi.inst.exports.memory.buffer)
      buffer.setUint8(prestat_ptr, 1)
      return 0
    }
    return _fd_prestat_get.apply(wasi.wasiImport, [fd, prestat_ptr])
  }

  wasi.wasiImport.sock_accept = (fd: number, _flags: number, fd_ptr: number) => {
    if (fd != listenfd) {
      console.log("sock_accept: unknown fd " + fd)
      return ERRNO_INVAL
    }
    if (connfdUsed) {
      console.log("sock_accept: multi-connection is unsupported")
      return ERRNO_INVAL
    }
    if (!sockAcceptFn()) {
      return ERRNO_AGAIN
    }
    connfdUsed = true
    const buffer = new DataView(wasi.inst.exports.memory.buffer)
    buffer.setUint32(fd_ptr, connfd, true)
    return 0
  }

  wasi.wasiImport.sock_send = (fd: number, iovs_ptr: number, iovs_len: number, _si_flags: number, nwritten_ptr: number) => {
    if (fd != connfd) {
      console.log("sock_send: unknown fd " + fd)
      return ERRNO_INVAL
    }
    const buffer = new DataView(wasi.inst.exports.memory.buffer)
    const buffer8 = new Uint8Array(wasi.inst.exports.memory.buffer)
    const iovecs = wasitype.wasi.Ciovec.read_bytes_array(buffer, iovs_ptr, iovs_len)
    let wtotal = 0
    for (let i = 0; i < iovecs.length; i++) {
      const iovec = iovecs[i]
      if (iovec.buf_len == 0) continue
      const ret = sockSendFn(buffer8.subarray(iovec.buf, iovec.buf + iovec.buf_len))
      if (ret < 0) return ERRNO_INVAL
      wtotal += iovec.buf_len
    }
    buffer.setUint32(nwritten_ptr, wtotal, true)
    return 0
  }

  wasi.wasiImport.sock_recv = (fd: number, iovs_ptr: number, iovs_len: number, ri_flags: number, nread_ptr: number, _ro_flags_ptr: number) => {
    if (ri_flags != 0) {
      console.log("ri_flags are unsupported")
    }
    if (fd != connfd) {
      console.log("sock_recv: unknown fd " + fd)
      return ERRNO_INVAL
    }
    const buffer = new DataView(wasi.inst.exports.memory.buffer)
    const buffer8 = new Uint8Array(wasi.inst.exports.memory.buffer)
    const iovecs = wasitype.wasi.Iovec.read_bytes_array(buffer, iovs_ptr, iovs_len)
    let nread = 0
    for (let i = 0; i < iovecs.length; i++) {
      const iovec = iovecs[i]
      if (iovec.buf_len == 0) continue
      const retlen = sockRecvFn(buffer8, iovec.buf, iovec.buf_len)
      if (retlen <= 0 && i == 0) return ERRNO_AGAIN
      nread += retlen
    }
    buffer.setUint32(nread_ptr, nread, true)
    return 0
  }

  wasi.wasiImport.sock_shutdown = (fd: number, _sdflags: number) => {
    if (fd == connfd) {
      connfdUsed = false
    }
    return 0
  }
}
