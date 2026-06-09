const ptvDeparture = {
  type: 'object',
  properties: {
    route_id:            { type: 'integer', example: 6 },
    route_number:        { type: 'string',  example: '78' },
    route_name:          { type: 'string',  example: 'North Richmond – St Kilda Beach' },
    platform:            { type: 'string',  example: '1' },
    scheduled_departure: { type: 'string',  format: 'date-time' },
    mins_until:          { type: 'integer', example: 4 }
  }
};

const alert = {
  type: 'object',
  properties: {
    type:        { type: 'string', enum: ['delay', 'disruption'], example: 'delay' },
    title:       { type: 'string', example: 'Running 4 min late' },
    description: { type: 'string', example: 'Expected 08:42 · Scheduled 08:38' }
  }
};

const favoriteSchema = {
  type: 'object',
  properties: {
    _id:         { type: 'string', example: '6679abc123def456' },
    name:        { type: 'string', example: 'Home to Work' },
    origin:      { type: 'string', example: 'Flinders Street Station, Melbourne' },
    destination: { type: 'string', example: 'Richmond Station, Melbourne' },
    places:      { type: 'array',  items: { type: 'object' }, description: 'Saved nearby POIs' },
    createdAt:   { type: 'string', format: 'date-time' },
    updatedAt:   { type: 'string', format: 'date-time' }
  }
};

const userResponse = {
  type: 'object',
  properties: {
    token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
    user: {
      type: 'object',
      properties: {
        id:    { type: 'string', example: '6679abc123def456' },
        email: { type: 'string', example: 'user@example.com' }
      }
    }
  }
};

const apiKeySchema = {
  type: 'object',
  properties: {
    id:        { type: 'string', example: '6679abc123def456' },
    name:      { type: 'string', example: 'My test key' },
    key:       { type: 'string', example: 'ptv_a3f9b2c1d4e5f6...' },
    active:    { type: 'boolean', example: true },
    createdAt: { type: 'string', format: 'date-time' }
  }
};

module.exports = {
  openapi: '3.0.0',
  info: {
    title: 'PTV Journey Planner API',
    version: '4.0.0',
    description: [
      'RESTful API for the PTV Journey Planner — a Melbourne public transport app.',
      '',
      '## Authentication',
      '',
      '**JWT (Bearer Token)** — required for `/favorites` and `/api-keys` routes.',
      'Register or login via `/auth/register` or `/auth/login`, then click **Authorize** and enter `Bearer <token>`.',
      '',
      '**API Key** — required for developer-facing data routes (`/board`, `/common-alerts`, `/ptv-leg`).',
      'Generate a key via `POST /api-keys` (requires login first), then click **Authorize** and enter the key under **ApiKeyAuth**.',
      '',
      '## Delay detection',
      'Delays are computed by comparing the real-time departure time returned by **Google Routes API**',
      'against the scheduled departure from **PTV Timetable API v3**. No external alert service required.',
      '',
      '## CORS',
      'Only origins listed in `ALLOWED_ORIGINS` (.env) are permitted. Requests from other origins are blocked.'
    ].join('\n')
  },
  servers: [{ url: 'http://localhost:3000' }],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token from /auth/login or /auth/register'
      },
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-Api-Key',
        description: 'API key generated via POST /api-keys (requires login)'
      }
    }
  },
  paths: {

    // ── Auth ──────────────────────────────────────────────────────────
    '/auth/register': {
      post: {
        summary: 'Create a new account',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email:    { type: 'string', format: 'email', example: 'user@example.com' },
                  password: { type: 'string', minLength: 6,    example: 'secret123' }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Account created — returns JWT token', content: { 'application/json': { schema: userResponse } } },
          400: { description: 'Missing fields or password too short' },
          409: { description: 'Email already registered' },
          500: { description: 'Server error' }
        }
      }
    },

    '/auth/login': {
      post: {
        summary: 'Login and get a JWT token',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email:    { type: 'string', format: 'email', example: 'user@example.com' },
                  password: { type: 'string', example: 'secret123' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Login successful — returns JWT token', content: { 'application/json': { schema: userResponse } } },
          400: { description: 'Missing fields' },
          401: { description: 'Invalid credentials' },
          500: { description: 'Server error' }
        }
      }
    },

    // ── API Keys ──────────────────────────────────────────────────────
    '/api-keys': {
      post: {
        summary: 'Generate a new API key',
        description: 'Creates a key tied to your account. The full key value is only returned once — store it.',
        tags: ['API Keys'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string', example: 'My test key' }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Key created — includes full key value', content: { 'application/json': { schema: apiKeySchema } } },
          400: { description: 'name is required' },
          401: { description: 'Missing or invalid JWT token' },
          500: { description: 'Server error' }
        }
      },
      get: {
        summary: 'List your API keys',
        description: 'Key values are masked after creation (only the first 10 characters are shown).',
        tags: ['API Keys'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Array of your keys', content: { 'application/json': { schema: { type: 'array', items: apiKeySchema } } } },
          401: { description: 'Missing or invalid JWT token' },
          500: { description: 'Server error' }
        }
      }
    },

    '/api-keys/{id}': {
      delete: {
        summary: 'Revoke an API key',
        description: 'Permanently deletes the key. Any request using it will immediately receive 403.',
        tags: ['API Keys'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: '6679abc123def456' }
        ],
        responses: {
          204: { description: 'Key revoked (no body)' },
          401: { description: 'Missing or invalid JWT token' },
          404: { description: 'Key not found' },
          500: { description: 'Server error' }
        }
      }
    },

    // ── Favorites ─────────────────────────────────────────────────────
    '/favorites': {
      get: {
        summary: 'List all saved routes',
        tags: ['Favorites'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Array of saved routes', content: { 'application/json': { schema: { type: 'array', items: favoriteSchema } } } },
          401: { description: 'Missing or invalid token' },
          500: { description: 'Server error' }
        }
      },
      post: {
        summary: 'Save a new route',
        tags: ['Favorites'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'origin', 'destination'],
                properties: {
                  name:        { type: 'string', example: 'Home to Work' },
                  origin:      { type: 'string', example: 'Flinders Street Station, Melbourne' },
                  destination: { type: 'string', example: 'Richmond Station, Melbourne' },
                  places:      { type: 'array', items: { type: 'object' }, description: 'Optional saved POIs' }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Route saved', content: { 'application/json': { schema: favoriteSchema } } },
          400: { description: 'Missing required fields' },
          401: { description: 'Missing or invalid token' },
          500: { description: 'Server error' }
        }
      }
    },

    '/favorites/{id}': {
      put: {
        summary: 'Full update of a saved route',
        description: 'Replaces all fields. All required fields must be provided.',
        tags: ['Favorites'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: '6679abc123def456' }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'origin', 'destination'],
                properties: {
                  name:        { type: 'string', example: 'Home to Work (updated)' },
                  origin:      { type: 'string', example: 'Flinders Street Station, Melbourne' },
                  destination: { type: 'string', example: 'Southern Cross Station, Melbourne' },
                  places:      { type: 'array', items: { type: 'object' } }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Updated route', content: { 'application/json': { schema: favoriteSchema } } },
          400: { description: 'Missing required fields' },
          401: { description: 'Missing or invalid token' },
          404: { description: 'Route not found' },
          500: { description: 'Server error' }
        }
      },
      patch: {
        summary: 'Partial update of a saved route',
        description: 'Only the fields you provide are changed. Useful for renaming or updating saved places only.',
        tags: ['Favorites'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: '6679abc123def456' }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name:        { type: 'string', example: 'My Morning Commute' },
                  origin:      { type: 'string', example: 'Flinders Street Station, Melbourne' },
                  destination: { type: 'string', example: 'Richmond Station, Melbourne' },
                  places:      { type: 'array', items: { type: 'object' } }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Partially updated route', content: { 'application/json': { schema: favoriteSchema } } },
          400: { description: 'No valid fields provided' },
          401: { description: 'Missing or invalid token' },
          404: { description: 'Route not found' },
          500: { description: 'Server error' }
        }
      },
      delete: {
        summary: 'Delete a saved route',
        tags: ['Favorites'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: '6679abc123def456' }
        ],
        responses: {
          204: { description: 'Deleted (no body)' },
          401: { description: 'Missing or invalid token' },
          404: { description: 'Route not found' },
          500: { description: 'Server error' }
        }
      }
    },

    // ── Journey ───────────────────────────────────────────────────────
    '/journey': {
      get: {
        summary: 'Plan a transit journey',
        description: [
          'Uses **Google Routes API v2** to compute the best transit route between two Melbourne locations.',
          'Each leg is enriched with:',
          '- **PTV real-time departures** (next 5 services from that stop)',
          '- **Delay detection**: compares Google real-time departure time vs PTV scheduled time'
        ].join('\n'),
        tags: ['Journey'],
        parameters: [
          { name: 'origin',      in: 'query', required: true,  schema: { type: 'string' }, example: 'Flinders Street Station' },
          { name: 'destination', in: 'query', required: true,  schema: { type: 'string' }, example: 'Richmond Station' }
        ],
        responses: {
          200: {
            description: 'Journey plan with real-time data',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    duration_seconds: { type: 'integer', example: 567 },
                    distance_meters:  { type: 'integer', example: 2803 },
                    total_legs:       { type: 'integer', example: 1 },
                    legs: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          mode:           { type: 'string', example: 'HEAVY_RAIL' },
                          line:           { type: 'string', example: 'Frankston - City' },
                          headsign:       { type: 'string', example: 'Moorabbin' },
                          departure_stop: { type: 'string', example: 'Flinders Street' },
                          arrival_stop:   { type: 'string', example: 'Richmond' },
                          departure_time: { type: 'string', format: 'date-time' },
                          arrival_time:   { type: 'string', format: 'date-time' },
                          num_stops:      { type: 'integer', example: 2 },
                          ptv:            { type: 'object', properties: {
                            found:        { type: 'boolean', example: true },
                            origin_stop:  { type: 'string',  example: 'Flinders Street Station' },
                            departures:   { type: 'array', items: ptvDeparture }
                          }},
                          disruptions: { type: 'array', items: alert }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          400: { description: 'Missing origin or destination' },
          404: { description: 'No route found' },
          500: { description: 'Server error' }
        }
      }
    },

    '/autocomplete': {
      get: {
        summary: 'Autocomplete a place or stop name',
        description: 'Uses Google Places Autocomplete API, biased around Melbourne.',
        tags: ['Journey'],
        parameters: [
          { name: 'input', in: 'query', required: true, schema: { type: 'string' }, example: 'Flinders' }
        ],
        responses: {
          200: {
            description: 'Suggestions list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    suggestions: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          text:    { type: 'string', example: 'Flinders Street Station, Melbourne VIC, Australia' },
                          placeId: { type: 'string', example: 'ChIJ...' }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          500: { description: 'Google Places API error' }
        }
      }
    },

    '/target-places': {
      get: {
        summary: 'Find nearby points of interest',
        description: 'Uses Google Places Nearby Search to find amenities (cafés, restaurants, hotels, etc.) within walking distance of the destination.',
        tags: ['Journey'],
        parameters: [
          { name: 'destination', in: 'query', required: true,  schema: { type: 'string' }, example: 'Southern Cross Station, Melbourne' },
          { name: 'categories',  in: 'query', required: false, schema: { type: 'string' }, example: 'coffee,restaurant,hotel' }
        ],
        responses: {
          200: { description: 'Nearby places grouped by category' },
          400: { description: 'Missing destination' },
          404: { description: 'Destination could not be located' },
          500: { description: 'Server error' }
        }
      }
    },

    // ── Developer API (requires API Key) ──────────────────────────────
    '/board/{stop_id}': {
      get: {
        summary: 'Departure board for a stop',
        description: 'Returns stop info and upcoming departures from PTV for the given stop ID. **Requires API Key.**',
        tags: ['Developer API'],
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          { name: 'stop_id',    in: 'path',  required: true,  schema: { type: 'integer' }, example: 1071 },
          { name: 'route_type', in: 'query', required: false, schema: { type: 'integer', enum: [0, 1, 2] }, description: '0=Train · 1=Tram · 2=Bus', example: 0 }
        ],
        responses: {
          200: {
            description: 'Stop info with departures',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    stop: {
                      type: 'object',
                      properties: {
                        stop_id:   { type: 'integer', example: 1071 },
                        stop_name: { type: 'string',  example: 'Flinders Street Station' },
                        suburb:    { type: 'string',  example: 'Melbourne City' }
                      }
                    },
                    departures: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          route_name:          { type: 'string',  example: 'Frankston' },
                          platform:            { type: 'string',  example: '3' },
                          scheduled_departure: { type: 'string',  format: 'date-time' },
                          estimated_departure: { type: 'string',  format: 'date-time' },
                          delay_minutes:       { type: 'integer', example: 2 },
                          on_time:             { type: 'boolean', example: false }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          401: { description: 'API key missing' },
          403: { description: 'Invalid or revoked API key' },
          500: { description: 'Server error' }
        }
      }
    },

    '/common-alerts': {
      get: {
        summary: 'Live PTV disruptions',
        description: 'Returns active disruptions from PTV `/v3/disruptions`, filtered by route type. **Requires API Key.**',
        tags: ['Developer API'],
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          { name: 'route_type', in: 'query', required: false, schema: { type: 'integer', enum: [0, 1, 2] }, description: '0=Train · 1=Tram · 2=Bus (default 0)', example: 0 }
        ],
        responses: {
          200: {
            description: 'Active disruptions',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    generated_at: { type: 'string', format: 'date-time' },
                    route_type:   { type: 'integer', example: 0 },
                    alert_count:  { type: 'integer', example: 3 },
                    alerts:       { type: 'array', items: alert }
                  }
                }
              }
            }
          },
          401: { description: 'API key missing' },
          403: { description: 'Invalid or revoked API key' },
          500: { description: 'PTV API error' }
        }
      }
    },

    '/ptv-leg': {
      get: {
        summary: 'Upcoming departures from a stop by name',
        description: 'Searches PTV by stop name and returns the next 5 departures. **Requires API Key.**',
        tags: ['Developer API'],
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          { name: 'origin',     in: 'query', required: true,  schema: { type: 'string' }, example: 'Princes St/Fitzroy St' },
          { name: 'route_type', in: 'query', required: false, schema: { type: 'integer', enum: [0, 1, 2] }, description: '0=Train · 1=Tram · 2=Bus', example: 1 }
        ],
        responses: {
          200: { description: 'Departures from the matched stop', content: { 'application/json': { schema: { type: 'object', properties: { found: { type: 'boolean' }, origin_stop: { type: 'string' }, departures: { type: 'array', items: ptvDeparture } } } } } },
          401: { description: 'API key missing' },
          403: { description: 'Invalid or revoked API key' },
          404: { description: 'Stop not found on PTV' },
          500: { description: 'Server error' }
        }
      }
    },

    // ── Utilities ─────────────────────────────────────────────────────
    '/uuid/generate': {
      get: {
        summary: 'Generate a UUID v4',
        tags: ['Utilities'],
        responses: {
          200: { description: 'A new UUID', content: { 'application/json': { schema: { type: 'object', properties: { uuid: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' } } } } } }
        }
      }
    },

    '/uuid/validate': {
      get: {
        summary: 'Validate a UUID v4',
        description: 'Pass the UUID in the `x-uuid` request header.',
        tags: ['Utilities'],
        parameters: [
          { name: 'x-uuid', in: 'header', required: true, schema: { type: 'string' }, example: '550e8400-e29b-41d4-a716-446655440000' }
        ],
        responses: {
          200: { description: 'Validation result', content: { 'application/json': { schema: { type: 'object', properties: { uuid: { type: 'string' }, valid: { type: 'boolean', example: true } } } } } },
          400: { description: 'Missing x-uuid header' }
        }
      }
    },

    '/reverse-geocode': {
      get: {
        summary: 'Convert GPS coordinates to an address',
        description: 'Uses Google Geocoding API. Powers the "Use my location" button on the frontend.',
        tags: ['Utilities'],
        parameters: [
          { name: 'lat', in: 'query', required: true,  schema: { type: 'number' }, example: -37.8136 },
          { name: 'lng', in: 'query', required: true,  schema: { type: 'number' }, example: 144.9631 }
        ],
        responses: {
          200: { description: 'Address string', content: { 'application/json': { schema: { type: 'object', properties: { address: { type: 'string', example: 'Flinders Street Station, Melbourne VIC 3000, Australia' } } } } } },
          400: { description: 'lat and lng are required' },
          404: { description: 'No address found for these coordinates' },
          500: { description: 'Server error' }
        }
      }
    }

  }
};
