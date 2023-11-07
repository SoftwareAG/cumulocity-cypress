What is considered a Contract:
- full response for a request (including status code, body, content-type, etc) -> all headers, but excluded headers list

Contract testing:
- record and automatically verify contracts
  - similar to visual regression testing (2 modus, recording the contracts and validation against stored contracts)
- use cy.c8yclient to automatically store and validate the responses as contracts
  - also store cy.request responses
- contracts need to be committed to repository for validation

cy.c8yclient requirements:
- use c8y/client of the project, not an embedded one (peer dependency)
- add response validation
  - schema validation based on spok
  - schema validation based on c8y/client interfaces
  - contract validation against stored responses
  - custom validation by providing function 
- add session support
  - add session property to options
  - capture responses per named sessions
    - must work across specs (add Cypress plugin)
  - store and restore sessions
    - based on annotation of test case 
      - define id to find the stored responses for the test case
  - get objects from session (maybe to use for mocking, etc)
    - filtering per API endpoint, content-type, etc.
- teardown remove all created objects in a session
  - clean up the test system
  - register custom teardown implementations (per content-type, uri, etc.)

Mocking
- mock only requests covered by contract test 
- use stored response for mocking
  - add c8yintercept command that helps loading the response from contract store
- wiremock? -> 

Cypress commands
- add commands to 
  - create Measurements from contract store
    - automaticall update timestamps, ids, etc.
  - create Devices, Alarms, Events
    - automaticall update timestamps, ids, etc.

c8y/client requirements:
- register / inject additional custom APIs (possible already?)
  - customer APIs, additional products, etc.
  - OpenAPI based to by in sync with Core
- probably some changes to improve / allow recording of responses
















1. use c8y/client from test project, not an embedded one
2. add response data schema validation for cy.c8yclient (using spok(?) schema validation)
3. add cy.tasks for storing cy.c8yclient session data (see cy.dataSession interface and implementation)
4. add session capability to c8yclient command to store client and data
   1. store requests/objects created by c8yclient create() - id and type of object is required
   2. add command to remove all objects created by c8yclient within a given session
   3. add command to get objects from store (support filters for type, etc)
5. add commands to create measurements, events, alarms via c8yclient and its session capabilities
6. c8y/client to allow registering additional/custom services (e.g. Enercon, DTM, etc.)



Persist stored session data for mocking
- how?
- can we support cy.intercept with session data without request actually sent?
