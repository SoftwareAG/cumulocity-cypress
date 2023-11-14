const { _ } = Cypress;
import { C8yDefaultPactMatcher } from "./../../lib/pacts/matcher";

describe("c8ypactmatcher", () => {
  beforeEach(() => {});

  context("C8yDefaultPactMatcher", function () {
    const obj1 = {
      status: 201,
      isOkStatusCode: true,
      statusText: "OK",
      headers: {
        "content-type": "application/json",
      },
      requestHeaders: {
        Authorization: "Basic YWRtaW46bXlwYXNzd29yZA==",
        "content-type": "application/json",
        accept: "application/json",
        UseXBasic: true,
      },
      duration: 1,
      url: "http://localhost:8080/inventory/managedObjects/1?withChildren=false",
      body: {
        next: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects?pageSize=1000&fragmentType=isISAObject&currentPage=2&withTotalPages=false",
        self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects?pageSize=1000&fragmentType=isISAObject&currentPage=1&withTotalPages=false",
        managedObjects: [
          {
            additionParents: {
              references: [],
              self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/66115945716/additionParents",
            },
            owner: "oee-simulator",
            childDevices: {
              references: [],
              self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/66115945716/childDevices",
            },
            childAssets: {
              references: [],
              self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/66115945716/childAssets",
            },
            creationTime: "2023-06-14T13:20:18.929Z",
            type: "LINE",
            lastUpdated: "2023-11-02T02:07:50.962Z",
            childAdditions: {
              references: [],
              self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/66115945716/childAdditions",
            },
            deviceParents: {
              references: [],
              self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/66115945716/deviceParents",
            },
            assetParents: {
              references: [],
              self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/66115945716/assetParents",
            },
            self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/66115945716",
            id: "66115945716",
            detailedDescription: "Simulator LINE",
            isISAObject: {},
            oeetarget: 80,

            description: "Simulator LINE",
            orderByIndex: 0,
          },
          {
            additionParents: {
              references: [],
              self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/76115948563/additionParents",
            },
            owner: "oee-simulator",
            childDevices: {
              references: [],
              self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/76115948563/childDevices",
            },
            childAssets: {
              references: [],
              self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/76115948563/childAssets",
            },
            creationTime: "2023-06-14T13:20:19.803Z",
            type: "SITE",
            lastUpdated: "2023-11-02T02:07:50.984Z",
            childAdditions: {
              references: [],
              self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/76115948563/childAdditions",
            },
            deviceParents: {
              references: [],
              self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/76115948563/deviceParents",
            },
            assetParents: {
              references: [],
              self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/76115948563/assetParents",
            },
            self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/76115948563",
            id: "76115948563",
            detailedDescription: "Simulator SITE",
            isISAObject: {},
            oeetarget: 80,
            hierarchy: [
              {
                profileID: "",
                ID: "66115945716",
              },
            ],
            description: "Simulator SITE",
            orderByIndex: 0,
          },
          {
            additionParents: {
              references: [],
              self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/88117999641/additionParents",
            },
            owner: "Mark.Reynolds@softwareag.com",
            childDevices: {
              references: [],
              self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/88117999641/childDevices",
            },
            childAssets: {
              references: [],
              self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/88117999641/childAssets",
            },
            creationTime: "2023-07-17T15:35:34.774Z",
            type: "LINE",
            lastUpdated: "2023-07-17T15:36:30.878Z",
            childAdditions: {
              references: [],
              self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/88117999641/childAdditions",
            },
            deviceParents: {
              references: [],
              self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/88117999641/deviceParents",
            },
            assetParents: {
              references: [],
              self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/88117999641/assetParents",
            },
            self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/88117999641",
            id: "88117999641",
            detailedDescription: "Test Line",
            oeetarget: 55,
            isISAObject: {},
            hierarchy: [
              {
                profileID: "58117560350",
                ID: "26117557888",
              },
            ],
            description: "Line Test",
            orderByIndex: 0,
          },
          {
            additionParents: {
              references: [],
              self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/38118000608/additionParents",
            },
            owner: "Mark.Reynolds@softwareag.com",
            childDevices: {
              references: [],
              self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/38118000608/childDevices",
            },
            childAssets: {
              references: [],
              self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/38118000608/childAssets",
            },
            creationTime: "2023-07-17T15:35:56.366Z",
            type: "SITE",
            lastUpdated: "2023-07-17T15:36:07.356Z",
            childAdditions: {
              references: [],
              self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/38118000608/childAdditions",
            },
            deviceParents: {
              references: [],
              self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/38118000608/deviceParents",
            },
            assetParents: {
              references: [],
              self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/38118000608/assetParents",
            },
            self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/38118000608",
            id: "38118000608",
            detailedDescription: "Test Site",
            oeetarget: 55,
            isISAObject: {},
            hierarchy: [
              {
                profileID: null,
                ID: "88117999641",
              },
            ],
            description: "Site Test",
            orderByIndex: 0,
          },
          {
            additionParents: {
              references: [],
              self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/98120953542/additionParents",
            },
            owner: "admin",
            childDevices: {
              references: [],
              self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/98120953542/childDevices",
            },
            childAssets: {
              references: [],
              self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/98120953542/childAssets",
            },
            creationTime: "2023-09-08T11:01:33.536Z",
            type: "LINE",
            lastUpdated: "2023-09-08T11:01:33.536Z",
            childAdditions: {
              references: [],
              self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/98120953542/childAdditions",
            },
            deviceParents: {
              references: [],
              self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/98120953542/deviceParents",
            },
            assetParents: {
              references: [],
              self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/98120953542/assetParents",
            },
            self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/98120953542",
            id: "98120953542",
            detailedDescription: null,
            oeetarget: 11,
            isISAObject: {},
            hierarchy: [],
            description: "mvoigt-test",
            orderByIndex: 0,
          },
        ],
        statistics: {
          pageSize: 1000,
          currentPage: 1,
        },
      },
      method: "GET",
    };

    const obj2 = {
      status: 201,
      isOkStatusCode: true,
      statusText: "OK",
      headers: {
        "content-type": "application/json",
      },
      requestHeaders: {
        Authorization: "Basic YWRtaW46bXlwYXNzd29yZA==",
        "content-type": "application/json",
        accept: "application/json",
        UseXBasic: true,
      },
      duration: 2,
      url: "http://localhost:8080/inventory/managedObjects/1?withChildren=false",
      body: {
        next: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects?pageSize=1000&fragmentType=isISAObject&currentPage=2&withTotalPages=false",
        self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects?pageSize=1000&fragmentType=isISAObject&currentPage=1&withTotalPages=false",
        managedObjects: [
          {
            additionParents: {
              references: [],
              self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/21312312312/additionParents",
            },
            owner: "oee-simulator",
            childDevices: {
              references: [],
              self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/21312312312/childDevices",
            },
            childAssets: {
              references: [],
              self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/21312312312/childAssets",
            },
            creationTime: "2023-06-14T13:20:18.929Z",
            type: "LINE",
            lastUpdated: "2023-11-02T02:07:50.962Z",
            childAdditions: {
              references: [],
              self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/21312312312/childAdditions",
            },
            deviceParents: {
              references: [],
              self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/21312312312/deviceParents",
            },
            assetParents: {
              references: [],
              self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/21312312312/assetParents",
            },
            self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/21312312312",
            id: "21312312312",
            detailedDescription: "Simulator LINE",
            isISAObject: {},
            oeetarget: 80,
            description: "Simulator LINE",
            orderByIndex: 0,
          },
          {
            additionParents: {
              references: [],
              self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/1312312312/additionParents",
            },
            owner: "oee-simulator",
            childDevices: {
              references: [],
              self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/1312312312/childDevices",
            },
            childAssets: {
              references: [],
              self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/1312312312/childAssets",
            },
            creationTime: "2023-06-14T13:20:19.803Z",
            type: "SITE",
            lastUpdated: "2023-11-02T02:07:50.984Z",
            childAdditions: {
              references: [],
              self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/1312312312/childAdditions",
            },
            deviceParents: {
              references: [],
              self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/1312312312/deviceParents",
            },
            assetParents: {
              references: [],
              self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/1312312312/assetParents",
            },
            self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/1312312312",
            id: "1312312312",
            detailedDescription: "Simulator SITE",
            isISAObject: {},
            oeetarget: 80,
            hierarchy: [
              {
                profileID: "",
                ID: "66115945716",
              },
            ],
            description: "Simulator SITE",
            orderByIndex: 0,
          },
          {
            additionParents: {
              references: [],
              self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/141421342342/additionParents",
            },
            owner: "Mark.Reynolds@softwareag.com",
            childDevices: {
              references: [],
              self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/141421342342/childDevices",
            },
            childAssets: {
              references: [],
              self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/141421342342/childAssets",
            },
            creationTime: "2023-07-17T15:31:34.774Z",
            type: "LINE",
            lastUpdated: "2023-07-17T15:33:30.878Z",
            childAdditions: {
              references: [],
              self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/141421342342/childAdditions",
            },
            deviceParents: {
              references: [],
              self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/141421342342/deviceParents",
            },
            assetParents: {
              references: [],
              self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/141421342342/assetParents",
            },
            self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/141421342342",
            id: "141421342342",
            detailedDescription: "Test Line",
            oeetarget: 55,
            isISAObject: {},
            hierarchy: [
              {
                profileID: "58117560350",
                ID: "26117557888",
              },
            ],
            description: "Line Test",
            orderByIndex: 0,
          },
          {
            additionParents: {
              references: [],
              self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/38118000608/additionParents",
            },
            owner: "Mark.Reynolds@softwareag.com",
            childDevices: {
              references: [],
              self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/38118000608/childDevices",
            },
            childAssets: {
              references: [],
              self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/38118000608/childAssets",
            },
            creationTime: "2023-07-17T15:35:56.366Z",
            type: "SITE",
            lastUpdated: "2023-07-17T15:36:07.356Z",
            childAdditions: {
              references: [],
              self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/38118000608/childAdditions",
            },
            deviceParents: {
              references: [],
              self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/38118000608/deviceParents",
            },
            assetParents: {
              references: [],
              self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/38118000608/assetParents",
            },
            self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/38118000608",
            id: "38118000608",
            detailedDescription: "Test Site",
            oeetarget: 55,
            isISAObject: {},
            hierarchy: [
              {
                profileID: null,
                ID: "88117999641",
              },
            ],
            description: "Site Test",
            orderByIndex: 0,
          },
          {
            additionParents: {
              references: [],
              self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/98120953542/additionParents",
            },
            owner: "admin",
            childDevices: {
              references: [],
              self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/98120953542/childDevices",
            },
            childAssets: {
              references: [],
              self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/98120953542/childAssets",
            },
            creationTime: "2023-09-08T11:01:33.536Z",
            type: "LINE",
            lastUpdated: "2023-09-08T11:01:33.536Z",
            childAdditions: {
              references: [],
              self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/98120953542/childAdditions",
            },
            deviceParents: {
              references: [],
              self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/98120953542/deviceParents",
            },
            assetParents: {
              references: [],
              self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/98120953542/assetParents",
            },
            self: "https://t617206445.eu-latest.cumulocity.com/inventory/managedObjects/98120953542",
            id: "98120953542",
            detailedDescription: null,
            oeetarget: 11,
            isISAObject: {},
            hierarchy: [],
            description: "mvoigt-test",
            orderByIndex: 0,
          },
        ],
        statistics: {
          pageSize: 1000,
          currentPage: 1,
        },
      },
      method: "GET",
    };

    it("should match cloned object", function () {
      const matcher = new C8yDefaultPactMatcher();
      const pact = _.cloneDeep(obj1);
      expect(matcher.match(obj1, pact)).to.be.true;
    });

    it("should match requestHeader with different order", function () {
      const matcher = new C8yDefaultPactMatcher();
      const pact = _.cloneDeep(obj1);
      pact.requestHeaders = {
        "content-type": "application/json",
        Authorization: "Basic YWRtaW46bXlwYXNzd29yZA==",
        UseXBasic: true,
        accept: "application/json",
      };
      expect(matcher.match(obj1, pact)).to.be.true;
    });

    it("should match duration only as number", function () {
      const matcher = new C8yDefaultPactMatcher();
      const pact = _.cloneDeep(obj1);
      pact.duration = 101;
      expect(matcher.match(obj1, pact)).to.be.true;
    });

    it("should match text body", function () {
      const matcher = new C8yDefaultPactMatcher();
      const pact = _.cloneDeep(obj1);
      const obj = _.cloneDeep(obj1);
      obj.body = "hello world";
      pact.body = "hello world";
      expect(matcher.match(obj, pact)).to.be.true;
    });

    it("should match managed object", function () {
      const matcher = new C8yDefaultPactMatcher();
      const pact = _.cloneDeep(obj1);
      const obj = _.cloneDeep(obj2);
      expect(matcher.match(obj, pact)).to.be.true;
    });
  });
});
