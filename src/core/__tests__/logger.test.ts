import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createLogger } from "../logger";
import { LOG_PREFIX } from "../../constants";

describe("logger", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let infoSpy: ReturnType<typeof vi.spyOn>;
  let debugSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("error() calls console.error with LOG_PREFIX", () => {
    const logger = createLogger(false);
    logger.error("something went wrong");
    expect(errorSpy).toHaveBeenCalledWith(LOG_PREFIX, "something went wrong");
  });

  it("warn() calls console.warn with LOG_PREFIX", () => {
    const logger = createLogger(false);
    logger.warn("caution");
    expect(warnSpy).toHaveBeenCalledWith(LOG_PREFIX, "caution");
  });

  it("info() calls console.info with LOG_PREFIX", () => {
    const logger = createLogger(false);
    logger.info("informational");
    expect(infoSpy).toHaveBeenCalledWith(LOG_PREFIX, "informational");
  });

  it("debug() calls console.debug with LOG_PREFIX when debugEnabled=true", () => {
    const logger = createLogger(true);
    logger.debug("debug message");
    expect(debugSpy).toHaveBeenCalledWith(LOG_PREFIX, "debug message");
  });

  it("debug() does NOT call console.debug when debugEnabled=false", () => {
    const logger = createLogger(false);
    logger.debug("should not appear");
    expect(debugSpy).not.toHaveBeenCalled();
  });

  it("setDebugEnabled(true) enables debug output", () => {
    const logger = createLogger(false);
    logger.debug("before enable");
    expect(debugSpy).not.toHaveBeenCalled();

    logger.setDebugEnabled(true);
    logger.debug("after enable");
    expect(debugSpy).toHaveBeenCalledWith(LOG_PREFIX, "after enable");
  });

  it("setDebugEnabled(false) disables debug output", () => {
    const logger = createLogger(true);
    logger.debug("before disable");
    expect(debugSpy).toHaveBeenCalledOnce();

    logger.setDebugEnabled(false);
    logger.debug("after disable");
    expect(debugSpy).toHaveBeenCalledOnce(); // still only once
  });

  it("all methods pass through multiple arguments after prefix", () => {
    const logger = createLogger(true);
    const obj = { key: "value" };

    logger.error("msg", 42, obj);
    expect(errorSpy).toHaveBeenCalledWith(LOG_PREFIX, "msg", 42, obj);

    logger.warn("msg", 42, obj);
    expect(warnSpy).toHaveBeenCalledWith(LOG_PREFIX, "msg", 42, obj);

    logger.info("msg", 42, obj);
    expect(infoSpy).toHaveBeenCalledWith(LOG_PREFIX, "msg", 42, obj);

    logger.debug("msg", 42, obj);
    expect(debugSpy).toHaveBeenCalledWith(LOG_PREFIX, "msg", 42, obj);
  });
});
