import fs from "fs/promises";
import path from "path";

import inquirer from "inquirer";
import semver from "semver";

const PACKAGES = [
  "../packages/mobx-zod-form/package.json",
  "../packages/mobx-zod-form-react/package.json",
];

async function updateVersion() {
  try {
    // Get the current version from the first package (they should be the same)
    const firstPackagePath = path.join(__dirname, PACKAGES[0]);
    const firstPackageContent = JSON.parse(
      await fs.readFile(firstPackagePath, "utf-8"),
    );
    const currentVersion = firstPackageContent.version;

    const { versionType } = await inquirer.prompt([
      {
        type: "list",
        name: "versionType",
        message: "What type of version change would you like to make?",
        choices: [
          { name: "Major (Breaking Changes)", value: "major" },
          { name: "Feature (Minor)", value: "minor" },
          { name: "Fix (Patch)", value: "patch" },
          { name: "No changes", value: "none" },
        ],
      },
    ]);

    if (versionType === "none") {
      console.info("No version changes made.");
      return;
    }

    const newVersion = semver.inc(currentVersion, versionType);

    if (!newVersion) {
      console.error("Failed to generate new version number");
      process.exit(1);
    }

    const { confirm } = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirm",
        message: `Update all packages from version ${currentVersion} to ${newVersion}?`,
        default: false,
      },
    ]);

    if (!confirm) {
      console.info("Version update cancelled.");
      return;
    }

    // Update all packages with the new version
    for (const packageJsonPath of PACKAGES) {
      const fullPath = path.join(__dirname, packageJsonPath);
      const packageContent = JSON.parse(await fs.readFile(fullPath, "utf-8"));
      packageContent.version = newVersion;
      await fs.writeFile(
        fullPath,
        JSON.stringify(packageContent, null, 2) + "\n",
      );
      console.info(
        `Updated ${path.basename(
          path.dirname(packageJsonPath),
        )} to version ${newVersion}`,
      );
    }

    console.info("\nSuccessfully updated all package versions!");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

updateVersion().catch(console.error);
