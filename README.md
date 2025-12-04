# mu-uri-info-service

A microservice that provides incoming and outgoing relations for a given subject URI in a semantic.works stack.

## Overview

This service is part of the [ember-metis](https://github.com/redpencilio/ember-metis) ecosystem and provides the backend functionality for listing all direct and inverse relationships of a given URI. It exposes three endpoints that query the triplestore to retrieve related data.

## Endpoints

- `GET /` - Returns both directed and inverse links for a subject URI
- `GET /direct` - Returns only outgoing relations from a subject URI
- `GET /inverse` - Returns only incoming relations to a subject URI

All endpoints accept the following query parameters:
- `subject` (required) - The URI to find relations for
- `pageNumber` (optional) - Page number for pagination (default: 0)
- `pageSize` (optional) - Number of results per page (default: 500)

## Docker Setup

Add this service to your `docker-compose.yml`:

```yaml
uri-info:
  image: redpencilio/mu-uri-info-service
  links:
    - database:database
```

## Development

Built using the [mu-javascript-template](https://github.com/mu-semtech/mu-javascript-template).