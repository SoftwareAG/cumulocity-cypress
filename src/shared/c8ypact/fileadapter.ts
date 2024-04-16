import * as fs from "fs";
import * as path from "path";
import * as glob from "glob";
import debug from "debug";
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
}

const log = debug("c8y:plugin:fileadapter");

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
    log(`loadPacts() - ${jsonFiles.length} pact files from ${this.folder}`);

    return jsonFiles.reduce((acc, obj) => {
      if (!obj?.info?.id) return acc;
      acc[obj.info.id] = obj;
      return acc;
    }, {});
  }

  loadPact(id: string): C8yPact | null {
    log(`loadPact() - ${id}`);
    if (!this.folder || !fs.existsSync(this.folder)) {
      log(`loadPact() - folder ${this.folder} does not exist`);
      return null;
    }
    const file = path.join(this.folder, `${id}.json`);
    if (fs.existsSync(file)) {
      const pact = fs.readFileSync(file, "utf-8");
      log(`loadPact() - ${file} loaded`);
      return JSON.parse(pact);
    } else {
      log(`loadPact() - ${file} does not exist`);
    }
    return null;
  }

  savePact(pact: C8yPact | Pick<C8yPact, C8yPactSaveKeys>): void {
    this.createFolderRecursive(this.folder, true);
    const file = path.join(this.folder, `${pact.id}.json`);
    log(`savePact() - ${file}`);
    fs.writeFileSync(
      file,
      JSON.stringify(
        {
          id: pact.id,
          info: pact.info,
          records: pact.records,
        },
        undefined,
        2
      ),
      "utf-8"
    );
  }

  deletePact(id: string): void {
    const filePath = path.join(this.folder, `${id}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      log(`deletePact() - deletaed ${filePath}`);
    } else {
      log(`deletePact() - ${filePath} does not exist`);
    }
  }

  readJsonFiles(): string[] {
    log(`readJsonFiles() - ${this.folder}`);
    if (!this.folder || !fs.existsSync(this.folder)) {
      log(`readJsonFiles() - ${this.folder} does not exist`);
      return [];
    }
    const jsonFiles = glob.sync(path.join(this.folder, "*.json"));
    log(
      `readJsonFiles() - reading ${jsonFiles.length} json files from ${this.folder}`
    );
    const pacts = jsonFiles.map((file) => {
      return fs.readFileSync(file, "utf-8");
    });
    return pacts;
  }

  protected deleteJsonFiles(): void {
    if (!this.folder || !fs.existsSync(this.folder)) {
      log(`deleteJsonFiles() - ${this.folder} does not exist`);
      return;
    }
    const jsonFiles = glob.sync(path.join(this.folder, "*.json"));
    log(
      `deleteJsonFiles() - deleting ${jsonFiles.length} json files from ${this.folder}`
    );
    jsonFiles.forEach((file) => {
      fs.unlinkSync(file);
    });
  }

  protected loadPactObjects() {
    const pacts = this.readJsonFiles();
    return pacts.map((pact) => JSON.parse(pact));
  }

  protected createFolderRecursive(f: string, absolutePath: boolean) {
    log(`createFolderRecursive() - ${f}`);
    const parts = f?.split(path.sep);
    parts.forEach((part, i) => {
      let currentPath = path.join(...parts.slice(0, i + 1));
      if (absolutePath) {
        currentPath = path.join(path.sep, currentPath);
      }
      try {
        if (!fs.existsSync(currentPath)) {
          log(`createFolderRecursive() - creating ${currentPath}`);
          fs.mkdirSync(currentPath);
        }
      } catch (err) {
        log(`createFolderRecursive() - ${err}`);
        throw err;
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
