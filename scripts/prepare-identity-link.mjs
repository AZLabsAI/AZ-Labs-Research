#!/usr/bin/env node
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const args = new Map()
for (let index = 2; index < process.argv.length; index += 2) {
  const name = process.argv[index]
  const value = process.argv[index + 1]
  if (!name?.startsWith('--') || !value) throw new Error('Provide --subject, --local-subject, --proof-kind and --proof-reference, optionally --output.')
  args.set(name.slice(2), value)
}
const subject = args.get('subject')
const localSubject = args.get('local-subject')
const proofKind = args.get('proof-kind')
const proofReference = args.get('proof-reference')
if (!subject || !/^[a-zA-Z0-9:_-]{1,256}$/.test(subject)) throw new Error('A verified central subject is required; email addresses are not identity keys.')
if (!localSubject || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(localSubject)) throw new Error('A verified Supabase user UUID is required.')
if (!['dual_authenticated', 'new_account_no_collision'].includes(proofKind)) throw new Error('An approved ownership proof kind is required.')
if (!proofReference || !/^[a-zA-Z0-9][a-zA-Z0-9_./:# -]{7,511}$/.test(proofReference)) throw new Error('Provide an audit reference to verified ownership evidence, without credentials or tokens.')
const review = {
  central: { subject, product: 'research', localSubject, proofKind, proofReference },
  local: { issuer: 'https://azlabs.ai/api/auth', subject, localSubject, proofKind, proofReference },
  reviewRequired: true,
  destination: 'Trusted AZ Labs administrator: POST /api/admin/identity-links with the central object only.',
  note: 'This file records proposed mappings. It does not authenticate either account, approve access or submit anything.',
}
const json = JSON.stringify(review, null, 2) + '\n'
if (args.has('output')) {
  await writeFile(resolve(args.get('output')), json, { encoding: 'utf8', flag: 'wx', mode: 0o600 })
  process.stdout.write('Identity mapping review saved locally. No remote changes were made.\n')
} else process.stdout.write(json)
