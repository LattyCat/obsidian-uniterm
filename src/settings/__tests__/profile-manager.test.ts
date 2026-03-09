import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ProfileManager } from "../profile-manager";
import { PRESET_PROFILES } from "../../constants";
import type { ShellProfile } from "../../types";

describe("ProfileManager", () => {
  beforeEach(() => {
    vi.stubGlobal("crypto", { randomUUID: vi.fn(() => "test-uuid") });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("constructor", () => {
    it("uses PRESET_PROFILES when savedProfiles is empty", () => {
      const manager = new ProfileManager([]);
      expect(manager.getProfiles()).toEqual(PRESET_PROFILES);
    });

    it("uses saved profiles when provided", () => {
      const saved: ShellProfile[] = [
        {
          id: "custom-1",
          name: "Custom",
          shellPath: "/bin/zsh",
          shellArgs: [],
          cwd: "",
          icon: "terminal",
        },
      ];
      const manager = new ProfileManager(saved);
      expect(manager.getProfiles()).toEqual(saved);
    });

    it("does not mutate the input array", () => {
      const saved: ShellProfile[] = [
        {
          id: "custom-1",
          name: "Custom",
          shellPath: "/bin/zsh",
          shellArgs: [],
          cwd: "",
          icon: "terminal",
        },
      ];
      const manager = new ProfileManager(saved);
      saved.push({
        id: "custom-2",
        name: "Another",
        shellPath: "",
        shellArgs: [],
        cwd: "",
        icon: "terminal",
      });
      expect(manager.getProfiles()).toHaveLength(1);
    });
  });

  describe("getProfiles", () => {
    it("returns a copy (mutation-safe)", () => {
      const manager = new ProfileManager([]);
      const profiles = manager.getProfiles();
      profiles.push({
        id: "injected",
        name: "Injected",
        shellPath: "",
        shellArgs: [],
        cwd: "",
        icon: "terminal",
      });
      expect(manager.getProfiles()).toHaveLength(PRESET_PROFILES.length);
    });
  });

  describe("getProfile", () => {
    it("returns the profile for a known ID", () => {
      const manager = new ProfileManager([]);
      const profile = manager.getProfile("default");
      expect(profile).not.toBeNull();
      expect(profile!.id).toBe("default");
      expect(profile!.name).toBe("Default Shell");
    });

    it("returns null for an unknown ID", () => {
      const manager = new ProfileManager([]);
      expect(manager.getProfile("nonexistent")).toBeNull();
    });
  });

  describe("addProfile", () => {
    it("generates an ID with profile- prefix using crypto.randomUUID", () => {
      const manager = new ProfileManager([]);
      const added = manager.addProfile({
        name: "My Shell",
        shellPath: "/bin/fish",
        shellArgs: [],
        cwd: "",
        icon: "terminal",
      });
      expect(added.id).toBe("profile-test-uuid");
    });

    it("adds the profile to the list", () => {
      const manager = new ProfileManager([]);
      const initialCount = manager.getProfiles().length;
      manager.addProfile({
        name: "My Shell",
        shellPath: "/bin/fish",
        shellArgs: [],
        cwd: "",
        icon: "terminal",
      });
      expect(manager.getProfiles()).toHaveLength(initialCount + 1);
    });

    it("returns the complete profile with generated ID", () => {
      const manager = new ProfileManager([]);
      const added = manager.addProfile({
        name: "Fish",
        shellPath: "/bin/fish",
        shellArgs: ["--login"],
        cwd: "/home",
        icon: "fish",
      });
      expect(added).toEqual({
        id: "profile-test-uuid",
        name: "Fish",
        shellPath: "/bin/fish",
        shellArgs: ["--login"],
        cwd: "/home",
        icon: "fish",
      });
    });
  });

  describe("updateProfile", () => {
    it("merges partial updates into existing profile", () => {
      const manager = new ProfileManager([]);
      const updated = manager.updateProfile("default", { name: "Renamed" });
      expect(updated).not.toBeNull();
      expect(updated!.name).toBe("Renamed");
      expect(updated!.id).toBe("default");
    });

    it("returns null for an unknown ID", () => {
      const manager = new ProfileManager([]);
      expect(manager.updateProfile("nonexistent", { name: "X" })).toBeNull();
    });

    it("persists the update in the profiles list", () => {
      const manager = new ProfileManager([]);
      manager.updateProfile("default", { name: "Updated Default" });
      const profile = manager.getProfile("default");
      expect(profile!.name).toBe("Updated Default");
    });

    it("only updates specified fields", () => {
      const manager = new ProfileManager([]);
      const original = manager.getProfile("default")!;
      manager.updateProfile("default", { icon: "new-icon" });
      const updated = manager.getProfile("default")!;
      expect(updated.icon).toBe("new-icon");
      expect(updated.name).toBe(original.name);
      expect(updated.shellPath).toBe(original.shellPath);
    });
  });

  describe("deleteProfile", () => {
    it("returns false for preset IDs", () => {
      const manager = new ProfileManager([]);
      for (const preset of PRESET_PROFILES) {
        expect(manager.deleteProfile(preset.id)).toBe(false);
      }
    });

    it("does not remove preset profiles", () => {
      const manager = new ProfileManager([]);
      manager.deleteProfile("default");
      expect(manager.getProfile("default")).not.toBeNull();
    });

    it("returns true for user-created profiles", () => {
      const manager = new ProfileManager([]);
      const added = manager.addProfile({
        name: "Deletable",
        shellPath: "",
        shellArgs: [],
        cwd: "",
        icon: "terminal",
      });
      expect(manager.deleteProfile(added.id)).toBe(true);
    });

    it("removes the user profile from the list", () => {
      const manager = new ProfileManager([]);
      const added = manager.addProfile({
        name: "Deletable",
        shellPath: "",
        shellArgs: [],
        cwd: "",
        icon: "terminal",
      });
      const countBefore = manager.getProfiles().length;
      manager.deleteProfile(added.id);
      expect(manager.getProfiles()).toHaveLength(countBefore - 1);
      expect(manager.getProfile(added.id)).toBeNull();
    });

    it("returns false for unknown IDs", () => {
      const manager = new ProfileManager([]);
      expect(manager.deleteProfile("nonexistent")).toBe(false);
    });
  });

  describe("getPresets", () => {
    it("returns PRESET_PROFILES", () => {
      const manager = new ProfileManager([]);
      expect(manager.getPresets()).toEqual(PRESET_PROFILES);
    });

    it("returns a copy (mutation-safe)", () => {
      const manager = new ProfileManager([]);
      const presets = manager.getPresets();
      presets.push({
        id: "injected",
        name: "Injected",
        shellPath: "",
        shellArgs: [],
        cwd: "",
        icon: "terminal",
      });
      expect(manager.getPresets()).toHaveLength(PRESET_PROFILES.length);
    });
  });

  describe("resetToPresets", () => {
    it("restores profiles to PRESET_PROFILES", () => {
      const manager = new ProfileManager([
        {
          id: "custom-1",
          name: "Custom",
          shellPath: "",
          shellArgs: [],
          cwd: "",
          icon: "terminal",
        },
      ]);
      manager.resetToPresets();
      expect(manager.getProfiles()).toEqual(PRESET_PROFILES);
    });

    it("removes any user-added profiles", () => {
      const manager = new ProfileManager([]);
      manager.addProfile({
        name: "Extra",
        shellPath: "",
        shellArgs: [],
        cwd: "",
        icon: "terminal",
      });
      manager.resetToPresets();
      expect(manager.getProfiles()).toHaveLength(PRESET_PROFILES.length);
    });
  });
});
