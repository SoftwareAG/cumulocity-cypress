import { IManagedObject } from '@c8y/client';
import { createManagedObject } from './domain-model-utils';
export interface DashboardMock {
  c8y_Dashboard: {
    children: {
      [key: string]: WidgetMock<any>
    };
  };
}

export interface Dimensions {
    _height: number;
    _width: number;
    _x: number;
    _y: number;
}

export interface WidgetMock<T> extends Dimensions {
  componentId: string;
  title: string;
  config: T;
  id: string;
}

export function mockDashboard(
  groupOrDevice: Partial<IManagedObject>,
  widgets?: WidgetMock<any>[]
): IManagedObject {
  const isGroup = Cypress._.has(groupOrDevice, 'c8y_IsDeviceGroup');
  const mo = createManagedObject();
  mo.name = 'Dashboard';
  Cypress._.set(mo, `c8y_Dashboard!${isGroup ? 'group' : 'device'}!${mo.id}`, {});

  const c8y_Dashboard = {
    classes: { 'dashboard-theme-light': true },
    icon: 'th',
    isFrozen: false,
    name: mo.name,
    priority: 10000,
    children: {},
  };

  if (widgets?.length) {
    for (const widget of widgets) {
      Cypress._.set(c8y_Dashboard.children, widget.id, widget);
    }
  }

  Cypress._.set(mo, 'c8y_Dashboard', c8y_Dashboard);

  return mo;
}

export function mockWidget<T>(fragments?: Partial<WidgetMock<T>>): WidgetMock<T> {
  let widget = {
    componentId: Date.now().toString(36),
    config: {} as T,
    title: 'Cypress Test Widget',
    id: `${Math.floor(Math.random() * 1e16)}`,
    _height: 4,
    _width: 4,
    _x: 0,
    _y: 0
  };

  if (fragments) {
    widget = {
      ...widget,
      ...fragments,
    };
  }

  return widget;
}

export function getWidgetConfigs(putRequestPayload: DashboardMock) {
  expect(Cypress._.has(putRequestPayload, 'c8y_Dashboard')).to.equal(true);
  const widgetIds = Object.keys(putRequestPayload.c8y_Dashboard.children);
  const configs = widgetIds.map((id) =>
    Cypress._.get(putRequestPayload.c8y_Dashboard.children, id)
  );
  return configs;
}
