import * as fs from "fs";
import * as path from "path";
import * as glob from "glob";
import { C8yPact, C8yPactSaveKeys } from "./c8ypact";

/**
 * Using C8yPactFileAdapter you can implement your own adapter to load and save pacts using any format you want.
 * This allows loading pact objects from different sources, such as HAR files, pact.io, etc.
 *
 * The default adapter is C8yPactDefaultFileAdapter which loads and saves pact objects from/to
 * json files using C8yPact objects. Default location is cypress/fixtures/c8ypact folder.
 */
export interface C8yPactFileAdapter {
  /**
   * Loads all pact objects. The key must be the pact id used in C8yPact.id.
   */
  loadPacts: () => { [key: string]: C8yPact };
  /**
   * Loads a pact object by id from file.
   */
  loadPact: (id: string) => C8yPact | null;
  /**
   * Saves a pact object.
   */
  savePact: (pact: C8yPact) => void;
  /**
   * Deletes a pact object or file.
   */
  deletePact: (id: string) => void;
  /**
   * Gets the folder where the pact files are stored.
   */
  getFolder: () => string;
  /**
   * Checks if a pact exists for a given id.
   */
  pactExists(id: string): boolean;
}

/**
 * Default implementation of C8yPactFileAdapter which loads and saves pact objects from/to
 * json files using C8yPact objects.
 */
export class C8yPactDefaultFileAdapter implements C8yPactFileAdapter {
  folder: string;
  constructor(folder: string) {
    this.folder = folder;
  }

  getFolder(): string {
    return this.folder;
  }

  loadPacts(): { [key: string]: C8yPact } {
    const jsonFiles = this.loadPactObjects();
    return jsonFiles.reduce((acc, obj) => {
      if (!obj?.info?.id) return acc;
      acc[obj.info.id] = obj;
      return acc;
    }, {});
  }

  loadPact(id: string): C8yPact | null {
    if (!this.folder || !fs.existsSync(this.folder)) {
      return null;
    }
    const file = path.join(this.folder, `${id}.json`);
    if (fs.existsSync(file)) {
      const pact = fs.readFileSync(file, "utf-8");
      return JSON.parse(pact);
    }
    return null;
  }

  pactExists(id: string): boolean {
    return fs.existsSync(path.join(this.folder, `${id}.json`));
  }

  savePact(pact: C8yPact | Pick<C8yPact, C8yPactSaveKeys>): void {
    this.createFolderRecursive(this.folder, true);
    const file = path.join(this.folder, `${pact.id}.json`);
    try {
      fs.writeFileSync(
        file,
        this.safeStringify(
          {
            id: pact.id,
            info: pact.info,
            records: pact.records,
          },
          2
        ),
        "utf-8"
      );
    } catch (error) {
      console.error(`Failed to save pact.`, error);
    }
  }

  safeStringify(obj: any, indent = 2) {
    let cache: any[] = [];
    const retVal = JSON.stringify(
      obj,
      (key, value) =>
        typeof value === "object" && value !== null
          ? cache.includes(value)
            ? undefined
            : cache.push(value) && value
          : value,
      indent
    );
    cache = [];
    return retVal;
  }

  deletePact(id: string): void {
    const filePath = path.join(this.folder, `${id}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    } else {
      console.log(`File ${filePath} does not exist. Nothing to delete.`);
    }
  }

  readJsonFiles(): string[] {
    if (!this.folder || !fs.existsSync(this.folder)) {
      return [];
    }
    const jsonFiles = glob.sync(path.join(this.folder, "*.json"));
    const pacts = jsonFiles.map((file) => {
      return fs.readFileSync(file, "utf-8");
    });
    return pacts;
  }

  protected deleteJsonFiles(): void {
    if (!this.folder || !fs.existsSync(this.folder)) {
      return;
    }
    const jsonFiles = glob.sync(path.join(this.folder, "*.json"));
    jsonFiles.forEach((file) => {
      fs.unlinkSync(file);
    });
  }

  protected loadPactObjects() {
    const pacts = this.readJsonFiles();
    return pacts.map((pact) => JSON.parse(pact));
  }

  protected createFolderRecursive(f: string, absolutePath: boolean) {
    const parts = f?.split(path.sep);
    parts.forEach((part, i) => {
      let currentPath = path.join(...parts.slice(0, i + 1));
      if (absolutePath) {
        currentPath = path.join(path.sep, currentPath);
      }
      if (!fs.existsSync(currentPath)) {
        fs.mkdirSync(currentPath);
      }
    });
  }

  protected isNodeError<T extends new (...args: any) => Error>(
    error: any,
    type: T
  ): error is InstanceType<T> & NodeJS.ErrnoException {
    return error instanceof type;
  }
}
