/**
 * Interface-based admission for the Host services this Bundle consumes.
 *
 * The minimum requirement is judged from the members this plugin actually calls,
 * never from a Host version number: the same usage statistics must run against
 * every Host that publishes the documented read-only persistence, storage-domain
 * and Typert contracts. A missing or incomplete core interface is reported as a
 * concrete error instead of degrading the product or hiding the failure.
 */

/** A Host service read from a Context whose service key is not statically typed here. */
type HostService = object

/** Name of one required host service together with the members this plugin calls. */
interface HostCapability {
  /** Human-readable service name used in diagnostics. */
  readonly label: string
  /** Context service key carrying the interface. */
  readonly key: string
  /** Members that must be callable; absent members reject the interface. */
  readonly members: readonly string[]
}

/** Context shape needed for capability admission, independent of the Cordis version. */
export interface CapabilityContext {
  /** Read one registered service, or `undefined` when the Host does not provide it. */
  get(name: string): unknown
}

/** Core read-only session persistence: listing, opening and revision comparison. */
export const SESSION_PERSISTENCE_CAPABILITY = {
  label: 'sessionPersistence',
  key: 'sessionPersistence',
  members: ['list', 'open', 'stat'],
} as const satisfies HostCapability

/** Host-owned cache domain facility. */
export const STORAGE_DOMAIN_CAPABILITY = {
  label: 'storageDomain',
  key: 'storageDomain',
  members: ['open'],
} as const satisfies HostCapability

/**
 * Resolve one required Host service through its published interface.
 * @param ctx - Context that owns the service.
 * @param capability - Service key and required callable members.
 * @returns The resolved service.
 * @throws When the Host does not provide the service or publishes an incomplete interface.
 */
export function requireHostCapability<T extends HostService>(ctx: CapabilityContext, capability: HostCapability): T {
  const service = ctx.get(capability.key)
  if (service === undefined || service === null) {
    throw new Error(`usage insights: the Host does not provide the required ${capability.label} service (ctx.get(${JSON.stringify(capability.key)}))`)
  }
  const members = service as Record<string, unknown>
  const missing = capability.members.filter(member => typeof members[member] !== 'function')
  if (missing.length > 0) {
    throw new Error(`usage insights: the Host ${capability.label} service is missing required member(s): ${missing.join(', ')}`)
  }
  return service as T
}
