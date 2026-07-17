import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { QUALITY_FIXTURES } from "../quality/fixtures";
import { createBlankReport, type QualityEvidence } from "../quality/scorecard";

type Target = { creatorUrl?: string; recipientUrl?: string };
type TargetMap = Record<string, Target>;

const args = Bun.argv.slice(2);
const option = (name: string) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};

const targetsPath = option("--targets");
const requestedFixture = option("--fixture");
const runId = option("--run-id") ?? new Date().toISOString().replace(/[:.]/g, "-");
const outputDir = resolve("quality/runs", runId);

async function command(commandArgs: string[]) {
  const proc = Bun.spawn(["agent-browser", ...commandArgs], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (exitCode !== 0) {
    throw new Error(`agent-browser ${commandArgs[0]} failed: ${stderr || stdout}`);
  }
  return stdout.trim();
}

async function readTargets(): Promise<TargetMap> {
  if (!targetsPath) return {};
  const absolute = resolve(targetsPath);
  if (!existsSync(absolute)) throw new Error(`Target file not found: ${absolute}`);
  return JSON.parse(await readFile(absolute, "utf8")) as TargetMap;
}

async function capture(url: string, fixtureId: string, surface: "creator" | "recipient") {
  const safeName = `${fixtureId}-${surface}`;
  const phonePath = resolve(outputDir, `${safeName}-phone.png`);
  const desktopPath = resolve(outputDir, `${safeName}-desktop.png`);
  const session = `quality-${runId}-${fixtureId}-${surface}`.replace(/[^a-zA-Z0-9_-]/g, "-");

  await command(["--session", session, "set", "viewport", "390", "844"]);
  await command(["--session", session, "open", url]);
  await command(["--session", session, "wait", "900"]);
  await command(["--session", session, "screenshot", "--full", phonePath]);
  const phoneVitals = await command(["--session", session, "vitals", "--json"]);

  await command(["--session", session, "set", "viewport", "1440", "900"]);
  await command(["--session", session, "reload"]);
  await command(["--session", session, "wait", "900"]);
  await command(["--session", session, "screenshot", "--full", desktopPath]);
  const desktopVitals = await command(["--session", session, "vitals", "--json"]);
  await command(["--session", session, "close", "--all"]);

  await writeFile(
    resolve(outputDir, `${safeName}-vitals.json`),
    JSON.stringify({ phone: JSON.parse(phoneVitals), desktop: JSON.parse(desktopVitals) }, null, 2),
  );

  return [phonePath, desktopPath];
}

async function main() {
  const targets = await readTargets();
  const fixtures = requestedFixture
    ? QUALITY_FIXTURES.filter((fixture) => fixture.id === requestedFixture)
    : QUALITY_FIXTURES;

  if (requestedFixture && fixtures.length === 0) {
    throw new Error(`Unknown fixture: ${requestedFixture}`);
  }

  await mkdir(outputDir, { recursive: true });
  const reports = [];

  for (const fixture of fixtures) {
    const target = targets[fixture.id];
    const evidence: QualityEvidence[] = [];

    for (const [surface, url] of [
      ["creator", target?.creatorUrl],
      ["recipient", target?.recipientUrl],
    ] as const) {
      if (!url) continue;
      const screenshots = await capture(url, fixture.id, surface);
      evidence.push({
        screenshots: screenshots.map((path) => `./${basename(path)}`),
        ...(surface === "creator" ? { creatorUrl: url } : { recipientUrl: url }),
        viewport: { width: 390, height: 844 },
      });
    }

    reports.push({
      fixture,
      report: createBlankReport(fixture.id, evidence),
      status: evidence.length ? "captured" : "awaiting-targets",
    });
  }

  await writeFile(
    resolve(outputDir, "baseline-report.json"),
    JSON.stringify({ runId, createdAt: new Date().toISOString(), reports }, null, 2),
  );
  console.log(`Quality baseline created at ${outputDir}`);
  console.log(
    `${reports.filter((entry) => entry.status === "captured").length}/${reports.length} fixtures captured`,
  );
}

await main();
