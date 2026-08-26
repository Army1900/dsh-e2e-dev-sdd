import { Service } from "@deepseek-ai/cordis";
//#region src/extensions.ts
const PROVIDER_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function assertProviderName(name) {
	if (!PROVIDER_NAME.test(name)) throw new Error(`invalid SDD provider name: ${JSON.stringify(name)}`);
}
function validateSourceEnvelope(value) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("source provider returned a non-object");
	const source = value;
	if (source.schema !== "dsh-sdd/source@1") throw new Error("source.schema must be dsh-sdd/source@1");
	for (const field of [
		"uid",
		"provider",
		"kind",
		"title",
		"fetchedAt"
	]) if (typeof source[field] !== "string" || source[field] === "") throw new Error(`source.${field} is required`);
	if (!("content" in source) || source.content === void 0) throw new Error("source.content is required");
	if (!Number.isFinite(Date.parse(source.fetchedAt))) throw new Error("source.fetchedAt must be an ISO date-time");
	return source;
}
var SddSourceRegistry = class extends Service {
	providers = /* @__PURE__ */ new Map();
	constructor(ctx) {
		super(ctx, "dshSddSources");
	}
	register(providerOrFactory) {
		const lifecycle = new AbortController();
		let provider;
		try {
			provider = typeof providerOrFactory === "function" ? providerOrFactory({ signal: lifecycle.signal }) : providerOrFactory;
			assertProviderName(provider.name);
			if (provider.kinds.length === 0 || provider.kinds.some((kind) => typeof kind !== "string" || kind === "")) throw new Error(`source provider "${provider.name}" must declare at least one kind`);
			if (this.providers.has(provider.name)) throw new Error(`source provider already registered: ${provider.name}`);
			this.providers.set(provider.name, {
				provider,
				lifecycle
			});
			return this.ctx.effect(() => () => {
				if (this.providers.get(provider.name)?.provider === provider) this.providers.delete(provider.name);
				lifecycle.abort(/* @__PURE__ */ new Error(`source provider "${provider.name}" disposed`));
			}, `dsh-sdd: source provider ${provider.name}`);
		} catch (error) {
			lifecycle.abort(error);
			throw error;
		}
	}
	names() {
		return [...this.providers.keys()].sort();
	}
	get(name) {
		return this.providers.get(name)?.provider;
	}
	async fetch(name, request) {
		const registered = this.providers.get(name);
		if (registered === void 0) throw new Error(`source provider not found: ${name}`);
		if (!registered.provider.kinds.includes("*") && !registered.provider.kinds.includes(request.kind)) throw new Error(`source provider "${name}" does not support kind "${request.kind}"`);
		const signal = request.signal === void 0 ? registered.lifecycle.signal : AbortSignal.any([request.signal, registered.lifecycle.signal]);
		return validateSourceEnvelope(await registered.provider.get({
			...request,
			signal
		}));
	}
};
var SddIdentifierRegistry = class extends Service {
	providers = /* @__PURE__ */ new Map();
	constructor(ctx) {
		super(ctx, "dshSddIdentifiers");
	}
	register(providerOrFactory) {
		const lifecycle = new AbortController();
		let provider;
		try {
			provider = typeof providerOrFactory === "function" ? providerOrFactory({ signal: lifecycle.signal }) : providerOrFactory;
			assertProviderName(provider.name);
			if (this.providers.has(provider.name)) throw new Error(`identifier provider already registered: ${provider.name}`);
			this.providers.set(provider.name, {
				provider,
				lifecycle
			});
			return this.ctx.effect(() => () => {
				if (this.providers.get(provider.name)?.provider === provider) this.providers.delete(provider.name);
				lifecycle.abort(/* @__PURE__ */ new Error(`identifier provider "${provider.name}" disposed`));
			}, `dsh-sdd: identifier provider ${provider.name}`);
		} catch (error) {
			lifecycle.abort(error);
			throw error;
		}
	}
	names() {
		return [...this.providers.keys()].sort();
	}
	get(name) {
		return this.providers.get(name)?.provider;
	}
};
//#endregion
export { SddIdentifierRegistry, SddSourceRegistry, SddSourceRegistry as default, validateSourceEnvelope };
