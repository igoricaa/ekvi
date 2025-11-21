import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

// Load env from root .env.local
const envPath = path.resolve(process.cwd(), "../../.env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2];
    }
  }
}

const CONVEX_URL = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;

if (!CONVEX_URL) {
  console.error(
    "Error: CONVEX_URL or NEXT_PUBLIC_CONVEX_URL environment variable is required"
  );
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "yes");
    });
  });
}

async function cleanAllUsers() {
  console.log("\n⚠️  WARNING: This will delete ALL user data from Convex!\n");
  console.log("Tables to be cleared:");
  console.log(
    "  - Better Auth: user, session, account, verification, twoFactor, passkey"
  );
  console.log(
    "  - App: userProfiles, coachProfiles, videos, files, notifications"
  );
  console.log("  - Content: programs, programModules, workouts, exercises\n");

  const confirmed = await confirm("Are you sure you want to proceed?");

  if (!confirmed) {
    console.log("Aborted.");
    process.exit(0);
  }

  console.log("\nCleaning all users...\n");

  try {
    const result = await client.action(api.admin.cleanAllUsers);

    console.log("✅ Cleanup complete!\n");
    console.log("Deleted counts:");
    for (const [table, count] of Object.entries(result as Record<string, number>)) {
      console.log(`  ${table}: ${count}`);
    }
  } catch (error) {
    console.error("Error cleaning users:", error);
    process.exit(1);
  }
}

cleanAllUsers();
