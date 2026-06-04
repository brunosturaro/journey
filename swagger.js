const ptvDeparture = {
  type: 'object',
  properties: {
    route_id:             { type: 'integer',  example: 6 },
    route_number:         { type: 'string',   example: '78' },
    route_name:           { type: 'string',   example: 'North Richmond – St Kilda Beach' },
    platform:             { type: 'string',   example: '1' },
    scheduled_departure:  { type: 'string',   format: 'date-time' },
    mins_until:           { type: 'integer',  example: 4 }
  }
};

const alert = {
  type: 'object',
  properties: {
    type:        { type: 'string', enum: ['delay', 'disruption'], example: 'disruption' },
    title:       { type: 'string', example: 'Track works at Flinders Street' },
    description: { type: 'string', example: 'Buses replace trains between Richmond and Flinders Street.' }
  }
};

const favoriteSchema = {
  type: 'object',
  properties: {
    _id:         { type: 'string',  example: '6679abc123def456' },
    name:        { type: 'string',  example: 'Home to Work' },
    origin:      { type: 'string',  example: 'Flinders Street Station, Melbourne' },
    destination: { type: 'string',  example: 'Richmond Station, Melbourne' },
    createdAt:   { type: 'string',  format: 'date-time' },
    updatedAt:   { type: 'string',  format: 'date-time' }
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

module.exports = {
  openapi: '3.0.0',
  info: {
    title: 'Departure Board API',
    version: '3.0.0',
    description: [
      'Journey planner combining Google Routes API, PTV Timetable API v3, and a classmate disruptions API.',
      '',
      '**Authentication**',
      'Protected routes require a Bearer token. Register or login via `/auth/register` or `/auth/login`,',
      'then click **Authorize** and enter `Bearer <your_token>`.',
      '',
      '**Alert sources**',
      '- `/journey` and `/board` — alerts come from the classmate\'s API (`GET /train-status/:routeId`).',
      '- `/common-alerts` — live PTV disruptions via `/v3/disruptions`; intended for classmate consumption.'
    ].join('\n')
  },
  servers: [{ url: 'http://localhost:3000' }],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token obtained from /auth/login or /auth/register'
      }
    }
  },
  paths: {

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

    '/favorites': {
      get: {
        summary: 'List all saved routes for the logged-in user',
        tags: ['Favorites'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Array of saved routes',
            content: {
              'application/json': {
                schema: { type: 'array', items: favoriteSchema }
              }
            }
          },
          401: { description: 'Missing or invalid token' },
          500: { description: 'Server error' }
        }
      },
      post: {
        summary: 'Save a new favourite route',
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
                  destination: { type: 'string', example: 'Richmond Station, Melbourne' }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Favourite created', content: { 'application/json': { schema: favoriteSchema } } },
          400: { description: 'Missing required fields' },
          401: { description: 'Missing or invalid token' },
          500: { description: 'Server error' }
        }
      }
    },

    '/favorites/{id}': {
      put: {
        summary: 'Full update of a saved route (all fields required)',
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
                  destination: { type: 'string', example: 'Southern Cross Station, Melbourne' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Updated favourite', content: { 'application/json': { schema: favoriteSchema } } },
          400: { description: 'Missing required fields' },
          401: { description: 'Missing or invalid token' },
          404: { description: 'Favourite not found' },
          500: { description: 'Server error' }
        }
      },
      patch: {
        summary: 'Partial update of a saved route (only provided fields change)',
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
                  destination: { type: 'string', example: 'Richmond Station, Melbourne' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Partially updated favourite', content: { 'application/json': { schema: favoriteSchema } } },
          400: { description: 'No valid fields provided' },
          401: { description: 'Missing or invalid token' },
          404: { description: 'Favourite not found' },
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
          204: { description: 'Deleted successfully (no body)' },
          401: { description: 'Missing or invalid token' },
          404: { description: 'Favourite not found' },
          500: { description: 'Server error' }
        }
      }
    },

    '/journey': {
      get: {
        summary: 'Plan a journey from A to B',
        description: 'Uses Google Routes API to find the route, then enriches each leg with PTV real-time departures and classmate disruption alerts.',
        parameters: [
          { name: 'origin',      in: 'query', required: true,  schema: { type: 'string' }, example: 'Flinders Street Station, Melbourne' },
          { name: 'destination', in: 'query', required: true,  schema: { type: 'string' }, example: 'Richmond Station, Melbourne' }
        ],
        responses: {
          200: {
            description: 'Journey found',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    duration_seconds:  { type: 'integer', example: 567 },
                    distance_meters:   { type: 'integer', example: 2803 },
                    total_legs:        { type: 'integer', example: 1 },
                    legs: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          mode:           { type: 'string', example: 'HEAVY_RAIL' },
                          line:           { type: 'string', example: 'Frankston - City' },
                          line_short:     { type: 'string', example: 'Frankston' },
                          headsign:       { type: 'string', example: 'Moorabbin' },
                          departure_stop: { type: 'string', example: 'Flinders Street' },
                          arrival_stop:   { type: 'string', example: 'Richmond' },
                          departure_time: { type: 'string', format: 'date-time' },
                          arrival_time:   { type: 'string', format: 'date-time' },
                          num_stops:      { type: 'integer', example: 2 },
                          ptv: {
                            type: 'object',
                            properties: {
                              found:            { type: 'boolean', example: true },
                              origin_stop_id:   { type: 'integer', example: 1071 },
                              origin_stop:      { type: 'string',  example: 'Flinders Street Station' },
                              primary_route_id: { type: 'integer', example: 6 },
                              departures: { type: 'array', items: ptvDeparture }
                            }
                          },
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
        summary: 'Autocomplete a place name',
        description: 'Uses Google Places API to suggest locations biased around Melbourne.',
        parameters: [
          { name: 'input', in: 'query', required: true, schema: { type: 'string' }, example: 'Flinders' }
        ],
        responses: {
          200: {
            description: 'List of suggestions',
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

    '/ptv-leg': {
      get: {
        summary: 'Get upcoming PTV departures from a stop',
        description: 'Searches PTV for the origin stop by name and returns the next 5 upcoming departures, with route number and minutes until departure.',
        parameters: [
          { name: 'origin',     in: 'query', required: true,  schema: { type: 'string' }, example: 'Princes St/Fitzroy St' },
          { name: 'route_type', in: 'query', required: false, schema: { type: 'integer', enum: [0, 1, 2] }, description: '0=Train  1=Tram  2=Bus', example: 1 }
        ],
        responses: {
          200: {
            description: 'Upcoming departures from origin stop',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    found:            { type: 'boolean',  example: true },
                    origin_stop_id:   { type: 'integer',  example: 2827 },
                    origin_stop:      { type: 'string',   example: 'Princes St/Fitzroy St' },
                    primary_route_id: { type: 'integer',  example: 6 },
                    departures:       { type: 'array',    items: ptvDeparture }
                  }
                }
              }
            }
          },
          404: { description: 'Stop not found on PTV' },
          500: { description: 'Server error' }
        }
      }
    },

    '/board/{stop_id}': {
      get: {
        summary: 'Get departure board for a stop',
        description: 'Returns stop info, upcoming departures from PTV, and disruption alerts from the classmate API.',
        parameters: [
          { name: 'stop_id',    in: 'path',  required: true,  schema: { type: 'integer' }, example: 1071 },
          { name: 'route_type', in: 'query', required: false, schema: { type: 'integer', enum: [0, 1, 2] }, description: '0=Train  1=Tram  2=Bus', example: 0 }
        ],
        responses: {
          200: {
            description: 'Stop info with upcoming departures and alerts',
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
                          route_name:           { type: 'string',  example: 'Frankston' },
                          route_type:           { type: 'integer', example: 0 },
                          platform:             { type: 'string',  example: '3' },
                          scheduled_departure:  { type: 'string',  format: 'date-time' },
                          estimated_departure:  { type: 'string',  format: 'date-time' },
                          delay_minutes:        { type: 'integer', example: 2 },
                          on_time:              { type: 'boolean', example: false }
                        }
                      }
                    },
                    alerts: { type: 'array', items: alert }
                  }
                }
              }
            }
          },
          500: { description: 'Server error' }
        }
      }
    },

    '/common-alerts': {
      get: {
        summary: 'Live PTV disruptions (for classmate use)',
        description: 'Returns active disruptions from the PTV `/v3/disruptions` API filtered by route type. Intended to be consumed by a classmate\'s API, not the journey planner frontend.',
        parameters: [
          { name: 'route_type', in: 'query', required: false, schema: { type: 'integer', enum: [0, 1, 2] }, description: '0=Train  1=Tram  2=Bus (default 0)', example: 0 }
        ],
        responses: {
          200: {
            description: 'Active disruptions for the requested route type',
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
          500: { description: 'PTV API error' }
        }
      }
    },

    '/uuid/generate': {
      get: {
        summary: 'Generate a UUID v4',
        responses: {
          200: {
            description: 'A new UUID',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    uuid: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' }
                  }
                }
              }
            }
          }
        }
      }
    },

    '/uuid/validate': {
      get: {
        summary: 'Validate a UUID v4',
        description: 'Pass the UUID in the `x-uuid` request header.',
        parameters: [
          { name: 'x-uuid', in: 'header', required: true, schema: { type: 'string' }, example: '550e8400-e29b-41d4-a716-446655440000' }
        ],
        responses: {
          200: {
            description: 'Validation result',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    uuid:  { type: 'string',  example: '550e8400-e29b-41d4-a716-446655440000' },
                    valid: { type: 'boolean', example: true }
                  }
                }
              }
            }
          },
          400: { description: 'Missing x-uuid header' }
        }
      }
    },

    '/config': {
      get: {
        summary: 'Get frontend configuration',
        description: 'Returns the Google Maps JavaScript API key for use in the browser.',
        responses: {
          200: {
            description: 'Frontend config',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    mapsApiKey: { type: 'string', example: 'AIzaSy...' }
                  }
                }
              }
            }
          }
        }
      }
    },

    '/ptv-test': {
      get: {
        summary: 'Verify PTV API authentication',
        description: 'Calls `/v3/route_types` on the PTV API and returns the raw response. Useful for confirming that HMAC signing is working.',
        responses: {
          200: { description: 'PTV responded successfully — auth is working' },
          500: { description: 'PTV authentication failed or network error' }
        }
      }
    }

  }
};
