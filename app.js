// see https://github.com/mu-semtech/mu-javascript-template for more info

import { app, query, errorHandler, sparqlEscapeUri } from 'mu';

app.get('/', async function( req, res ) {
  const subject = req.query["subject"];

  const queryResult = await query(`SELECT DISTINCT ?p ?o
    WHERE {
      GRAPH <http://mu.semte.ch/application> {
        ${sparqlEscapeUri(subject)} ?p ?o.
      }
    }
  `);

  const inverseQueryResult = await query(`SELECT DISTINCT ?s ?p
    WHERE {
      GRAPH <http://mu.semte.ch/application> {
        ?s ?p ${sparqlEscapeUri(subject)}.
      }
    }
  `);

  const response = {
    directed: queryResult.results.bindings.map( ({p: { value: predicate }, o }) => {
      return {subject, predicate, object: o};
    }),
    inverse: inverseQueryResult.results.bindings.map(({s: {value: inverseSubject}, p: {value: predicate}}) => {
      return {subject: inverseSubject, predicate, object: subject};
    })
  };

  res.send(response);
} );

app.use(errorHandler);
