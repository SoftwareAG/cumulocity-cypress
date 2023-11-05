

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

