import * as fs from "fs";
import * as path from "path";
import * as glob from "glob";
import debug from "debug";
import { C8yPact, C8yPactSaveKeys, pactId } from "./c8ypact";

import { safeStringify } from "../util";

import lodash1 from "lodash";
import * as lodash2 from "lodash";
const _ = lodash1 || lodash2;

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
  /**
   * Provides some custom description of the adapter.
   */
  description(): string;
}

const log = debug("c8y:plugin:fileadapter");

/**
 * Default implementation of C8yPactFileAdapter which loads and saves pact objects from/to
 * json files using C8yPact objects.
 */
export class C8yPactDefaultFileAdapter implements C8yPactFileAdapter {
  folder: string;
  constructor(folder: string) {
    this.folder = path.isAbsolute(folder)
      ? folder
      : this.toAbsolutePath(folder);
  }

  description(): string {
    return `C8yPactDefaultFileAdapter: ${this.folder}`;
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

    const pId = pactId(id);
    if (pId == null) {
      log(`loadPact() - invalid pact id ${id} -> ${pId}`);
      return null;
    }

    if (!this.folder || !fs.existsSync(this.folder)) {
      log(`loadPact() - folder ${this.folder} does not exist`);
      return null;
    }

    const file = path.join(this.folder, `${pId}.json`);
    if (fs.existsSync(file)) {
      const pact = fs.readFileSync(file, "utf-8");
      log(`loadPact() - ${file} loaded`);
      return JSON.parse(pact);
    } else {
      log(`loadPact() - ${file} does not exist`);
    }
    return null;
  }

  pactExists(id: string): boolean {
    return fs.existsSync(path.join(this.folder, `${pactId(id)}.json`));
  }

  savePact(pact: C8yPact | Pick<C8yPact, C8yPactSaveKeys>): void {
    this.createFolderRecursive(this.folder);
    const pId = pactId(pact.id);
    if (pId == null) {
      log(`savePact() - invalid pact id ${pact.id} -> ${pId}`);
      return;
    }

    const file = path.join(this.folder, `${pId}.json`);
    log(`savePact() - write ${file} (${pact.records?.length || 0} records)`);

    try {
      fs.writeFileSync(
        file,
        safeStringify(
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

  deletePact(id: string): void {
    const pId = pactId(id);
    if (pId == null) {
      log(`deletePact() - invalid pact id ${id} -> ${pId}`);
      return;
    }
    const filePath = path.join(this.folder, `${pId}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      log(`deletePact() - deleted ${filePath}`);
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

  protected createFolderRecursive(f: string) {
    log(`createFolderRecursive() - ${f}`);
    if (!f || !_.isString(f)) return undefined;

    const absolutePath = !path.isAbsolute(f) ? this.toAbsolutePath(f) : f;
    if (f !== absolutePath) {
      log(`createFolderRecursive() - resolved ${f} to ${absolutePath}`);
    }

    if (fs.existsSync(f)) return undefined;

    const result = fs.mkdirSync(absolutePath, { recursive: true });
    if (result) {
      log(`createFolderRecursive() - created ${absolutePath}`);
    }
    return result;
  }

  protected toAbsolutePath(f: string) {
    return path.isAbsolute(f) ? f : path.resolve(process.cwd(), f);
  }

  protected isNodeError<T extends new (...args: any) => Error>(
    error: any,
    type: T
  ): error is InstanceType<T> & NodeJS.ErrnoException {
    return error instanceof type;
  }
}
