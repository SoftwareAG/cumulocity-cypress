import {
  FetchClient,
  IAuthentication,
  IFetchOptions,
  IFetchResponse,
} from "@c8y/client";
import {
  toWindowFetchResponse,
  wrapFetchResponse,
} from "../../shared/c8yclient";
import {
  C8yDefaultPact,
  C8yDefaultPactPreprocessor,
  C8yPact,
  C8yPactConfigOptions,
  C8yPactEnv,
  C8yPactInfo,
  C8yPactMatcher,
  C8yPactPreprocessor,
  C8yPactSaveKeys,
  C8yPactUrlMatcher,
  C8ySchemaGenerator,
  toPactSerializableObject,
} from "../../shared/c8ypact";
import { C8yPactDefaultFileAdapter } from "../../shared/c8ypact/fileadapter";

const { _ } = Cypress;

export class C8yPactFetchClient extends FetchClient {
  readonly isRecordingEnabled: boolean = false;
  readonly currentTestId: string;
  readonly currentPact: C8yDefaultPact;
  readonly config: Omit<C8yPactConfigOptions, "id">;
  readonly matcher: C8yPactMatcher;
  readonly urlMatcher: C8yPactUrlMatcher;
  readonly schemaGenerator: C8ySchemaGenerator;
  readonly preprocessor: C8yPactPreprocessor;

  private __auth: IAuthentication;
  private fileAdapter: C8yPactDefaultFileAdapter;

  savedPacts: { [key: string]: Pick<C8yPact, C8yPactSaveKeys> };

  constructor(
    auth: IAuthentication,
    public baseUrl: string,
    protected cypresspact?: CypressC8yPact,
    protected env: C8yPactEnv = cypresspact?.env()
  ) {
    super(auth, baseUrl);

    this.__auth = auth;
    this.isRecordingEnabled = this.cypresspact.isRecordingEnabled();
    this.currentTestId = this.cypresspact.getCurrentTestId();
    this.currentPact = this.cypresspact.current as C8yDefaultPact;
    this.config = this.cypresspact.getConfigValues();
    this.matcher = this.cypresspact.matcher;
    this.urlMatcher = this.cypresspact.urlMatcher;
    this.schemaGenerator = this.cypresspact.schemaGenerator;

    this.preprocessor = new C8yDefaultPactPreprocessor(
      this.cypresspact.preprocessor.options
    );

    if (env.pluginFolder) {
      this.fileAdapter = new C8yPactDefaultFileAdapter(env.pluginFolder);
    }
    this.savedPacts = {};
  }

  async fetch(
    url: string,
    fetchOptions?: IFetchOptions
  ): Promise<IFetchResponse> {
    if (this.currentPact && !this.isRecordingEnabled) {
      const fullUrl: string = this.getUrl(url, fetchOptions);
      const record = this.currentPact.getRecordsMatchingRequest({
        url: fullUrl,
        method: fetchOptions?.method,
        urlMatcher: this.urlMatcher,
      });
      if (record) {
        const first = _.first(record);
        if (first) {
          const response = toWindowFetchResponse(first);
          if (response) {
            return Promise.resolve(response);
          }
        }
      }
    }

    try {
      const response = await super.fetch(url, fetchOptions);
      await this.savePact(response, url, fetchOptions);
      return Promise.resolve(response);
    } catch (failure) {
      await this.savePact(failure as IFetchResponse, url, fetchOptions);
      return Promise.reject(failure);
    }
  }

  async savePact(
    response: IFetchResponse,
    url: string,
    fetchOptions?: IFetchOptions
  ) {
    if (!this.isRecordingEnabled || !this.fileAdapter) {
      return;
    }
    let responseObj = response.responseObj;
    if (!response.responseObj) {
      const r = await wrapFetchResponse(response, {
        url,
        fetchOptions: this.getFetchOptions(fetchOptions),
      });
      responseObj = r.responseObj;
    } else {
      delete response.responseObj;
    }

    try {
      const info: C8yPactInfo = {
        ...this.config,
        id: this.currentTestId,
        title: this.env.testTitlePath,
        tenant: this.env.tenant,
        baseUrl: this.baseUrl,
        version: this.env.systemVersion && {
          system: this.env.systemVersion,
        },
        preprocessor: this.preprocessor.options,
      };

      const pact = await toPactSerializableObject(responseObj, info, {
        loggedInUser: this.env.loggedInUser,
        loggedInUserAlias: this.env.loggedInUserAlias,
        authType: this.__auth?.constructor.name,
        preprocessor: this.preprocessor,
        schemaGenerator: this.schemaGenerator,
      });

      const { id, records } = pact;
      if (!this.savedPacts[id]) {
        this.savedPacts[id] = pact;
      } else {
        if (!this.savedPacts[id].records) {
          this.savedPacts[id].records = records;
        } else if (Array.isArray(records)) {
          Array.prototype.push.apply(this.savedPacts[id].records, records);
        } else {
          this.savedPacts[id].records.push(records);
        }
      }

      if (typeof window !== undefined) {
        this.cypresspact.savePact(this.savedPacts[id], undefined, {
          noqueue: true,
        });
      } else {
        this.fileAdapter?.savePact(this.savedPacts[id]);
      }
    } catch (err) {
      console.error("Error saving pact", err);
    }
  }
}
