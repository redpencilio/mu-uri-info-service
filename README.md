# mu-uri-info-service

A microservice that returns the incoming and outgoing relations of a given subject URI in a semantic.works stack.

This service is part of the [ember-metis](https://github.com/redpencilio/ember-metis) ecosystem. It provides the backend for listing all direct and inverse relationships of a URI by querying the triplestore.

## How-to guides

### Add the service to a stack

Add the following service to your `docker-compose.yml`:

```yaml
uri-info:
  image: redpencilio/mu-uri-info-service
```

Next, register the service with the [dispatcher](https://github.com/mu-semtech/mu-dispatcher) so that requests are routed to it. Add the following rules to the dispatcher's `config/dispatcher/dispatcher.ex`:

```elixir
get "/uri-info/*path" do
  Proxy.forward conn, path, "http://uri-info/"
end
```

Restart the dispatcher and bring up the stack to apply the changes:

```bash
docker compose restart dispatcher
docker compose up -d
```

## Reference

### Endpoints

| Method | Path       | Description                                          |
| ------ | ---------- | ---------------------------------------------------- |
| `GET`  | `/`        | Returns both directed and inverse links of a subject |
| `GET`  | `/direct`  | Returns only outgoing relations of a subject         |
| `GET`  | `/inverse` | Returns only incoming relations to a subject         |

### Query parameters

| Parameter    | Required | Default | Description                                                          |
| ------------ | -------- | ------- | -------------------------------------------------------------------- |
| `subject`    | yes      | -       | The URI to find relations for                                        |
| `predicate`  | no       | -       | The URI of a predicate to filter by. May be repeated for multiple predicates |
| `pageNumber` | no       | `0`     | Zero-based page number                                               |
| `pageSize`   | no       | `500`   | Number of results per page                                           |

> **Note:** the root endpoint (`/`) always uses the default pagination (`pageNumber=0`, `pageSize=500`). Use `/direct` and `/inverse` to paginate.

### Response format

`GET /` returns an object with the directed and inverse results:

```json
{
  "directed": {
    "triples": [
      {
        "subject": "http://example.com/resource/1",
        "predicate": "http://schema.org/name",
        "object": {
          "type": "literal",
          "value": "Example"
        }
      }
    ],
    "count": 1
  },
  "inverse": {
    "triples": [
      {
        "subject": "http://example.com/resource/2",
        "predicate": "http://schema.org/knows",
        "object": "http://example.com/resource/1"
      }
    ],
    "count": 1
  }
}
```

`GET /direct` and `GET /inverse` return a single result object of the same shape (`{ "triples": [...], "count": 0 }`).

- `triples` contains at most `pageSize` entries.
- `count` is the total number of matching relations, as a number.
