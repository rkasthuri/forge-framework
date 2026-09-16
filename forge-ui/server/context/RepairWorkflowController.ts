/**
 * FORGE — Autonomous Quality Engineering
 * Framework for Observed, Reasoned, and Grounded Evaluation
 *
 * Copyright (c) 2026 AnvilQ Technologies LLC
 * Author: Raj Kasthuri
 *
 * Proprietary and confidential.
 * Unauthorized copying, distribution, or modification
 * of this software is strictly prohibited.
 */
import {executionContext} from './ExecutionContext'
import {ok,fail} from '../http'
type ResolveProject=(name:string)=>Promise<{appName:string;url:string}|undefined>
/** Transport validation and safe error presentation; all workflow meaning is core-owned. */
export async function repairWorkflowRequest(appName:string,operation:'prepare'|'context'|'create'|'list'|'read'|'command',identity:string|undefined,body:unknown,resolveProject:ResolveProject) {
  if(!await resolveProject(appName))return {status:404,body:fail('Project not found','NOT_FOUND')}
  if(identity!==undefined&&!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,254}$/.test(identity))return {status:400,body:fail('Invalid repair identity.','INVALID_REQUEST')}
  if(operation==='prepare'&&(body===null||typeof body!=='object'||Array.isArray(body)||Object.keys(body).length))return {status:400,body:fail('Invalid readiness request.','INVALID_REQUEST')}
  try {
    const result=operation==='prepare'?await executionContext.prepareProductRepairWorkspace(appName)
      :await executionContext.productRepairWorkflow(appName,operation,identity,body)
    return {status:200,body:ok(result)}
  } catch(cause) {
    const raw=(cause as {code?:unknown})?.code
    const code=typeof raw==='string'&&/^[a-z][a-z0-9_]{0,99}$/.test(raw)?raw:'repair_integrity_unavailable'
    const status=code==='invalid_request'?400:code==='repair_entry_not_found'?404:code.includes('upgrade_required')||code.includes('integrity')||code.includes('unavailable')?503:409
    return {status,body:fail('Repair workflow cannot continue: '+code.replaceAll('_',' ')+'.',code.toUpperCase())}
  }
}
