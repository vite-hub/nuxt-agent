import { waitUntil as vercelWaitUntil } from "@vercel/functions"

export function waitUntil(work: Promise<unknown>): void {
  const task = Promise.resolve(work).catch(error => console.error(error))

  if (process.env.VERCEL) {
    vercelWaitUntil(task)
    return
  }

  void task
}
