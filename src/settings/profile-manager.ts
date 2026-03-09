import { PRESET_PROFILES } from "../constants";
import type { ShellProfile } from "../types";

const PRESET_IDS = new Set(PRESET_PROFILES.map((p) => p.id));

export class ProfileManager {
  private profiles: ShellProfile[];

  constructor(savedProfiles: ShellProfile[]) {
    this.profiles =
      savedProfiles.length > 0 ? [...savedProfiles] : [...PRESET_PROFILES];
  }

  getProfiles(): ShellProfile[] {
    return [...this.profiles];
  }

  getProfile(id: string): ShellProfile | null {
    return this.profiles.find((p) => p.id === id) ?? null;
  }

  addProfile(profile: Omit<ShellProfile, "id">): ShellProfile {
    const newProfile: ShellProfile = {
      id: `profile-${crypto.randomUUID()}`,
      ...profile,
    };
    this.profiles.push(newProfile);
    return newProfile;
  }

  updateProfile(
    id: string,
    updates: Partial<ShellProfile>,
  ): ShellProfile | null {
    const index = this.profiles.findIndex((p) => p.id === id);
    if (index === -1) {
      return null;
    }
    this.profiles[index] = { ...this.profiles[index], ...updates, id };
    return this.profiles[index];
  }

  deleteProfile(id: string): boolean {
    if (PRESET_IDS.has(id)) {
      return false;
    }
    const index = this.profiles.findIndex((p) => p.id === id);
    if (index === -1) {
      return false;
    }
    this.profiles.splice(index, 1);
    return true;
  }

  getPresets(): ShellProfile[] {
    return [...PRESET_PROFILES];
  }

  resetToPresets(): void {
    this.profiles = [...PRESET_PROFILES];
  }
}
