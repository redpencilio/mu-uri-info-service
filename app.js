// see https://github.com/mu-semtech/mu-javascript-template for more info

import { app, query, errorHandler, sparqlEscapeUri } from 'mu';

function buildPredicateClause(predicate) {
  if (!predicate) return '';
  const predicates = (Array.isArray(predicate) ? predicate : [predicate]).filter(Boolean);
  if (predicates.length === 0) return '';
  const escapedUris = predicates.map((p) => sparqlEscapeUri(p)).join(' ');
  return `VALUES ?p { ${escapedUris} }`;
}

app.get('/', async function (req, res) {
  const subject = req.query["subject"];
  const predicate = req.query["predicate"];

  const defaultPageNumber = 0;
  const defaultPageSize = 500;

  const queryResult = await getDirectedLinks(subject, predicate, defaultPageNumber, defaultPageSize);
  const inverseQueryResult = await getInverseLinks(subject, predicate, defaultPageNumber, defaultPageSize);

  const response = {
    directed: queryResult.triples,
    inverse: inverseQueryResult.triples
  };

  res.send(response);
});

app.get('/direct', async function (req, res) {
  const subject = req.query["subject"];
  const predicate = req.query["predicate"];

  const pageNumber = req.query["pageNumber"] || 0;
  const pageSize = req.query["pageSize"] || 500;

  const response = await getDirectedLinks(subject, predicate, pageNumber, pageSize);

  res.send(response);
});

app.get('/inverse', async function (req, res) {
  const subject = req.query["subject"];
  const predicate = req.query["predicate"];

  const pageNumber = req.query["pageNumber"] || 0;
  const pageSize = req.query["pageSize"] || 500;

  const response = await getInverseLinks(subject, predicate, pageNumber, pageSize);
  res.send(response);
});

async function getDirectedLinks(subject, predicate, pageNumber, pageSize) {
  const offset = pageSize * pageNumber;
  const predicateClause = buildPredicateClause(predicate);

  const queryResult = await query(`SELECT DISTINCT ?p ?o
    WHERE {
      ${sparqlEscapeUri(subject)} ?p ?o.
      ${predicateClause}
    } LIMIT ${pageSize}  OFFSET ${offset}
  `);

  const queryResultCount = await query(`SELECT (COUNT( (?p)) as ?count)
   WHERE {
     SELECT DISTINCT ?p ?o WHERE {
       ${sparqlEscapeUri(subject)} ?p ?o.
       ${predicateClause}
     }
   }
   `);
  const count = queryResultCount.results.bindings[0]['count'].value;
  const response = {
    triples: queryResult.results.bindings.map(({ p: { value: predicateVal }, o }) => {
      return { subject, predicate: predicateVal, object: o };
    }),
    count: count
  };

  return response;
}

async function getInverseLinks(subject, predicate, pageNumber, pageSize) {
  const offset = pageSize * pageNumber;
  const predicateClause = buildPredicateClause(predicate);

  const inverseQueryResult = await query(`SELECT DISTINCT ?s ?p
    WHERE {
      ?s ?p ${sparqlEscapeUri(subject)}.
      ${predicateClause}
    } LIMIT ${pageSize}  OFFSET ${offset}
  `);

  const inverseQueryResultCount = await query(`SELECT (COUNT( (?s)) as ?count)
   WHERE {
     SELECT DISTINCT ?s ?o WHERE {
       ?s ?p ${sparqlEscapeUri(subject)}.
       ${predicateClause}
     }
   }
   `);
  const count = inverseQueryResultCount.results.bindings[0]['count'].value;

  const response = {
    triples: inverseQueryResult.results.bindings.map(({ s: { value: inverseSubject }, p: { value: predicateVal } }) => {
      return { subject: inverseSubject, predicate: predicateVal, object: subject };
    }),
    count: count
  };

  return response;
}


app.use(errorHandler);
