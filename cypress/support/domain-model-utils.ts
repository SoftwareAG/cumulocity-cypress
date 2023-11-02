import { IEvent, IManagedObject, IMeasurement } from '@c8y/client';

export function mockListResponse<T extends IManagedObject | IEvent | IMeasurement>(
  data: T[],
  statistics?: { totalPages: number; pageSize: number; currentPage: number }
) {
  let response = {};
  if (isManagedObject(data[0])) {
    response = {
      managedObjects: data,
      self: '',
    };
  } else if (isEvent(data[0])) {
    response = {
      events: data,
      self: '',
    };
  } else if (isMeasurement(data[0])) {
    response = {
      measurements: data,
      self: '',
    };
  }

  response = {
    ...response,
    statistics: statistics ?? { totalPages: 1, pageSize: 2000, currentPage: 1 },
  };
  return response;
}

export function mockChildAssetsResponse(
  data: IManagedObject[],
  statistics?: { pageSize: number; currentPage: number; totalPages?: number }
) {
  let response = {
    next: '',
    self: '',
    references: data.map((mo) => ({
      managedObject: mo,
      self: '',
    })),
    statistics: statistics ?? { totalPages: 1, pageSize: 2000, currentPage: 1 },
  };

  return response;
}

export function mockDevice(parts?: Partial<IManagedObject>): IManagedObject {
  let mo = createManagedObject();
  if (parts) {
    mo = { ...mo, ...parts };
  }
  return { ...mo, c8y_IsDevice: {} };
}

export function mockGroup(parts?: Partial<IManagedObject>): IManagedObject {
  let mo = createManagedObject();
  if (parts) {
    mo = { ...mo, ...parts };
  }
  return { ...mo, c8y_IsDeviceGroup: {} };
}

export function mockEvent(parts?: Partial<IEvent>) {
  let event = createEvent();
  if (parts) {
    event = { ...event, ...parts };
  }
  return event;
}

export function mockMeasurement(parts?: Partial<IMeasurement>) {
  let measurement = createMeasurement();
  if (parts) {
    measurement = { ...measurement, ...parts };
  }
  return measurement;
}

export function mockMeasurementsResponse(count: number, intervalInSecs: number) {
  const measurements: IMeasurement[] = [];
  let timestamp = Date.now();
  for (let i = 0; i < count; i++) {
    const value = Math.floor(Math.random() * 10);
    const time = new Date(timestamp);
    measurements.push(createMeasurement({ value, time }));
    timestamp = timestamp - intervalInSecs * 1000;
  }
  return mockListResponse(measurements, {
    currentPage: 1,
    pageSize: 2000,
    totalPages: Math.floor(count / 2000),
  });
}

function isManagedObject(obj: unknown): obj is IManagedObject {
  const attributes = [
    'additionParents',
    'owner',
    'childAssets',
    'childDevices',
    'lastUpdated',
    'deviceParents',
    'assetParents',
  ];
  for (const attr of attributes) {
    if (!Cypress._.has(obj, attr)) {
      return false;
    }
  }
  return true;
}

function isEvent(obj: unknown): obj is IEvent {
  const attributes = ['source', 'type', 'time', 'text'];
  for (const attr of attributes) {
    if (!Cypress._.has(obj, attr)) {
      return false;
    }
  }
  return true;
}

function isMeasurement(o: unknown): o is IMeasurement {
  const keys = Object.keys(o);
  for (const key of keys) {
    const fragment = Cypress._.get(o, key);
    const nestedKeys = Object.keys(fragment);
    for (const nestedKey of nestedKeys) {
      if (
        Cypress._.has(fragment, `${nestedKey}.value`) &&
        Cypress._.has(fragment, `${nestedKey}.unit`)
      ) {
        return true;
      }
    }
  }

  return false;
}

export function createEvent(): IEvent {
  return {
    source: { id: `${Math.floor(Math.random() * 1e16)}` },
    name: Date.now().toString(36),
    text: Date.now().toString(36),
    time: new Date().toISOString(),
    type: Date.now().toString(36),
    id: `${Math.floor(Math.random() * 1e16)}`,
  };
}

export function createMeasurement(t?: { value: number; time: Date }): IMeasurement {
  return {
    id: `${Math.floor(Math.random() * 1e16)}`,
    self: '',
    source: { id: '', self: '' },
    time: (t ? t.time : new Date()).toISOString(),
    type: 'c8y_CypressType',
    c8y_Temperature: {
      T: {
        value: t ? t.value : Math.floor(Math.random() * 10),
        unit: '°C',
      },
    },
  };
}

export function createManagedObject(): IManagedObject {
  return {
    additionParents: {
      references: [],
      self: '',
    },
    owner: 'Cypress createManagedObject',
    childDevices: {
      references: [],
      self: '',
    },
    childAssets: {
      references: [],
      self: '',
    },
    creationTime: new Date().toISOString(),
    type: 'c8y_CypressType',
    lastUpdated: new Date().toISOString(),
    childAdditions: {
      references: [],
      self: '',
    },
    name: 'Cypress Test Group',
    deviceParents: {
      references: [],
      self: '',
    },
    assetParents: {
      references: [],
      self: '',
    },
    self: '',
    id: `${Math.floor(Math.random() * 1e16)}`,
  };
}

export function mockTenantOptionReponse(value: string | object) {
  return {
    category: '',
    key: '',
    self: '',
    value: typeof value === 'string' ? value : JSON.stringify(value),
  };
}

export function dynamicClone(mo: IManagedObject) {
  const clone = Cypress._.cloneDeep(mo);
  const shortUnique = Date.now().toString(36);

  clone.name += shortUnique;
  clone.id = `${Math.floor(Math.random() * 1e16)}`;
  clone.owner = 'Cypress dynamicClone';
  return clone;
}
