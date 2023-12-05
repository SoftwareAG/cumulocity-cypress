# Use the Cypress included base image
FROM cypress/base

# RUN apt-get install ...

WORKDIR /usr/src/app

COPY dist/cypress /usr/src/app/cypress
COPY dist/cypress.config.js /usr/src/app/cypress.config.js
COPY dist/package.json /usr/src/app/package.json

RUN npm install
# RUN npx cypress verify

ENV CYPRESS_VERIFY_TIMEOUT=100000
# RUN Xvfb :99 &

CMD ["npm", "run", "test"]
