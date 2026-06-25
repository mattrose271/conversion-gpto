"use strict";

const os = require("node:os");
const path = require("node:path");

function build(name, options = {}) {
  const appName = String(name || "gpto");
  const isolated = options.isolated !== false;
  const suffix = options.suffix || "";
  const directoryName = `${appName}${suffix}`;
  const home = os.homedir() || os.tmpdir();
  const segment = isolated ? directoryName : "";
  const cacheRoot = process.env.XDG_CACHE_HOME || path.join(home, ".cache");
  const configRoot = process.env.XDG_CONFIG_HOME || path.join(home, ".config");
  const dataRoot = process.env.XDG_DATA_HOME || path.join(home, ".local", "share");
  const stateRoot = process.env.XDG_STATE_HOME || path.join(home, ".local", "state");

  return {
    cache: () => path.join(cacheRoot, segment),
    config: () => path.join(configRoot, segment),
    data: () => path.join(dataRoot, segment),
    runtime: () => process.env.XDG_RUNTIME_DIR
      ? path.join(process.env.XDG_RUNTIME_DIR, segment)
      : undefined,
    state: () => path.join(stateRoot, segment),
    configDirs: () => [path.join(configRoot, segment)],
    dataDirs: () => [path.join(dataRoot, segment)],
  };
}

module.exports = build;
