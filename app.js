// see https://github.com/mu-semtech/mu-javascript-template for more info

import { app, query, errorHandler, sparqlEscapeUri } from 'mu';

app.get('/', async function( req, res ) {
  const subject = req.query["subject"];

  const queryResult = await query(`SELECT *
    WHERE {
      GRAPH <http://mu.semte.ch/application> {
        ${sparqlEscapeUri(subject)} ?p ?o.
      }
    }
  `);

  const response = queryResult.results.bindings.map( ({p: { value: predicate }, o }) => {
    return {subject, predicate, object: o};
  });

  res.send(response);
} );

app.use(errorHandler);
