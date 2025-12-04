// see https://github.com/mu-semtech/mu-javascript-template for more info

import { app, query, errorHandler, sparqlEscapeUri } from 'mu';
import { Readable } from 'stream';
import { rdfSerializer } from 'rdf-serialize';
import { DataFactory } from 'n3';
import stringifyStream from 'stream-to-string';

const { namedNode, literal, quad } = DataFactory;

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

  const response = await getInverseLinks(subject, pageNumber, pageSize);
  res.send(response);
});

app.get('/describe', async function (req, res) {
  const uri = req.query.uri;
  const acceptHeader = req.get('Accept') || '';

  if (!uri) {
    return res.status(400).json({ error: 'URI parameter is required' });
  }

  res.set('Vary', 'Accept');

  const supportedFormats = [
    'application/n-triples',
    'text/turtle',
    'application/rdf+xml',
    'application/ld+json'
  ];

  let contentType = null;
  for (const format of supportedFormats) {
    if (acceptHeader.includes(format)) {
      contentType = format;
      break;
    }
  }

  if (!contentType) {
    return res.status(406).json({
      error: 'Not Acceptable. Supported formats: application/n-triples, text/turtle, application/rdf+xml, application/ld+json'
    });
  }

  try {
    const describeQuery = `DESCRIBE ${sparqlEscapeUri(uri)}`;
    const queryResult = await query(describeQuery);

    const quads = sparqlResultToQuads(queryResult);
    const quadStream = Readable.from(quads);

    const textStream = rdfSerializer.serialize(quadStream, { contentType });
    const serializedData = await stringifyStream(textStream);

    res.set('Content-Type', contentType);
    res.send(serializedData);
  } catch (error) {
    console.error('Error in describe route:', error);
    res.status(500).json({ error: 'Failed to describe resource' });
  }
});

function sparqlResultToQuads(queryResult) {
  const quads = [];

  if (queryResult.results && queryResult.results.bindings) {
    for (const binding of queryResult.results.bindings) {
      if (binding.s && binding.p && binding.o) {
        const subject = termToRDFJS(binding.s);
        const predicate = termToRDFJS(binding.p);
        const object = termToRDFJS(binding.o);

        quads.push(quad(subject, predicate, object));
      }
    }
  }

  return quads;
}


function termToRDFJS(term) {
  switch (term.type) {
    case 'uri':
      return namedNode(term.value);
    case 'literal':
    case 'typed-literal':
      if (term.datatype) {
        return literal(term.value, namedNode(term.datatype));
      } else if (term.lang || term['xml:lang']) {
        return literal(term.value, term.lang || term['xml:lang']);
      } else {
        return literal(term.value);
      }
    case 'bnode':
      return DataFactory.blankNode(term.value);
    default:
      throw new Error(`Unknown term type: ${term.type}`);
  }
}

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
