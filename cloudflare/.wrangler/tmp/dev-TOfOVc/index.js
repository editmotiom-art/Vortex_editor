var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};

// .wrangler/tmp/bundle-sEhtfm/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
__name(stripCfConnectingIPHeader, "stripCfConnectingIPHeader");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    return Reflect.apply(target, thisArg, [
      stripCfConnectingIPHeader.apply(null, argArray)
    ]);
  }
});

// node_modules/unenv/dist/runtime/_internal/utils.mjs
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError, "createNotImplementedError");
function notImplemented(name) {
  const fn = /* @__PURE__ */ __name(() => {
    throw createNotImplementedError(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
__name(notImplemented, "notImplemented");
function notImplementedClass(name) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name} is not implemented yet!`);
    }
  };
}
__name(notImplementedClass, "notImplementedClass");

// node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
var _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
var nodeTiming = {
  name: "node",
  entryType: "node",
  startTime: 0,
  duration: 0,
  nodeStart: 0,
  v8Start: 0,
  bootstrapComplete: 0,
  environment: 0,
  loopStart: 0,
  loopExit: 0,
  idleTime: 0,
  uvMetricsInfo: {
    loopCount: 0,
    events: 0,
    eventsWaiting: 0
  },
  detail: void 0,
  toJSON() {
    return this;
  }
};
var PerformanceEntry = class {
  __unenv__ = true;
  detail;
  entryType = "event";
  name;
  startTime;
  constructor(name, options) {
    this.name = name;
    this.startTime = options?.startTime || _performanceNow();
    this.detail = options?.detail;
  }
  get duration() {
    return _performanceNow() - this.startTime;
  }
  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      detail: this.detail
    };
  }
};
__name(PerformanceEntry, "PerformanceEntry");
var PerformanceMark = /* @__PURE__ */ __name(class PerformanceMark2 extends PerformanceEntry {
  entryType = "mark";
  constructor() {
    super(...arguments);
  }
  get duration() {
    return 0;
  }
}, "PerformanceMark");
var PerformanceMeasure = class extends PerformanceEntry {
  entryType = "measure";
};
__name(PerformanceMeasure, "PerformanceMeasure");
var PerformanceResourceTiming = class extends PerformanceEntry {
  entryType = "resource";
  serverTiming = [];
  connectEnd = 0;
  connectStart = 0;
  decodedBodySize = 0;
  domainLookupEnd = 0;
  domainLookupStart = 0;
  encodedBodySize = 0;
  fetchStart = 0;
  initiatorType = "";
  name = "";
  nextHopProtocol = "";
  redirectEnd = 0;
  redirectStart = 0;
  requestStart = 0;
  responseEnd = 0;
  responseStart = 0;
  secureConnectionStart = 0;
  startTime = 0;
  transferSize = 0;
  workerStart = 0;
  responseStatus = 0;
};
__name(PerformanceResourceTiming, "PerformanceResourceTiming");
var PerformanceObserverEntryList = class {
  __unenv__ = true;
  getEntries() {
    return [];
  }
  getEntriesByName(_name, _type) {
    return [];
  }
  getEntriesByType(type) {
    return [];
  }
};
__name(PerformanceObserverEntryList, "PerformanceObserverEntryList");
var Performance = class {
  __unenv__ = true;
  timeOrigin = _timeOrigin;
  eventCounts = /* @__PURE__ */ new Map();
  _entries = [];
  _resourceTimingBufferSize = 0;
  navigation = void 0;
  timing = void 0;
  timerify(_fn, _options) {
    throw createNotImplementedError("Performance.timerify");
  }
  get nodeTiming() {
    return nodeTiming;
  }
  eventLoopUtilization() {
    return {};
  }
  markResourceTiming() {
    return new PerformanceResourceTiming("");
  }
  onresourcetimingbufferfull = null;
  now() {
    if (this.timeOrigin === _timeOrigin) {
      return _performanceNow();
    }
    return Date.now() - this.timeOrigin;
  }
  clearMarks(markName) {
    this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
  }
  clearMeasures(measureName) {
    this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
  }
  clearResourceTimings() {
    this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
  }
  getEntries() {
    return this._entries;
  }
  getEntriesByName(name, type) {
    return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
  }
  getEntriesByType(type) {
    return this._entries.filter((e) => e.entryType === type);
  }
  mark(name, options) {
    const entry = new PerformanceMark(name, options);
    this._entries.push(entry);
    return entry;
  }
  measure(measureName, startOrMeasureOptions, endMark) {
    let start;
    let end;
    if (typeof startOrMeasureOptions === "string") {
      start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
      end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
    } else {
      start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
      end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
    }
    const entry = new PerformanceMeasure(measureName, {
      startTime: start,
      detail: {
        start,
        end
      }
    });
    this._entries.push(entry);
    return entry;
  }
  setResourceTimingBufferSize(maxSize) {
    this._resourceTimingBufferSize = maxSize;
  }
  addEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.addEventListener");
  }
  removeEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.removeEventListener");
  }
  dispatchEvent(event) {
    throw createNotImplementedError("Performance.dispatchEvent");
  }
  toJSON() {
    return this;
  }
};
__name(Performance, "Performance");
var PerformanceObserver = class {
  __unenv__ = true;
  _callback = null;
  constructor(callback) {
    this._callback = callback;
  }
  takeRecords() {
    return [];
  }
  disconnect() {
    throw createNotImplementedError("PerformanceObserver.disconnect");
  }
  observe(options) {
    throw createNotImplementedError("PerformanceObserver.observe");
  }
  bind(fn) {
    return fn;
  }
  runInAsyncScope(fn, thisArg, ...args) {
    return fn.call(thisArg, ...args);
  }
  asyncId() {
    return 0;
  }
  triggerAsyncId() {
    return 0;
  }
  emitDestroy() {
    return this;
  }
};
__name(PerformanceObserver, "PerformanceObserver");
__publicField(PerformanceObserver, "supportedEntryTypes", []);
var performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();

// node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
globalThis.performance = performance;
globalThis.Performance = Performance;
globalThis.PerformanceEntry = PerformanceEntry;
globalThis.PerformanceMark = PerformanceMark;
globalThis.PerformanceMeasure = PerformanceMeasure;
globalThis.PerformanceObserver = PerformanceObserver;
globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
globalThis.PerformanceResourceTiming = PerformanceResourceTiming;

// node_modules/unenv/dist/runtime/node/console.mjs
import { Writable } from "node:stream";

// node_modules/unenv/dist/runtime/mock/noop.mjs
var noop_default = Object.assign(() => {
}, { __unenv__: true });

// node_modules/unenv/dist/runtime/node/console.mjs
var _console = globalThis.console;
var _ignoreErrors = true;
var _stderr = new Writable();
var _stdout = new Writable();
var log = _console?.log ?? noop_default;
var info = _console?.info ?? log;
var trace = _console?.trace ?? info;
var debug = _console?.debug ?? log;
var table = _console?.table ?? log;
var error = _console?.error ?? log;
var warn = _console?.warn ?? error;
var createTask = _console?.createTask ?? /* @__PURE__ */ notImplemented("console.createTask");
var clear = _console?.clear ?? noop_default;
var count = _console?.count ?? noop_default;
var countReset = _console?.countReset ?? noop_default;
var dir = _console?.dir ?? noop_default;
var dirxml = _console?.dirxml ?? noop_default;
var group = _console?.group ?? noop_default;
var groupEnd = _console?.groupEnd ?? noop_default;
var groupCollapsed = _console?.groupCollapsed ?? noop_default;
var profile = _console?.profile ?? noop_default;
var profileEnd = _console?.profileEnd ?? noop_default;
var time = _console?.time ?? noop_default;
var timeEnd = _console?.timeEnd ?? noop_default;
var timeLog = _console?.timeLog ?? noop_default;
var timeStamp = _console?.timeStamp ?? noop_default;
var Console = _console?.Console ?? /* @__PURE__ */ notImplementedClass("console.Console");
var _times = /* @__PURE__ */ new Map();
var _stdoutErrorHandler = noop_default;
var _stderrErrorHandler = noop_default;

// node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs
var workerdConsole = globalThis["console"];
var {
  assert,
  clear: clear2,
  // @ts-expect-error undocumented public API
  context,
  count: count2,
  countReset: countReset2,
  // @ts-expect-error undocumented public API
  createTask: createTask2,
  debug: debug2,
  dir: dir2,
  dirxml: dirxml2,
  error: error2,
  group: group2,
  groupCollapsed: groupCollapsed2,
  groupEnd: groupEnd2,
  info: info2,
  log: log2,
  profile: profile2,
  profileEnd: profileEnd2,
  table: table2,
  time: time2,
  timeEnd: timeEnd2,
  timeLog: timeLog2,
  timeStamp: timeStamp2,
  trace: trace2,
  warn: warn2
} = workerdConsole;
Object.assign(workerdConsole, {
  Console,
  _ignoreErrors,
  _stderr,
  _stderrErrorHandler,
  _stdout,
  _stdoutErrorHandler,
  _times
});
var console_default = workerdConsole;

// node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console
globalThis.console = console_default;

// node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
  const now = Date.now();
  const seconds = Math.trunc(now / 1e3);
  const nanos = now % 1e3 * 1e6;
  if (startTime) {
    let diffSeconds = seconds - startTime[0];
    let diffNanos = nanos - startTime[0];
    if (diffNanos < 0) {
      diffSeconds = diffSeconds - 1;
      diffNanos = 1e9 + diffNanos;
    }
    return [diffSeconds, diffNanos];
  }
  return [seconds, nanos];
}, "hrtime"), { bigint: /* @__PURE__ */ __name(function bigint() {
  return BigInt(Date.now() * 1e6);
}, "bigint") });

// node_modules/unenv/dist/runtime/node/internal/process/process.mjs
import { EventEmitter } from "node:events";

// node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
import { Socket } from "node:net";
var ReadStream = class extends Socket {
  fd;
  constructor(fd) {
    super();
    this.fd = fd;
  }
  isRaw = false;
  setRawMode(mode) {
    this.isRaw = mode;
    return this;
  }
  isTTY = false;
};
__name(ReadStream, "ReadStream");

// node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
import { Socket as Socket2 } from "node:net";
var WriteStream = class extends Socket2 {
  fd;
  constructor(fd) {
    super();
    this.fd = fd;
  }
  clearLine(dir3, callback) {
    callback && callback();
    return false;
  }
  clearScreenDown(callback) {
    callback && callback();
    return false;
  }
  cursorTo(x, y, callback) {
    callback && typeof callback === "function" && callback();
    return false;
  }
  moveCursor(dx, dy, callback) {
    callback && callback();
    return false;
  }
  getColorDepth(env2) {
    return 1;
  }
  hasColors(count3, env2) {
    return false;
  }
  getWindowSize() {
    return [this.columns, this.rows];
  }
  columns = 80;
  rows = 24;
  isTTY = false;
};
__name(WriteStream, "WriteStream");

// node_modules/unenv/dist/runtime/node/internal/process/process.mjs
var Process = class extends EventEmitter {
  env;
  hrtime;
  nextTick;
  constructor(impl) {
    super();
    this.env = impl.env;
    this.hrtime = impl.hrtime;
    this.nextTick = impl.nextTick;
    for (const prop of [...Object.getOwnPropertyNames(Process.prototype), ...Object.getOwnPropertyNames(EventEmitter.prototype)]) {
      const value = this[prop];
      if (typeof value === "function") {
        this[prop] = value.bind(this);
      }
    }
  }
  emitWarning(warning, type, code) {
    console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
  }
  emit(...args) {
    return super.emit(...args);
  }
  listeners(eventName) {
    return super.listeners(eventName);
  }
  #stdin;
  #stdout;
  #stderr;
  get stdin() {
    return this.#stdin ??= new ReadStream(0);
  }
  get stdout() {
    return this.#stdout ??= new WriteStream(1);
  }
  get stderr() {
    return this.#stderr ??= new WriteStream(2);
  }
  #cwd = "/";
  chdir(cwd2) {
    this.#cwd = cwd2;
  }
  cwd() {
    return this.#cwd;
  }
  arch = "";
  platform = "";
  argv = [];
  argv0 = "";
  execArgv = [];
  execPath = "";
  title = "";
  pid = 200;
  ppid = 100;
  get version() {
    return "";
  }
  get versions() {
    return {};
  }
  get allowedNodeEnvironmentFlags() {
    return /* @__PURE__ */ new Set();
  }
  get sourceMapsEnabled() {
    return false;
  }
  get debugPort() {
    return 0;
  }
  get throwDeprecation() {
    return false;
  }
  get traceDeprecation() {
    return false;
  }
  get features() {
    return {};
  }
  get release() {
    return {};
  }
  get connected() {
    return false;
  }
  get config() {
    return {};
  }
  get moduleLoadList() {
    return [];
  }
  constrainedMemory() {
    return 0;
  }
  availableMemory() {
    return 0;
  }
  uptime() {
    return 0;
  }
  resourceUsage() {
    return {};
  }
  ref() {
  }
  unref() {
  }
  umask() {
    throw createNotImplementedError("process.umask");
  }
  getBuiltinModule() {
    return void 0;
  }
  getActiveResourcesInfo() {
    throw createNotImplementedError("process.getActiveResourcesInfo");
  }
  exit() {
    throw createNotImplementedError("process.exit");
  }
  reallyExit() {
    throw createNotImplementedError("process.reallyExit");
  }
  kill() {
    throw createNotImplementedError("process.kill");
  }
  abort() {
    throw createNotImplementedError("process.abort");
  }
  dlopen() {
    throw createNotImplementedError("process.dlopen");
  }
  setSourceMapsEnabled() {
    throw createNotImplementedError("process.setSourceMapsEnabled");
  }
  loadEnvFile() {
    throw createNotImplementedError("process.loadEnvFile");
  }
  disconnect() {
    throw createNotImplementedError("process.disconnect");
  }
  cpuUsage() {
    throw createNotImplementedError("process.cpuUsage");
  }
  setUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.setUncaughtExceptionCaptureCallback");
  }
  hasUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.hasUncaughtExceptionCaptureCallback");
  }
  initgroups() {
    throw createNotImplementedError("process.initgroups");
  }
  openStdin() {
    throw createNotImplementedError("process.openStdin");
  }
  assert() {
    throw createNotImplementedError("process.assert");
  }
  binding() {
    throw createNotImplementedError("process.binding");
  }
  permission = { has: /* @__PURE__ */ notImplemented("process.permission.has") };
  report = {
    directory: "",
    filename: "",
    signal: "SIGUSR2",
    compact: false,
    reportOnFatalError: false,
    reportOnSignal: false,
    reportOnUncaughtException: false,
    getReport: /* @__PURE__ */ notImplemented("process.report.getReport"),
    writeReport: /* @__PURE__ */ notImplemented("process.report.writeReport")
  };
  finalization = {
    register: /* @__PURE__ */ notImplemented("process.finalization.register"),
    unregister: /* @__PURE__ */ notImplemented("process.finalization.unregister"),
    registerBeforeExit: /* @__PURE__ */ notImplemented("process.finalization.registerBeforeExit")
  };
  memoryUsage = Object.assign(() => ({
    arrayBuffers: 0,
    rss: 0,
    external: 0,
    heapTotal: 0,
    heapUsed: 0
  }), { rss: () => 0 });
  mainModule = void 0;
  domain = void 0;
  send = void 0;
  exitCode = void 0;
  channel = void 0;
  getegid = void 0;
  geteuid = void 0;
  getgid = void 0;
  getgroups = void 0;
  getuid = void 0;
  setegid = void 0;
  seteuid = void 0;
  setgid = void 0;
  setgroups = void 0;
  setuid = void 0;
  _events = void 0;
  _eventsCount = void 0;
  _exiting = void 0;
  _maxListeners = void 0;
  _debugEnd = void 0;
  _debugProcess = void 0;
  _fatalException = void 0;
  _getActiveHandles = void 0;
  _getActiveRequests = void 0;
  _kill = void 0;
  _preload_modules = void 0;
  _rawDebug = void 0;
  _startProfilerIdleNotifier = void 0;
  _stopProfilerIdleNotifier = void 0;
  _tickCallback = void 0;
  _disconnect = void 0;
  _handleQueue = void 0;
  _pendingMessage = void 0;
  _channel = void 0;
  _send = void 0;
  _linkedBinding = void 0;
};
__name(Process, "Process");

// node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess = globalThis["process"];
var getBuiltinModule = globalProcess.getBuiltinModule;
var { exit, platform, nextTick } = getBuiltinModule(
  "node:process"
);
var unenvProcess = new Process({
  env: globalProcess.env,
  hrtime,
  nextTick
});
var {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  finalization,
  features,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  on,
  off,
  once,
  pid,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert: assert2,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
} = unenvProcess;
var _process = {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exit,
  finalization,
  features,
  getBuiltinModule,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  nextTick,
  on,
  off,
  once,
  pid,
  platform,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  // @ts-expect-error old API
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert: assert2,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
};
var process_default = _process;

// node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
globalThis.process = process_default;

// dist/index.js
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
var CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,OPTIONS",
  "content-type": "application/json; charset=utf-8",
  "cache-control": "public, max-age=3600"
};
var json = /* @__PURE__ */ __name((corpo, status = 200) => new Response(JSON.stringify(corpo), { status, headers: CORS }), "json");
var decodificar = /* @__PURE__ */ __name((s) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " "), "decodificar");
var tipoDe = /* @__PURE__ */ __name((nome) => {
  const ext = nome.toLowerCase().split(".").pop() ?? "";
  if (["mp4", "mov", "webm", "mkv", "avi", "m4v"].includes(ext))
    return "video";
  if (["mp3", "wav", "ogg", "m4a", "aac", "flac"].includes(ext))
    return "audio";
  if (["png", "jpg", "jpeg", "webp", "gif", "avif", "svg"].includes(ext))
    return "image";
  return "outro";
}, "tipoDe");
async function handleDrive(req) {
  if (req.method === "OPTIONS")
    return new Response(null, { status: 204, headers: CORS });
  const id = new URL(req.url).searchParams.get("pasta") ?? "";
  if (!/^[a-zA-Z0-9_-]{10,}$/.test(id))
    return json({ ok: false, erro: "id da pasta inv\xE1lido" }, 400);
  const alvo = `https://drive.google.com/embeddedfolderview?id=${id}#list`;
  try {
    const res = await fetch(alvo, {
      headers: { "user-agent": UA, accept: "text/html", "accept-language": "pt-BR,pt;q=0.9" }
    });
    if (!res.ok)
      return json({ ok: false, erro: `Drive respondeu ${res.status}` }, 502);
    const html = await res.text();
    const entradas = [];
    const blocos = html.split('class="flip-entry"').slice(1);
    for (const bloco of blocos) {
      const idArq = bloco.match(/id="entry-([a-zA-Z0-9_-]{10,})"/)?.[1];
      const nomeBruto = bloco.match(/flip-entry-title[^>]*>([^<]{1,220})</)?.[1];
      if (!idArq || !nomeBruto)
        continue;
      const nome = decodificar(nomeBruto).trim();
      const ehPasta = /\/folders\//.test(bloco.slice(0, 900));
      entradas.push({ id: idArq, nome, pasta: ehPasta, tipo: ehPasta ? "outro" : tipoDe(nome) });
    }
    return json({
      ok: true,
      pasta: id,
      total: entradas.length,
      arquivos: entradas.filter((e) => !e.pasta),
      pastas: entradas.filter((e) => e.pasta).map((e) => ({ id: e.id, nome: e.nome }))
    });
  } catch (e) {
    return json({ ok: false, erro: e.message }, 500);
  }
}
__name(handleDrive, "handleDrive");
var UA2 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
var LIMITE = 200 * 1024 * 1024;
async function handleProxy(req) {
  const alvo = new URL(req.url).searchParams.get("url") ?? "";
  if (!/^https?:\/\//i.test(alvo)) {
    return new Response("par\xE2metro url obrigat\xF3rio", { status: 400 });
  }
  if (/^https?:\/\/(localhost|127\.|10\.|192\.168\.|169\.254\.)/i.test(alvo)) {
    return new Response("endere\xE7o n\xE3o permitido", { status: 400 });
  }
  try {
    const res = await fetch(alvo, {
      headers: { "user-agent": UA2, accept: "*/*", referer: new URL(alvo).origin }
    });
    if (!res.ok)
      return new Response(`origem respondeu ${res.status}`, { status: 502 });
    const tipo = res.headers.get("content-type") ?? "application/octet-stream";
    if (/text\/html/i.test(tipo)) {
      return new Response("o endere\xE7o aponta para uma p\xE1gina, n\xE3o para um arquivo", { status: 415 });
    }
    const tamanho = Number(res.headers.get("content-length") ?? 0);
    if (tamanho > LIMITE) {
      return new Response("arquivo maior que 200 MB", { status: 413 });
    }
    return new Response(res.body, {
      status: 200,
      headers: {
        "content-type": tipo,
        "access-control-allow-origin": "*",
        "cache-control": "public, max-age=86400",
        "content-disposition": "inline"
      }
    });
  } catch {
    return new Response("falha ao buscar o arquivo", { status: 502 });
  }
}
__name(handleProxy, "handleProxy");
var UA3 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
var CORS2 = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type",
  "access-control-allow-methods": "POST,OPTIONS"
};
var json2 = /* @__PURE__ */ __name((corpo, status = 200) => new Response(JSON.stringify(corpo), {
  status,
  headers: { ...CORS2, "content-type": "application/json; charset=utf-8" }
}), "json2");
var fatiar = /* @__PURE__ */ __name((texto, limite = 190) => {
  const limpo = texto.replace(/\s+/g, " ").trim();
  if (limpo.length <= limite)
    return [limpo];
  const partes = [];
  let atual = "";
  for (const frase of limpo.split(/(?<=[.!?…;:])\s+/)) {
    if ((atual + " " + frase).trim().length <= limite) {
      atual = (atual + " " + frase).trim();
      continue;
    }
    if (atual)
      partes.push(atual);
    if (frase.length <= limite) {
      atual = frase;
      continue;
    }
    let pedaco = "";
    for (const palavra of frase.split(" ")) {
      if ((pedaco + " " + palavra).trim().length > limite) {
        partes.push(pedaco.trim());
        pedaco = palavra;
      } else {
        pedaco = (pedaco + " " + palavra).trim();
      }
    }
    atual = pedaco;
  }
  if (atual.trim())
    partes.push(atual.trim());
  return partes.filter(Boolean);
}, "fatiar");
var googleTts = /* @__PURE__ */ __name(async (texto, idioma, velocidade) => {
  const pedacos = fatiar(texto);
  const audios = [];
  for (const [i, pedaco] of pedacos.entries()) {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(idioma)}&ttsspeed=${velocidade < 0.95 ? "0.9" : "1"}&q=${encodeURIComponent(pedaco)}&total=${pedacos.length}&idx=${i}&textlen=${pedaco.length}`;
    const r = await fetch(url, {
      headers: {
        "user-agent": UA3,
        referer: "https://translate.google.com/",
        accept: "audio/mpeg,*/*"
      }
    });
    if (!r.ok)
      throw new Error(`Google TTS respondeu ${r.status}`);
    const bruto = new Uint8Array(await r.arrayBuffer());
    if (bruto.byteLength < 500)
      throw new Error("Google TTS devolveu \xE1udio vazio");
    audios.push(bruto);
  }
  const total = audios.reduce((n, a) => n + a.byteLength, 0);
  const saida = new Uint8Array(total);
  let pos = 0;
  for (const a of audios) {
    saida.set(a, pos);
    pos += a.byteLength;
  }
  return saida;
}, "googleTts");
var elevenTts = /* @__PURE__ */ __name(async (texto, voz, chave) => {
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voz || "21m00Tcm4TlvDq8ikWAM")}`, {
    method: "POST",
    headers: { "xi-api-key": chave, "content-type": "application/json", accept: "audio/mpeg" },
    body: JSON.stringify({
      text: texto,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.5, similarity_boost: 0.75 }
    })
  });
  if (!r.ok)
    throw new Error(`ElevenLabs respondeu ${r.status}`);
  return new Uint8Array(await r.arrayBuffer());
}, "elevenTts");
var proprioTts = /* @__PURE__ */ __name(async (texto, voz, idioma, chave, template) => {
  const url = template.replace("{texto}", encodeURIComponent(texto)).replace("{voz}", encodeURIComponent(voz)).replace("{idioma}", encodeURIComponent(idioma)).replace("{chave}", encodeURIComponent(chave));
  const r = await fetch(url, { headers: { "user-agent": UA3 } });
  if (!r.ok)
    throw new Error(`seu endpoint respondeu ${r.status}`);
  return new Uint8Array(await r.arrayBuffer());
}, "proprioTts");
async function acaoVoz(corpo) {
  const texto = String(corpo.texto ?? "").trim();
  if (!texto)
    return json2({ ok: false, erro: "texto vazio" }, 400);
  const idioma = String(corpo.idioma ?? "pt-BR");
  const voz = String(corpo.voz ?? "");
  const velocidade = Number(corpo.velocidade ?? 1) || 1;
  const provedor = String(corpo.provedor ?? "google");
  const chave = String(corpo.chave ?? "");
  const urlTemplate = String(corpo.urlTemplate ?? "");
  try {
    let audio;
    if (provedor === "elevenlabs" && chave)
      audio = await elevenTts(texto, voz, chave);
    else if (provedor === "proprio" && urlTemplate)
      audio = await proprioTts(texto, voz, idioma, chave, urlTemplate);
    else
      audio = await googleTts(texto, idioma, velocidade);
    return new Response(audio, {
      status: 200,
      headers: {
        ...CORS2,
        "content-type": "audio/mpeg",
        "content-length": String(audio.byteLength),
        "cache-control": "no-store"
      }
    });
  } catch (e) {
    return json2({ ok: false, erro: e.message }, 502);
  }
}
__name(acaoVoz, "acaoVoz");
var modelosGratis = ["openai-fast"];
var REFERRER = "vortex-editor.netlify.app";
async function pollinations(prompt, sistema) {
  let ultimo = "";
  for (const modelo of modelosGratis) {
    const url = `https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=${modelo}&seed=${Date.now() % 99999}&referrer=${encodeURIComponent(REFERRER)}`;
    try {
      const r = await fetch(url, {
        headers: { "user-agent": UA3, accept: "text/plain", referer: `https://${REFERRER}/` },
        signal: AbortSignal.timeout(15e3)
      });
      if (!r.ok) {
        ultimo = `Pollinations ${r.status}`;
        continue;
      }
      let texto = (await r.text()).trim();
      if (!texto || texto.startsWith("{") || texto.length < 40) {
        ultimo = "resposta curta ou JSON (modelo ocupado)";
        continue;
      }
      if (sistema.trim()) {
        const r2 = await fetch(
          `https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=${modelo}&referrer=${encodeURIComponent(REFERRER)}`,
          {
            headers: { "user-agent": UA3, accept: "text/plain", referer: `https://${REFERRER}/` },
            signal: AbortSignal.timeout(12e3)
          }
        );
        if (r2.ok) {
          const t2 = (await r2.text()).trim();
          if (t2.length > 40)
            texto = t2;
        }
      }
      return texto;
    } catch (e) {
      ultimo = e.message;
    }
  }
  throw new Error(ultimo || "motor gratuito n\xE3o respondeu");
}
__name(pollinations, "pollinations");
var pollinationsOpenAI = /* @__PURE__ */ __name(async (prompt, sistema) => {
  const r = await fetch("https://text.pollinations.ai/openai/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: "openai-fast",
      messages: [
        ...sistema ? [{ role: "system", content: sistema }] : [],
        { role: "user", content: prompt }
      ]
    }),
    signal: AbortSignal.timeout(14e3)
  });
  if (!r.ok)
    throw new Error(`Pollinations OpenAI ${r.status}`);
  const d = await r.json();
  const texto = d.choices?.[0]?.message?.content?.trim() ?? "";
  if (!texto)
    throw new Error("Pollinations OpenAI devolveu vazio");
  return texto;
}, "pollinationsOpenAI");
var apiCompativel = /* @__PURE__ */ __name(async (corpo, prompt, sistema) => {
  const chave = String(corpo.chave ?? "");
  const base = String(corpo.baseUrl ?? "https://api.openai.com/v1").replace(/\/+$/, "");
  const modelo = String(corpo.modelo ?? "gpt-4o-mini");
  if (!chave)
    throw new Error("sem chave no painel");
  const r = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { authorization: `Bearer ${chave}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: modelo,
      temperature: 0.8,
      messages: [
        ...sistema ? [{ role: "system", content: sistema }] : [],
        { role: "user", content: prompt }
      ]
    }),
    signal: AbortSignal.timeout(6e4)
  });
  if (!r.ok)
    throw new Error(`sua API respondeu ${r.status}`);
  const dados = await r.json();
  const texto = dados.choices?.[0]?.message?.content?.trim() ?? "";
  if (!texto)
    throw new Error("sua API devolveu vazio");
  return texto;
}, "apiCompativel");
async function acaoTexto(corpo) {
  const prompt = String(corpo.prompt ?? "").trim().slice(0, 1800);
  const sistema = String(corpo.sistema ?? "").trim().slice(0, 1500);
  if (!prompt)
    return json2({ ok: false, erro: "prompt vazio" }, 400);
  try {
    const texto = await apiCompativel(corpo, prompt, sistema);
    return json2({ ok: true, texto, fonte: "api" });
  } catch (eApi) {
    try {
      const texto = await pollinationsOpenAI(prompt, sistema);
      return json2({ ok: true, texto, fonte: "pollinations" });
    } catch (eOpenAI) {
      try {
        const texto = await pollinations(prompt, sistema);
        return json2({ ok: true, texto, fonte: "pollinations" });
      } catch (e) {
        const detalhe = `${eOpenAI.message} \xB7 ${e.message}`;
        const limite = /402|FREE_LIMIT|limite/i.test(detalhe);
        return json2(
          {
            ok: false,
            erro: limite ? "O motor gr\xE1tis aceita 1 resposta a cada 30 segundos. Espere 30 s e tente de novo (ou coloque uma chave gr\xE1tis do Groq no painel \u2192 IA)." : `API do painel: ${eApi.message} \xB7 motor gratuito: ${detalhe}`,
            limite
          },
          502
        );
      }
    }
  }
}
__name(acaoTexto, "acaoTexto");
var textoDeZip = /* @__PURE__ */ __name(async (buffer) => {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  let eocd = -1;
  for (let i = buffer.byteLength - 22; i >= Math.max(0, buffer.byteLength - 66e3); i -= 1) {
    if (view.getUint32(i, true) === 101010256) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0)
    return null;
  const total = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  for (let n = 0; n < total; n += 1) {
    if (view.getUint32(p, true) !== 33639248)
      break;
    const metodo = view.getUint16(p + 10, true);
    const comprimido = view.getUint32(p + 20, true);
    const tamNome = view.getUint16(p + 28, true);
    const tamExtra = view.getUint16(p + 30, true);
    const tamComent = view.getUint16(p + 32, true);
    const local = view.getUint32(p + 42, true);
    const nome = new TextDecoder().decode(buffer.subarray(p + 46, p + 46 + tamNome));
    p += 46 + tamNome + tamExtra + tamComent;
    if (!/skill\.md$/i.test(nome) && !/\.md$/i.test(nome))
      continue;
    const nOff = view.getUint16(local + 26, true);
    const eOff = view.getUint16(local + 28, true);
    const inicio = local + 30 + nOff + eOff;
    const dados = buffer.subarray(inicio, inicio + comprimido);
    let texto = "";
    if (metodo === 0) {
      texto = new TextDecoder().decode(dados);
    } else if (metodo === 8) {
      const ds = new DecompressionStream("deflate-raw");
      const des = new Response(dados.slice().buffer).body.pipeThrough(ds);
      texto = await new Response(des).text();
    } else {
      continue;
    }
    return { nome, texto };
  }
  return null;
}, "textoDeZip");
async function acaoSkill(corpo) {
  const url = String(corpo.url ?? "").trim();
  if (!/^https?:\/\/.+/i.test(url))
    return json2({ ok: false, erro: "link inv\xE1lido" }, 400);
  try {
    const r = await fetch(url, { headers: { "user-agent": UA3 }, signal: AbortSignal.timeout(45e3) });
    if (!r.ok)
      return json2({ ok: false, erro: `o site respondeu ${r.status}` }, 502);
    const tipo = r.headers.get("content-type") ?? "";
    const nome = decodeURIComponent(url.split("/").pop() ?? "skill");
    if (/zip|octet-stream/i.test(tipo) || /\.zip$/i.test(url)) {
      const zip = new Uint8Array(await r.arrayBuffer());
      if (zip.byteLength > 12e6)
        return json2({ ok: false, erro: "pacote grande demais (12 MB)" }, 413);
      const lido = await textoDeZip(zip);
      if (!lido)
        return json2({ ok: false, erro: "o zip n\xE3o tem SKILL.md" }, 422);
      return json2({
        ok: true,
        nome: lido.nome.split("/").pop() ?? nome,
        arquivos: [{ nome: lido.nome, texto: lido.texto.slice(0, 24e3) }]
      });
    }
    const texto = (await r.text()).slice(0, 24e3);
    if (texto.length < 40)
      return json2({ ok: false, erro: "o arquivo veio vazio" }, 422);
    return json2({ ok: true, nome, arquivos: [{ nome, texto }] });
  } catch (e) {
    return json2({ ok: false, erro: e.message }, 502);
  }
}
__name(acaoSkill, "acaoSkill");
async function handleFerramentas(req) {
  if (req.method === "OPTIONS")
    return new Response(null, { status: 204, headers: CORS2 });
  if (req.method !== "POST")
    return json2({ ok: false, erro: "use POST" }, 405);
  let corpo = {};
  try {
    corpo = await req.json();
  } catch {
    return json2({ ok: false, erro: "corpo inv\xE1lido" }, 400);
  }
  const acao = String(corpo.acao ?? "");
  if (acao === "voz")
    return acaoVoz(corpo);
  if (acao === "texto")
    return acaoTexto(corpo);
  if (acao === "skill")
    return acaoSkill(corpo);
  return json2({ ok: false, erro: "a\xE7\xE3o desconhecida (use voz, texto ou skill)" }, 400);
}
__name(handleFerramentas, "handleFerramentas");
var json3 = /* @__PURE__ */ __name((status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*" }
}), "json3");
async function handleIa(req, env2 = {}) {
  if (req.method === "OPTIONS") {
    return new Response("", {
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "content-type",
        "access-control-allow-methods": "POST, OPTIONS"
      }
    });
  }
  if (req.method !== "POST")
    return json3(405, { ok: false, erro: "use POST" });
  const chave = env2.IA_API_KEY ?? "";
  const provedor = (env2.IA_PROVEDOR ?? "openai").toLowerCase();
  if (!chave) {
    return json3(200, {
      ok: false,
      erro: "IA n\xE3o configurada. Na Netlify: Site settings \u2192 Environment variables \u2192 IA_API_KEY. Depois o painel administrativo libera a gera\xE7\xE3o.",
      modo: "desligado"
    });
  }
  let body = {};
  try {
    body = await req.json();
  } catch {
    return json3(400, { ok: false, erro: "JSON inv\xE1lido" });
  }
  const prompt = (body.prompt ?? "").trim();
  if (prompt.length < 3)
    return json3(400, { ok: false, erro: "Prompt muito curto" });
  const tipo = body.tipo === "texto" ? "texto" : "imagem";
  const modeloImagem = env2.IA_MODELO_IMAGEM ?? "gpt-image-1";
  const modeloTexto = env2.IA_MODELO_TEXTO ?? "gpt-4o-mini";
  const tamanho = body.tamanho === "1024x1792" || body.tamanho === "1792x1024" ? body.tamanho : "1024x1024";
  try {
    if (provedor === "gemini") {
      const modelo = tipo === "texto" ? modeloTexto : env2.IA_MODELO_IMAGEM ?? "imagen-3.0-generate-002";
      const url = tipo === "texto" ? `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${chave}` : `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:predict?key=${chave}`;
      const corpo = tipo === "texto" ? { contents: [{ parts: [{ text: prompt }] }] } : { instances: [{ prompt }], parameters: { sampleCount: 1 } };
      const res2 = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(corpo)
      });
      const dados = await res2.json();
      if (!res2.ok)
        return json3(200, { ok: false, erro: dados?.error?.message ?? `Gemini ${res2.status}` });
      if (tipo === "texto") {
        const texto = dados?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        return json3(200, { ok: true, tipo: "texto", texto });
      }
      const b64 = dados?.predictions?.[0]?.bytesBase64Encoded ?? "";
      return json3(200, { ok: true, tipo: "imagem", imagem: b64 ? `data:image/png;base64,${b64}` : "" });
    }
    if (tipo === "texto") {
      const res2 = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { authorization: `Bearer ${chave}`, "content-type": "application/json" },
        body: JSON.stringify({
          model: modeloTexto,
          messages: [
            { role: "system", content: "Voc\xEA ajuda a criar roteiros e descri\xE7\xF5es curtas para v\xEDdeos." },
            { role: "user", content: prompt }
          ],
          max_tokens: 600
        })
      });
      const d2 = await res2.json();
      if (!res2.ok)
        return json3(200, { ok: false, erro: d2?.error?.message ?? `OpenAI ${res2.status}` });
      return json3(200, { ok: true, tipo: "texto", texto: d2?.choices?.[0]?.message?.content ?? "" });
    }
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { authorization: `Bearer ${chave}`, "content-type": "application/json" },
      body: JSON.stringify({ model: modeloImagem, prompt, size: tamanho, n: 1 })
    });
    const d = await res.json();
    if (!res.ok)
      return json3(200, { ok: false, erro: d?.error?.message ?? `OpenAI ${res.status}` });
    const item = d?.data?.[0];
    const imagem = item?.b64_json ? `data:image/png;base64,${item.b64_json}` : item?.url ?? "";
    return json3(200, { ok: true, tipo: "imagem", imagem });
  } catch (e) {
    return json3(200, { ok: false, erro: `Falha na chamada: ${e.message}` });
  }
}
__name(handleIa, "handleIa");
var VIDEO_EXT = /\.(mp4|webm|m4v|mov|ogv)(\?|#|$)/i;
var AUDIO_EXT = /\.(mp3|wav|m4a|ogg|oga|opus|flac|aac)(\?|#|$)/i;
var IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif)(\?|#|$)/i;
function abs(src, base) {
  try {
    return new URL(src, base).href;
  } catch {
    return "";
  }
}
__name(abs, "abs");
function tipoDe2(src, hint = "") {
  const u = src.toLowerCase().split("?")[0];
  if (VIDEO_EXT.test(u) || hint === "video")
    return "video";
  if (AUDIO_EXT.test(u) || hint === "audio")
    return "audio";
  return "image";
}
__name(tipoDe2, "tipoDe2");
function lixo(url) {
  return /(^|[/_.-])(spacer|pixel|tracking|beacon|1x1|blank|transparent)([/_.-]|$)/i.test(url) || /(sprite|favicon|logo|avatar|emoji|icon-?\d|placeholder|loading|spinner|badge)/i.test(url) || /\.svg(\?|#|$)/i.test(url) || /doubleclick|googletagmanager|facebook\.com\/tr|analytics/i.test(url);
}
__name(lixo, "lixo");
var attr = /* @__PURE__ */ __name((tag, name) => {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, "i"));
  return m ? m[1] : "";
}, "attr");
var metaTag = /* @__PURE__ */ __name((html, prop) => {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)\\s*=\\s*["']${prop}["'][^>]*>`,
    "i"
  );
  const m = html.match(re);
  if (!m)
    return "";
  return attr(m[0], "content");
}, "metaTag");
function minerar(html, base) {
  const out = [];
  const vistos = /* @__PURE__ */ new Set();
  const push = /* @__PURE__ */ __name((raw, type, w = 0, h = 0, label = "") => {
    if (!raw || raw.startsWith("data:") || raw.startsWith("blob:"))
      return;
    const url = abs(raw, base);
    if (!url || !/^https?:/i.test(url) || lixo(url))
      return;
    if (url.replace(/\/$/, "") === base.replace(/\/$/, ""))
      return;
    if (type === "image" && !IMAGE_EXT.test(url.split("?")[0]) && !w && !h && !label)
      return;
    if (vistos.has(url))
      return;
    vistos.add(url);
    out.push({ url, type, w, h, label });
  }, "push");
  for (const [prop, type] of [
    ["og:video:secure_url", "video"],
    ["og:video", "video"],
    ["og:audio", "audio"],
    ["og:image", "image"],
    ["twitter:player:stream", "video"],
    ["twitter:image", "image"]
  ]) {
    const v = metaTag(html, prop);
    if (v)
      push(v, type, 0, 0, prop);
  }
  const ld = html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi);
  for (const m of ld) {
    try {
      const visit = /* @__PURE__ */ __name((o) => {
        if (!o || typeof o !== "object")
          return;
        const tp = String(o["@type"] || "").toLowerCase();
        const midia = o.contentUrl || o.thumbnailUrl || (typeof o.image === "string" ? "" : o.embedUrl);
        if (midia) {
          const raw = midia;
          const type = /video/.test(tp) ? "video" : /audio/.test(tp) ? "audio" : "image";
          push(raw, type, Number(o.width) || 0, Number(o.height) || 0, o.name || "");
        }
        if (Array.isArray(o.image))
          o.image.forEach((i) => push(typeof i === "string" ? i : i?.url, "image"));
        else if (typeof o.image === "string")
          push(o.image, "image");
        Object.values(o).forEach((v) => Array.isArray(v) ? v.forEach(visit) : visit(v));
      }, "visit");
      visit(JSON.parse(m[1]));
    } catch {
    }
  }
  for (const tag of html.matchAll(/<video\b[^>]*>[\s\S]*?<\/video>/gi)) {
    const bloco = tag[0];
    const poster = attr(bloco, "poster");
    if (poster)
      push(poster, "image", 0, 0, "capa do v\xEDdeo");
    for (const s of bloco.matchAll(/<(?:source|video)\b[^>]*>/gi)) {
      const src = attr(s[0], "src") || attr(s[0], "data-src");
      if (src && !/\.m3u8(\?|#|$)/i.test(src))
        push(src, "video");
    }
  }
  for (const tag of html.matchAll(/<audio\b[^>]*>[\s\S]*?<\/audio>/gi)) {
    for (const s of tag[0].matchAll(/<(?:source|audio)\b[^>]*>/gi)) {
      const src = attr(s[0], "src") || attr(s[0], "data-src");
      if (src)
        push(src, "audio");
    }
  }
  for (const tag of html.matchAll(/<img\b[^>]*>/gi)) {
    const t = tag[0];
    const src = attr(t, "src") || attr(t, "data-src") || attr(t, "data-original") || attr(t, "data-lazy-src") || "";
    const srcset = attr(t, "srcset") || attr(t, "data-srcset");
    const w = parseInt(attr(t, "width"), 10) || 0;
    const h = parseInt(attr(t, "height"), 10) || 0;
    const alt = attr(t, "alt");
    if (src)
      push(src, "image", w, h, alt);
    if (srcset) {
      const candidatos = srcset.split(",").map((c) => c.trim().split(/\s+/)).map(([u, d]) => ({ u, n: parseInt(d || "0", 10) || 0 })).sort((a, b) => b.n - a.n);
      if (candidatos[0]?.u)
        push(candidatos[0].u, "image", 0, 0, alt);
    }
  }
  for (const m of html.matchAll(/url\(['"]?(https?:\/\/[^'")]+)['"]?\)/gi)) {
    push(m[1], "image", 0, 0, "fundo");
  }
  for (const m of html.matchAll(/https?:\/\/[^\s"'<>]+\.(?:mp4|webm|mp3|wav|m4a|jpe?g|png|webp)(?:\?[^\s"'<>]*)?/gi)) {
    push(m[0], tipoDe2(m[0]));
  }
  const peso = /* @__PURE__ */ __name((i) => {
    const area = i.w && i.h ? i.w * i.h : 0;
    const tipo = i.type === "video" ? 3 : i.type === "audio" ? 2.5 : 1;
    return tipo * 1e7 + area;
  }, "peso");
  return out.sort((a, b) => peso(b) - peso(a)).slice(0, 80);
}
__name(minerar, "minerar");
var UA4 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
var json4 = /* @__PURE__ */ __name((status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*" }
}), "json4");
async function handleMinerar(req) {
  if (req.method === "OPTIONS") {
    return new Response("", {
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "content-type",
        "access-control-allow-methods": "POST, OPTIONS"
      }
    });
  }
  if (req.method !== "POST")
    return json4(405, { ok: false, erro: "use POST" });
  let url = "";
  try {
    const body = await req.json();
    url = String(body?.url ?? "").trim();
  } catch {
    return json4(400, { ok: false, erro: "JSON inv\xE1lido" });
  }
  if (!/^https?:\/\//i.test(url))
    return json4(400, { ok: false, erro: "Endere\xE7o inv\xE1lido" });
  if (/^https?:\/\/(localhost|127\.|10\.|192\.168\.|169\.254\.)/i.test(url)) {
    return json4(400, { ok: false, erro: "Endere\xE7o n\xE3o permitido" });
  }
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12e3);
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "user-agent": UA4,
        accept: "text/html,application/xhtml+xml,*/*;q=0.8",
        "accept-language": "pt-BR,pt;q=0.9,en;q=0.8"
      }
    });
    clearTimeout(t);
    if (!res.ok) {
      return json4(200, {
        ok: false,
        erro: res.status === 403 || res.status === 401 ? "O site bloqueou a leitura autom\xE1tica (403). Copie o link direto do arquivo, ou use o bot\xE3o \u201CAbrir site\u201D e arraste a m\xEDdia para o editor." : `O site respondeu ${res.status}.`,
        itens: []
      });
    }
    const html = (await res.text()).slice(0, 4e6);
    const base = res.url || abs(url, url);
    const itens = minerar(html, base);
    const site = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)/i)?.[1] ?? "";
    const titulo = html.match(/<title[^>]*>([^<]{1,140})</i)?.[1]?.trim() ?? "";
    return json4(200, { ok: true, pagina: base, site, titulo, total: itens.length, itens });
  } catch (e) {
    const msg = e.name === "AbortError" ? "O site demorou demais para responder." : "N\xE3o foi poss\xEDvel abrir essa p\xE1gina.";
    return json4(200, { ok: false, erro: msg, itens: [] });
  }
}
__name(handleMinerar, "handleMinerar");
var VERSAO = "2026-10-29";
var CORS3 = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type, authorization",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-max-age": "86400"
};
var comCors = /* @__PURE__ */ __name((resp) => {
  const headers = new Headers(resp.headers);
  for (const [k, v] of Object.entries(CORS3))
    headers.set(k, v);
  return new Response(resp.body, { status: resp.status, headers });
}, "comCors");
var json5 = /* @__PURE__ */ __name((corpo, status = 200) => new Response(JSON.stringify(corpo), {
  status,
  headers: { ...CORS3, "content-type": "application/json; charset=utf-8" }
}), "json5");
var cloudflare_default = {
  async fetch(req, env2) {
    const url = new URL(req.url);
    const rota = url.pathname.replace(/^\/api\/?/, "/").replace(/\/+$/, "") || "/";
    if (req.method === "OPTIONS")
      return new Response(null, { status: 204, headers: CORS3 });
    try {
      if (rota === "/" || rota === "/ping") {
        return json5({
          ok: true,
          servico: "vortex-api",
          versao: VERSAO,
          rotas: ["/api/drive", "/api/proxy", "/api/ferramentas", "/api/ia", "/api/minerar"]
        });
      }
      if (rota === "/drive")
        return comCors(await handleDrive(req));
      if (rota === "/proxy")
        return comCors(await handleProxy(req));
      if (rota === "/ferramentas")
        return comCors(await handleFerramentas(req));
      if (rota === "/ia")
        return comCors(await handleIa(req, env2));
      if (rota === "/minerar")
        return comCors(await handleMinerar(req));
      return json5({ ok: false, erro: `rota desconhecida: ${rota}` }, 404);
    } catch (e) {
      return json5({ ok: false, erro: e.message }, 500);
    }
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env2, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env2);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env2, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env2);
  } catch (e) {
    const error3 = reduceError(e);
    return Response.json(error3, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-sEhtfm/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = cloudflare_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env2, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env2, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env2, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env2, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-sEhtfm/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
__name(__Facade_ScheduledController__, "__Facade_ScheduledController__");
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env2, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env2, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env2, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env2, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env2, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env2, ctx) => {
      this.env = env2;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
