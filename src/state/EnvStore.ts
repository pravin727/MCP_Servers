export type EnvValue = string | number | boolean | null;

export interface EnvProfile {
  name: string;
  values: Record<string, EnvValue>;
  secrets?: string[];
}

class EnvStoreImpl {
  private activeProfileName: string | null = null;
  private profiles = new Map<string, EnvProfile>();
  private runtime = new Map<string, EnvValue>();
  private secretKeys = new Set<string>();

  setProfile(profile: EnvProfile) {
    this.profiles.set(profile.name, profile);
    if (profile.secrets) {
      for (const k of profile.secrets) this.secretKeys.add(k);
    }
    this.activeProfileName = profile.name;
  }

  setActiveProfile(name: string) {
    if (!this.profiles.has(name)) throw new Error(`Unknown environment profile: ${name}`);
    this.activeProfileName = name;
  }

  set(key: string, value: EnvValue, opts?: { secret?: boolean }) {
    this.runtime.set(key, value);
    if (opts?.secret) this.secretKeys.add(key);
  }

  get(key: string): EnvValue | undefined {
    if (this.runtime.has(key)) return this.runtime.get(key);
    const profile = this.activeProfileName ? this.profiles.get(this.activeProfileName) : undefined;
    if (profile && key in profile.values) return profile.values[key];
    return undefined;
  }

  snapshot(maskSecrets = true): Record<string, EnvValue> {
    const out: Record<string, EnvValue> = {};
    const profile = this.activeProfileName ? this.profiles.get(this.activeProfileName) : undefined;
    if (profile) {
      for (const [k, v] of Object.entries(profile.values)) out[k] = this.mask(k, v, maskSecrets);
    }
    for (const [k, v] of this.runtime.entries()) out[k] = this.mask(k, v, maskSecrets);
    return out;
  }

  getActiveProfileName(): string | null {
    return this.activeProfileName;
  }

  isSecretKey(key: string): boolean {
    return this.secretKeys.has(key);
  }

  maskValue(value: any): any {
    if (value == null) return value;
    const s = String(value);
    if (s.length <= 4) return '****';
    return `${s.slice(0, 2)}****${s.slice(-2)}`;
  }

  private mask(key: string, value: EnvValue, maskSecrets: boolean): EnvValue {
    if (!maskSecrets) return value;
    if (!this.isSecretKey(key)) return value;
    return this.maskValue(value) as any;
  }
}

export const EnvStore = new EnvStoreImpl();

