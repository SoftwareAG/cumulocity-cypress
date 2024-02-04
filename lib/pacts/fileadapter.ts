import * as fs from "fs";
import * as path from "path";
import * as glob from "glob";

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
      acc[obj.info.id] = obj;
      return acc;
    }, {});
  }

  savePact(pact: C8yPact): void {
    this.createFolderRecursive(this.folder, true);
    const file = path.join(this.folder, `${pact.id}.json`);
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
        currentPath = path.join("/", currentPath);
      }
      try {
        fs.accessSync(currentPath, fs.constants.F_OK);
      } catch (err) {
        if (this.isNodeError(err, TypeError) && err.code === "ENOENT") {
          // Directory does not exist, create it
          fs.mkdirSync(currentPath);
        } else {
          throw err; // Other error, rethrow it
        }
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
