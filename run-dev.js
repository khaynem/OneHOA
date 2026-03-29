const { spawn } = require("child_process");
const path = require("path");

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function startService(name, relativeDir) {
  const cwd = path.join(__dirname, relativeDir);
  const child = spawn(npmCommand, ["run", "dev"], {
    cwd,
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
  });

  child.stdout.on("data", (data) => {
    process.stdout.write(`[${name}] ${data}`);
  });

  child.stderr.on("data", (data) => {
    process.stderr.write(`[${name}] ${data}`);
  });

  child.on("exit", (code, signal) => {
    const reason = signal ? `signal ${signal}` : `code ${code}`;
    process.stdout.write(`\n[${name}] exited with ${reason}\n`);
  });

  child.on("error", (error) => {
    process.stderr.write(`\n[${name}] failed to start: ${error.message}\n`);
  });

  return child;
}

const backend = startService("Backend", "Backend");
const frontend = startService("Frontend", "Frontend");

function shutdown() {
  if (!backend.killed) backend.kill("SIGINT");
  if (!frontend.killed) frontend.kill("SIGINT");
}

process.on("SIGINT", () => {
  process.stdout.write("\nStopping both services...\n");
  shutdown();
  process.exit(0);
});

process.on("SIGTERM", () => {
  shutdown();
  process.exit(0);
});
