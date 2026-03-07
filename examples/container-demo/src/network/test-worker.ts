console.log("[test-worker] hello from worker!")
postMessage({ type: "ready" })
