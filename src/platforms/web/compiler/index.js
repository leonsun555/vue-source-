/* @flow */

import { baseOptions } from './options'
import { createCompiler } from 'compiler/index'

//根據環境不同傳入不同options
const { compile, compileToFunctions } = createCompiler(baseOptions)

export { compile, compileToFunctions }
