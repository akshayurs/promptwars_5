import "server-only";

type Level = "info" | "warn" | "error";
type Fields = Record<string, string | number | boolean>;
type Sink = (line: string) => void;

const defaultSink: Sink = (line) => {
  process.stderr.write(`${line}\n`);
};

export type Logger = Record<Level, (message: string, fields?: Fields) => void>;

/** Structured JSON-lines logger; fields must never carry request bodies, plans or prompts. */
export const createLogger = (
  sink: Sink = defaultSink,
  now: () => Date = () => new Date(),
): Logger => {
  const emit = (level: Level, message: string, fields: Fields = {}): void => {
    sink(JSON.stringify({ time: now().toISOString(), level, message, ...fields }));
  };
  return {
    info: (message: string, fields?: Fields): void => {
      emit("info", message, fields);
    },
    warn: (message: string, fields?: Fields): void => {
      emit("warn", message, fields);
    },
    error: (message: string, fields?: Fields): void => {
      emit("error", message, fields);
    },
  };
};

/** Process-wide logger writing to stderr. */
export const logger: Logger = createLogger();
