import path from 'path'
import { strict as assert } from 'assert'
import { createBundle as defaultCreateBundle } from './create-bundle'
import { EntryGenerator, PathsMapper } from './generate-entry'
import { tmpFilePaths } from './utils'
import { CreateBundle } from './types'

export { packherdRequire, PackherdRequireOpts, GetModuleKey } from './require'
export * from './types'

export type PackherdOpts = {
  entryFile: string
  nodeModulesOnly?: boolean
  pathsMapper?: PathsMapper
  createBundle?: CreateBundle
}

export async function packherd(opts: PackherdOpts) {
  const createBundle = opts.createBundle || defaultCreateBundle
  const entryGenerator = new EntryGenerator(
    createBundle,
    opts.entryFile,
    opts.nodeModulesOnly,
    opts.pathsMapper
  )

  const { entry } = await entryGenerator.createEntryScript()
  const { outfile } = tmpFilePaths()

  const { outputFiles, metafile, warnings } = await createBundle({
    outdir: path.dirname(outfile),
    metafile: true,
    entryFilePath: opts.entryFile,
    stdin: {
      contents: entry,
      sourcefile: opts.entryFile,
      resolveDir: path.dirname(opts.entryFile),
    },
  })
  assert(metafile != null, 'createBundle should return metafile')

  // When using the `stdin` option esbuild sends the same outputFile twice, as
  // .../stdin.js and .../entry.js
  assert(
    outputFiles.length === 1 || outputFiles.length === 2,
    `expecting exactly one or two outputFiles, got ${outputFiles.length} instead`
  )
  const [bundleFile] = outputFiles

  assert(bundleFile.contents != null, 'bundle output should include contents')

  const bundle = Buffer.isBuffer(bundleFile.contents)
    ? bundleFile.contents
    : Buffer.from(bundleFile.contents)

  return {
    bundle,
    meta: metafile,
    warnings,
  }
}
