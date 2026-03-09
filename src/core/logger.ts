import { LOG_PREFIX } from "../constants";

export interface Logger {
  error: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
  setDebugEnabled: (enabled: boolean) => void;
}

/** Create a logger that prefixes all messages with LOG_PREFIX */
export function createLogger(debugEnabled: boolean): Logger {
  let isDebugEnabled = debugEnabled;

  return {
    error: (...args: unknown[]) => {
      console.error(LOG_PREFIX, ...args);
    },
    warn: (...args: unknown[]) => {
      console.warn(LOG_PREFIX, ...args);
    },
    info: (...args: unknown[]) => {
      console.info(LOG_PREFIX, ...args);
    },
    debug: (...args: unknown[]) => {
      if (isDebugEnabled) {
        console.debug(LOG_PREFIX, ...args);
      }
    },
    setDebugEnabled: (enabled: boolean) => {
      isDebugEnabled = enabled;
    },
  };
}
