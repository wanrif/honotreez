import { createAccessControl } from 'better-auth/plugins/access'
import {
  adminAc,
  defaultStatements,
  userAc,
} from 'better-auth/plugins/admin/access'

/*
  Statement shape:
  resource: ['create','read','update','delete','list','export','manage', ...]
  (define all possible actions per resource here)
*/
const statement = {
  ...defaultStatements,

  // Dashboard / Overview
  // dashboard: ['read', 'view'],
} as const

export const ac = createAccessControl(statement)

export const admin = ac.newRole({
  ...adminAc.statements,
})

export const user = ac.newRole({
  ...userAc.statements,
  // dashboard: ['read', 'view'],
})
