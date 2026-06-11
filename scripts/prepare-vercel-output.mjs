import { access, cp, mkdir, readFile, rm } from "node:fs/promises"
import { createRequire } from "node:module"
import { dirname, join, relative, sep } from "node:path"
import { fileURLToPath } from "node:url"

const projectRoot = fileURLToPath(new URL("..", import.meta.url))
const functionRoot = join(projectRoot, ".vercel", "output", "functions", "__server.func")
const outputNodeModules = join(functionRoot, "node_modules")
const rootRequire = createRequire(join(projectRoot, "package.json"))

const copied = new Set()
const runtimePackages = [
  { name: "@vite-hub/workspace" },
  { includePeerDependencies: true, name: "@ai-sdk/mcp" },
]

for (const runtimePackage of runtimePackages) {
  await copyPackage(runtimePackage.name, rootRequire, projectRoot, runtimePackage)
}

async function copyPackage(name, resolver, fromDir, options = {}) {
  const packageJsonPath = await resolvePackageJson(name, resolver, fromDir)
  const packageDir = dirname(packageJsonPath)
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"))
  const packageKey = `${name}\0${packageJsonPath}`

  if (!copied.has(packageKey)) {
    copied.add(packageKey)
    const targetDir = join(outputNodeModules, ...name.split("/"))
    await rm(targetDir, { force: true, recursive: true })
    await mkdir(dirname(targetDir), { recursive: true })
    await cp(packageDir, targetDir, {
      dereference: true,
      filter: source => {
        const rel = relative(packageDir, source)
        return !rel.split(sep).includes("node_modules")
      },
      recursive: true,
    })
  }

  const packageRequire = createRequire(packageJsonPath)
  const dependencyNames = new Set(Object.keys(packageJson.dependencies || {}))
  if (options.includePeerDependencies) {
    for (const dependencyName of Object.keys(packageJson.peerDependencies || {})) {
      dependencyNames.add(dependencyName)
    }
  }

  for (const dependencyName of dependencyNames) {
    await copyPackage(dependencyName, packageRequire, packageDir, options)
  }
}

async function resolvePackageJson(name, resolver, fromDir) {
  try {
    return resolver.resolve(`${name}/package.json`)
  } catch (error) {
    if (error?.code !== "ERR_PACKAGE_PATH_NOT_EXPORTED") throw error
  }

  try {
    let current = dirname(resolver.resolve(name))
    while (current !== dirname(current)) {
      const candidate = join(current, "package.json")
      try {
        await access(candidate)
        const packageJson = JSON.parse(await readFile(candidate, "utf8"))
        if (packageJson.name === name) return candidate
      } catch {}
      current = dirname(current)
    }
  } catch (error) {
    if (error?.code !== "ERR_PACKAGE_PATH_NOT_EXPORTED") throw error
  }

  let current = fromDir
  while (current !== dirname(current)) {
    const candidate = join(current, "node_modules", ...name.split("/"), "package.json")
    try {
      await access(candidate)
      return candidate
    } catch {}
    current = dirname(current)
  }

  throw new Error(`Could not resolve package.json for ${name}.`)
}
