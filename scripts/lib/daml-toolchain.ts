import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { spawnSync, type SpawnSyncOptions } from "node:child_process";

type CommandResult = {
  ok: boolean;
  output: string;
};

export type DamlToolchain = {
  dpmPath: string;
  dpmVersion: string;
  env: NodeJS.ProcessEnv;
  javaHome: string;
  javaVersion: string;
};

const runCommand = (
  command: string,
  args: readonly string[],
  options: SpawnSyncOptions = {}
): CommandResult => {
  const result = spawnSync(command, [...args], {
    encoding: "utf8",
    ...options
  });
  const output = String(result.stdout || result.stderr || "").trim();

  return {
    ok: result.status === 0,
    output
  };
};

const resolveExistingFile = (candidates: readonly string[]): string | undefined =>
  candidates.find((candidate) => existsSync(candidate));

const resolveJavaHome = (): string | undefined => {
  const envJavaHome = process.env.JAVA_HOME;

  if (envJavaHome !== undefined && existsSync(path.join(envJavaHome, "bin", "java"))) {
    return envJavaHome;
  }

  const javaHomeCommand = runCommand("/usr/libexec/java_home", ["-v", "17"]);

  if (javaHomeCommand.ok && existsSync(path.join(javaHomeCommand.output, "bin", "java"))) {
    return javaHomeCommand.output;
  }

  return resolveExistingFile([
    "/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home",
    "/usr/local/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home",
    "/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home",
    "/usr/local/opt/openjdk/libexec/openjdk.jdk/Contents/Home"
  ]);
};

const resolveDpmPath = (): string | undefined => {
  const envDpmBin = process.env.DPM_BIN;

  if (envDpmBin !== undefined && existsSync(envDpmBin)) {
    return envDpmBin;
  }

  const envDpmHome = process.env.DPM_HOME;

  if (envDpmHome !== undefined) {
    const fromDpmHome = path.join(envDpmHome, "bin", "dpm");

    if (existsSync(fromDpmHome)) {
      return fromDpmHome;
    }
  }

  const homeDpm = path.join(homedir(), ".dpm", "bin", "dpm");

  if (existsSync(homeDpm)) {
    return homeDpm;
  }

  const onPath = runCommand("dpm", ["--version"]);

  return onPath.ok ? "dpm" : undefined;
};

const prependPathEntries = (existingPath: string | undefined, entries: readonly string[]): string =>
  [...entries.filter((entry) => entry.length > 0), existingPath ?? ""]
    .filter((entry, index, values) => entry.length > 0 && values.indexOf(entry) === index)
    .join(path.delimiter);

export const resolveDamlToolchain = ():
  | { ok: true; toolchain: DamlToolchain }
  | { ok: false; reason: string } => {
  const javaHome = resolveJavaHome();

  if (javaHome === undefined) {
    return {
      ok: false,
      reason: "JDK 17 was not found. Install openjdk@17 or set JAVA_HOME."
    };
  }

  const dpmPath = resolveDpmPath();

  if (dpmPath === undefined) {
    return {
      ok: false,
      reason:
        "DPM was not found. Install it from https://docs.digitalasset.com/build/3.4/tools/dpm."
    };
  }

  const env = {
    ...process.env,
    JAVA_HOME: javaHome,
    PATH: prependPathEntries(process.env.PATH, [path.dirname(dpmPath), path.join(javaHome, "bin")])
  };
  const dpmVersion = runCommand(dpmPath, ["version", "--active"], { env });

  if (!dpmVersion.ok) {
    return {
      ok: false,
      reason: dpmVersion.output || "Failed to run dpm version --active."
    };
  }

  const javaVersion = runCommand(path.join(javaHome, "bin", "java"), ["-version"], { env });

  if (!javaVersion.ok) {
    return {
      ok: false,
      reason: javaVersion.output || "Failed to run java -version."
    };
  }

  return {
    ok: true,
    toolchain: {
      dpmPath,
      dpmVersion: dpmVersion.output.split("\n")[0] ?? dpmVersion.output,
      env,
      javaHome,
      javaVersion: javaVersion.output.split("\n")[0] ?? javaVersion.output
    }
  };
};

export const readDamlSdkVersion = (projectRoot: string): string => {
  const damlYamlPath = path.join(projectRoot, "daml.yaml");
  const sdkVersionLine = readFileSync(damlYamlPath, "utf8")
    .split("\n")
    .find((line) => line.startsWith("sdk-version:"));

  if (sdkVersionLine === undefined) {
    throw new Error(`sdk-version is missing from ${damlYamlPath}.`);
  }

  return sdkVersionLine.split(":")[1]?.trim() ?? "";
};

export const ensureSdkVersionsInstalled = (
  toolchain: DamlToolchain,
  projectRoots: readonly string[]
): void => {
  const sdkVersions = [...new Set(projectRoots.map(readDamlSdkVersion))];

  for (const sdkVersion of sdkVersions) {
    const installResult = runCommand(toolchain.dpmPath, ["install", sdkVersion], {
      cwd: process.cwd(),
      env: toolchain.env
    });

    if (!installResult.ok) {
      throw new Error(
        installResult.output || `Failed to install Daml SDK version ${sdkVersion} with dpm.`
      );
    }
  }
};
