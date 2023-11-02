import {
    mockDevice,
    mockListResponse,
    mockChildAssetsResponse,
  } from '../support/domain-model-utils';
  import { mockDashboard, mockWidget } from '../support/widget-utils';
  
  type AssetPropertiesConfig = {
    device: { name: string; id: string };
    options: {
      properties: {
        keyPath: string[];
        __active: boolean;
        id: string;
        label: string;
        type: string;
      }[];
    };
  };
  
  describe('Sample widget test', () => {
    const device = mockDevice({ name: 'Test device' });
  
    const dimensions = {
      _x: 0,
      _y: 0,
      _width: 8,
      _height: 8,
    };
  
    const config: AssetPropertiesConfig = {
      device: { name: device.name, id: device.id },
      options: {
        properties: [
          { keyPath: ['id'], __active: true, id: 'c8ySchema!!id', label: 'ID', type: 'string' },
          { keyPath: ['name'], __active: true, id: 'c8ySchema!!name', label: 'Name', type: 'string' },
        ],
      },
    };
  
    const widget = mockWidget({
      componentId: 'Asset Properties',
      title: 'Asset Propeerties',
      config,
      ...dimensions,
    });
    let dashboard = mockDashboard(device, [widget]);
  
    before(() => {
      cy.getAuth().login();
    });
  
    beforeEach(() => {
      cy.getAuth().login();
  
      cy.intercept('GET', `inventory/managedObjects/${device.id}?withChildren=*`, {
        ...device,
      });
      cy.intercept('GET', `inventory/managedObjects/${device.id}?withParents=true`, { ...device });
      cy.intercept('GET', `inventory/managedObjects/${device.id}`, { ...device });
      cy.intercept('GET', `inventory/managedObjects/${device.id}/childDevices*`, {
        ...mockChildAssetsResponse([], { pageSize: 1, currentPage: 1 }),
      });
      cy.intercept(
        'GET',
        `inventory/managedObjects?fragmentType=c8y_Dashboard!device!${device.id}*`,
        { ...mockListResponse([dashboard]) }
      );
      // or if group dashboard - cy.intercept('GET', `inventory/managedObjects?fragmentType=c8y_Dashboard!group!${group.id}`, { ...mockListResponse([dashboard])})
    });
  
    context('show dashboard', () => {
      it('display widget', () => {
        cy.visitAndWaitForSelector(
          `/apps/cockpit/index.html#/device/${device.id}`,
          'en',
          'c8y-dashboard-child'
        );
      });
  
      it('edit widget', () => {
        cy.visitAndWaitForSelector(
          `/apps/cockpit/index.html#/device/${device.id}`,
          'en',
          'c8y-dashboard-child'
        );
  
        cy.get('c8y-dashboard-child button[title="Settings"]').click();
        cy.get('.dropdown-menu button[title="Edit widget"]').click();
  
        // do changes
        cy.intercept('PUT', `inventory/managedObjects/${dashboard.id}`, (req) => {
          dashboard = { ...dashboard, ...req.body };
          req.reply({
            status: 200,
          });
        });
      });
    });
  });
  