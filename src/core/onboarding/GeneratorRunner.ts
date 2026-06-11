import * as path from 'path'
import * as fs   from 'fs'
import { loadAppModel }     from './ModelValidator'
import { PomGenerator }     from './generators/PomGenerator'
import { FixtureGenerator } from './generators/FixtureGenerator'
import { SpecGenerator }    from './generators/SpecGenerator'
import { AppModel }         from './types'

export class GeneratorRunner {

  async generate(appName: string): Promise<void> {
    console.log(`[GeneratorRunner] Loading model for: ${appName}`)
    const raw   = loadAppModel(appName)
    const model = raw as unknown as AppModel

    const outputDir = path.resolve(`src/apps/${appName}`)
    fs.mkdirSync(path.join(outputDir, 'pages'), { recursive: true })
    fs.mkdirSync(path.join(outputDir, 'specs'), { recursive: true })

    console.log(`[GeneratorRunner] Output directory: ${outputDir}`)
    console.log(`[GeneratorRunner] Pages:  ${model.pages?.length ?? 0}`)
    console.log(`[GeneratorRunner] Roles:  ${model.roles.length}`)
    console.log(`[GeneratorRunner] Flows:  ${model.flows?.length ?? 0}`)

    const pomGen     = new PomGenerator(model)
    const fixtureGen = new FixtureGenerator(model)
    const specGen    = new SpecGenerator(model)

    pomGen.generate(outputDir)
    fixtureGen.generate(outputDir)
    specGen.generate(outputDir)

    console.log(`\n[GeneratorRunner] Generation complete`)
    console.log(`[GeneratorRunner] Review output at: src/apps/${appName}/`)
    console.log(`[GeneratorRunner] Run verify:  npm run onboard:verify -- --app=${appName}`)
  }
}
