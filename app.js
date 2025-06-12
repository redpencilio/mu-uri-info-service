// see https://github.com/mu-semtech/mu-javascript-template for more info

import { app, query, errorHandler, sparqlEscapeUri } from 'mu';

app.get('/', async function (req, res) {
  const subject = req.query["subject"];

  const defaultPageNumber = 0;
  const defaultPageSize = 500;

  const queryResult = await getDirectedLinks(subject, defaultPageNumber, defaultPageSize);
  const inverseQueryResult = await getInverseLinks(subject, defaultPageNumber, defaultPageSize);

  const response = {
    directed: queryResult.triples,
    inverse: inverseQueryResult.triples
  };

  res.send(response);
});

app.get('/direct', async function (req, res) {
  const subject = req.query["subject"];

  const pageNumber = req.query["pageNumber"] || 0;
  const pageSize = req.query["pageSize"] || 500;

  const response = await getDirectedLinks(subject, pageNumber, pageSize);

  res.send(response);
});

app.get('/inverse', async function (req, res) {
  const subject = req.query["subject"];

  const pageNumber = req.query["pageNumber"] || 0;
  const pageSize = req.query["pageSize"] || 500;

  const response = await getInverseLinks(subject, pageNumber, pageSize)
  res.send(response);
});

async function getDirectedLinks(subject, pageNumber, pageSize) {
  const offset = pageSize * pageNumber;

  const queryResult = await query(`SELECT DISTINCT ?p ?o
    WHERE {
      ${sparqlEscapeUri(subject)} ?p ?o.
    } LIMIT ${pageSize}  OFFSET ${offset}
  `);

  const queryResultCount = await query(`SELECT (COUNT( (?p)) as ?count)
   WHERE {
     SELECT DISTINCT ?p ?o WHERE {
       ${sparqlEscapeUri(subject)} ?p ?o.
     }
   }
   `);
  const count = queryResultCount.results.bindings[0]['count'].value;
  const response = {
    triples: queryResult.results.bindings.map(({ p: { value: predicate }, o }) => {
      return { subject, predicate, object: o };
    }),
    count: count
  };

  return response;
}

async function getInverseLinks(subject, pageNumber, pageSize) {
  const offset = pageSize * pageNumber;

  const inverseQueryResult = await query(`SELECT DISTINCT ?s ?p
    WHERE {
      ?s ?p ${sparqlEscapeUri(subject)}.
    } LIMIT ${pageSize}  OFFSET ${offset}
  `);

  const inverseQueryResultCount = await query(`SELECT (COUNT( (?s)) as ?count)
   WHERE {
     SELECT DISTINCT ?s ?o WHERE {
       ?s ?p ${sparqlEscapeUri(subject)}.
     }
   }
   `);
  const count = inverseQueryResultCount.results.bindings[0]['count'].value;

  const response = {
    triples: inverseQueryResult.results.bindings.map(({ s: { value: inverseSubject }, p: { value: predicate } }) => {
      return { subject: inverseSubject, predicate, object: subject };
    }),
    count: count
  };

  return response;
}


app.use(errorHandler);
