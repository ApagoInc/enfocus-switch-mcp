# Tool reference

Each tool corresponds to one documented operation. Full nested schemas are included below and in MCP discovery.

| Tool | Service | HTTP request | Required arguments |
|---|---|---|---|
| `switch_login_query` | switch | `POST /login` | — |
| `switch_logout_query` | switch | `GET /logout` | — |
| `switch_add_annotations` | switch | `POST /api/v1/flows/:id/annotations` | `annotations`, `id` |
| `switch_edit_annotation` | switch | `PUT /api/v1/flows/:id/annotations/:annotId` | `annotation`, `id`, `annotId` |
| `switch_get_flows` | switch | `GET /api/v1/flows` | — |
| `switch_remove_annotations` | switch | `DELETE /api/v1/flows/:id/annotations/:annotId` | `id` |
| `switch_start_flow` | switch | `PUT /api/v1/flows/:id?action=start` | `id` |
| `switch_stop_flow` | switch | `PUT /api/v1/flows/:id?action=stop` | `id` |
| `switch_get_job_metadata` | switch | `GET /api/v1/job/metadata` | `ids` |
| `switch_job_download` | switch | `GET /api/v1/job/:id` | `id` |
| `switch_job_report_download` | switch | `GET /api/v1/job/report/:id` | `id` |
| `switch_lock_job` | switch | `PUT /api/v1/job/:id?action=lock` | `id` |
| `switch_post_job` | switch | `POST /api/v1/job` | `flowId`, `objectId`, `jobName`, `files` |
| `switch_replace_job` | switch | `PUT /api/v1/job/:id?action=replace` | `id`, `files` |
| `switch_route_job` | switch | `PUT /api/v1/job/:id?action=route` | `id`, `connections` |
| `switch_unlock_job` | switch | `PUT /api/v1/job/:id?action=unlock` | `id` |
| `switch_rush_job` | switch | `PUT /api/v1/processingjob/:processingId?action=rush` | `processingId` |
| `switch_unrush_job` | switch | `PUT /api/v1/processingjob/:processingId?action=unrush` | `processingId` |
| `switch_add_job_filter` | switch | `POST /api/v1/jobFilters` | `name`, `query` |
| `switch_delete_job_filter` | switch | `DELETE /api/v1/jobFilters` | — |
| `switch_edit_job_filter` | switch | `PUT /api/v1/jobFilters/:id` | `id` |
| `switch_get_job_filter` | switch | `GET /api/v1/jobFilters` | — |
| `switch_share_job_filter` | switch | `PUT /api/v1/jobFilters/:id?action=share` | `id` |
| `switch_unshare_job_filter` | switch | `PUT /api/v1/jobFilters/:id?action=unshare` | `id` |
| `switch_get_jobs` | switch | `GET /api/v1/jobs` | — |
| `switch_dashboard_graphql` | switch | `POST /api/v1/graphql` | `query` |
| `switch_add_message_filter` | switch | `POST /api/v1/messageFilters` | `name`, `query` |
| `switch_delete_message_filter` | switch | `DELETE /api/v1/messageFilters` | — |
| `switch_edit_message_filter` | switch | `PUT /api/v1/messageFilters/:id` | `id` |
| `switch_get_message_filter` | switch | `GET /api/v1/messageFilters` | — |
| `switch_get_messages_list` | switch | `GET /api/v1/messages` | — |
| `switch_post_clear_messages` | switch | `POST /api/v1/messages/clear` | — |
| `switch_ping` | switch | `GET /api/v1/ping` | — |
| `switch_get_submitpoints` | switch | `GET /api/v1/submitpoints/:id` | — |
| `switch_switch_helper_default_app` | helper | `GET /api/v1/defaultApp` | `extension` |
| `switch_switch_helper_ping` | helper | `GET /api/v1/ping` | — |
| `switch_switch_helper_cancel_edit_job` | helper | `POST /api/v1/cancelEditJob` | `jobId` |
| `switch_switch_helper_delete_select_job` | helper | `DELETE /api/v1/selectJob` | `submitId`, `path` |
| `switch_switch_helper_edit_job` | helper | `POST /api/v1/editJob` | `jobId`, `jobName` |
| `switch_switch_helper_job_in_edit` | helper | `GET /api/v1/jobInEdit` | `jobId` |
| `switch_switch_helper_replace_job` | helper | `PUT /api/v1/replaceJob` | `jobId` |
| `switch_switch_helper_select_job` | helper | `GET /api/v1/selectJob` | — |
| `switch_switch_helper_submit_job` | helper | `POST /api/v1/submitJob` | `submitId`, `flowId`, `objectId` |
| `switch_switch_helper_submit_progress` | helper | `GET /api/v1/progress` | `submitId` |
| `switch_get_thumbnails` | switch | `GET /api/v1/thumbnails` | — |
| `switch_get_groups` | switch | `GET /api/v1/userpermissions/groups` | — |

Login and Helper session fields can use configuration defaults. The three Helper bare-query parameters are described in README.md. ReplaceJob also accepts the documented POST alias through httpMethod.

## Argument schemas

### switch_login_query

Login Query.

```json
{
  "type": "object",
  "properties": {
    "username": {
      "type": "string",
      "description": "Defaults to SWITCH_USERNAME."
    },
    "password": {
      "type": "string",
      "description": "Plaintext password; RSA encryption is performed locally. Prefer SWITCH_PASSWORD in the environment."
    },
    "lang": {
      "type": "string",
      "description": "Switch locale, for example enUS, deDE, or frFR."
    }
  },
  "additionalProperties": false
}
```

### switch_logout_query

Logout Query.

```json
{
  "type": "object",
  "properties": {
    "lang": {
      "type": "string",
      "description": "Switch locale, for example enUS, deDE, or frFR."
    }
  },
  "additionalProperties": false
}
```

### switch_add_annotations

Add Annotations.

```json
{
  "type": "object",
  "properties": {
    "annotations": {
      "oneOf": [
        {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "type": {
                "type": "string"
              },
              "title": {
                "type": "string"
              },
              "description": {
                "type": "string"
              },
              "x": {
                "type": "number"
              },
              "y": {
                "type": "number"
              }
            },
            "additionalProperties": false,
            "required": [
              "type",
              "title",
              "description",
              "x",
              "y"
            ]
          }
        },
        {
          "type": "object",
          "properties": {
            "type": {
              "type": "string"
            },
            "title": {
              "type": "string"
            },
            "description": {
              "type": "string"
            },
            "x": {
              "type": "number"
            },
            "y": {
              "type": "number"
            }
          },
          "additionalProperties": false,
          "required": [
            "type",
            "title",
            "description",
            "x",
            "y"
          ]
        }
      ]
    },
    "id": {
      "type": "string",
      "minLength": 1
    },
    "lang": {
      "type": "string",
      "description": "Switch locale, for example enUS, deDE, or frFR."
    }
  },
  "additionalProperties": false,
  "required": [
    "annotations",
    "id"
  ]
}
```

### switch_edit_annotation

Edit Annotation.

```json
{
  "type": "object",
  "properties": {
    "annotation": {
      "type": "object",
      "properties": {
        "type": {
          "type": "string"
        },
        "title": {
          "type": "string"
        },
        "description": {
          "type": "string"
        },
        "x": {
          "type": "number"
        },
        "y": {
          "type": "number"
        }
      },
      "additionalProperties": false
    },
    "id": {
      "type": "string",
      "minLength": 1
    },
    "annotId": {
      "type": "string",
      "minLength": 1
    },
    "lang": {
      "type": "string",
      "description": "Switch locale, for example enUS, deDE, or frFR."
    }
  },
  "additionalProperties": false,
  "required": [
    "annotation",
    "id",
    "annotId"
  ]
}
```

### switch_get_flows

Get Flows.

```json
{
  "type": "object",
  "properties": {
    "fields": {
      "type": "string",
      "description": "Comma-separated response field names; omitted means all available fields."
    },
    "ids": {
      "type": "string",
      "description": "Comma-separated identifiers. Omit only when the operation should affect or return all applicable items."
    },
    "lang": {
      "type": "string",
      "description": "Switch locale, for example enUS, deDE, or frFR."
    }
  },
  "additionalProperties": false
}
```

### switch_remove_annotations

Remove Annotations. Omitting annotId deletes ALL annotations in the flow.

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "minLength": 1
    },
    "annotId": {
      "type": "string",
      "minLength": 1
    },
    "lang": {
      "type": "string",
      "description": "Switch locale, for example enUS, deDE, or frFR."
    }
  },
  "additionalProperties": false,
  "required": [
    "id"
  ]
}
```

### switch_start_flow

Start Flow.

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "minLength": 1
    },
    "lang": {
      "type": "string",
      "description": "Switch locale, for example enUS, deDE, or frFR."
    }
  },
  "additionalProperties": false,
  "required": [
    "id"
  ]
}
```

### switch_stop_flow

Stop Flow.

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "minLength": 1
    },
    "lang": {
      "type": "string",
      "description": "Switch locale, for example enUS, deDE, or frFR."
    }
  },
  "additionalProperties": false,
  "required": [
    "id"
  ]
}
```

### switch_get_job_metadata

Get Job Metadata.

```json
{
  "type": "object",
  "properties": {
    "ids": {
      "type": "string",
      "description": "Comma-separated identifiers. Omit only when the operation should affect or return all applicable items."
    },
    "readonly": {
      "type": "boolean",
      "description": "Choose read-only or editable metadata; omit to return both."
    },
    "lang": {
      "type": "string",
      "description": "Switch locale, for example enUS, deDE, or frFR."
    }
  },
  "additionalProperties": false,
  "required": [
    "ids"
  ]
}
```

### switch_job_download

Job Download. Returns a session-bound download URL, not file bytes.

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "minLength": 1
    },
    "lang": {
      "type": "string",
      "description": "Switch locale, for example enUS, deDE, or frFR."
    }
  },
  "additionalProperties": false,
  "required": [
    "id"
  ]
}
```

### switch_job_report_download

Job Report Download. Returns a session-bound download URL, not file bytes.

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "minLength": 1
    },
    "lang": {
      "type": "string",
      "description": "Switch locale, for example enUS, deDE, or frFR."
    }
  },
  "additionalProperties": false,
  "required": [
    "id"
  ]
}
```

### switch_lock_job

Lock Job.

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "minLength": 1
    },
    "lang": {
      "type": "string",
      "description": "Switch locale, for example enUS, deDE, or frFR."
    }
  },
  "additionalProperties": false,
  "required": [
    "id"
  ]
}
```

### switch_post_job

Post Job.

```json
{
  "type": "object",
  "properties": {
    "flowId": {
      "type": "string"
    },
    "objectId": {
      "type": "string"
    },
    "jobName": {
      "type": "string"
    },
    "origin": {
      "type": "string"
    },
    "created": {
      "type": "string"
    },
    "modified": {
      "type": "string"
    },
    "metadata": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "value": {
            "type": "string"
          }
        },
        "additionalProperties": false,
        "required": [
          "id",
          "name",
          "value"
        ]
      },
      "description": "Switch metadata entries with id, name, and string value."
    },
    "lang": {
      "type": "string",
      "description": "Switch locale, for example enUS, deDE, or frFR."
    },
    "files": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "localPath": {
            "type": "string",
            "description": "Local file inside SWITCH_UPLOAD_ROOTS."
          },
          "base64": {
            "type": "string",
            "description": "Base64-encoded bytes, including empty string for an empty file."
          },
          "filename": {
            "type": "string",
            "minLength": 1
          },
          "relativePath": {
            "type": "string",
            "description": "Relative path within a folder job; required for every file when submitting multiple files."
          },
          "mimeType": {
            "type": "string"
          }
        },
        "oneOf": [
          {
            "required": [
              "localPath"
            ],
            "not": {
              "required": [
                "base64"
              ]
            }
          },
          {
            "required": [
              "base64",
              "filename"
            ],
            "not": {
              "required": [
                "localPath"
              ]
            }
          }
        ]
      }
    }
  },
  "additionalProperties": false,
  "required": [
    "flowId",
    "objectId",
    "jobName",
    "files"
  ]
}
```

### switch_replace_job

Replace Job.

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "minLength": 1
    },
    "updated": {
      "type": "string",
      "description": "Existing job updated timestamp for optimistic concurrency. Omit to skip the relevance check."
    },
    "lang": {
      "type": "string",
      "description": "Switch locale, for example enUS, deDE, or frFR."
    },
    "files": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "localPath": {
            "type": "string",
            "description": "Local file inside SWITCH_UPLOAD_ROOTS."
          },
          "base64": {
            "type": "string",
            "description": "Base64-encoded bytes, including empty string for an empty file."
          },
          "filename": {
            "type": "string",
            "minLength": 1
          },
          "relativePath": {
            "type": "string",
            "description": "Relative path within a folder job; required for every file when submitting multiple files."
          },
          "mimeType": {
            "type": "string"
          }
        },
        "oneOf": [
          {
            "required": [
              "localPath"
            ],
            "not": {
              "required": [
                "base64"
              ]
            }
          },
          {
            "required": [
              "base64",
              "filename"
            ],
            "not": {
              "required": [
                "localPath"
              ]
            }
          }
        ]
      }
    },
    "httpMethod": {
      "type": "string",
      "enum": [
        "PUT",
        "POST"
      ],
      "description": "PUT by default; POST is the documented alternative."
    }
  },
  "additionalProperties": false,
  "required": [
    "id",
    "files"
  ]
}
```

### switch_route_job

Route Job.

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "minLength": 1
    },
    "updated": {
      "type": "string",
      "description": "Existing job updated timestamp for optimistic concurrency. Omit to skip the relevance check."
    },
    "connections": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Connection IDs to which the job should be routed."
    },
    "metadata": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "value": {
            "type": "string"
          }
        },
        "additionalProperties": false,
        "required": [
          "id",
          "name",
          "value"
        ]
      },
      "description": "Switch metadata entries with id, name, and string value."
    },
    "lang": {
      "type": "string",
      "description": "Switch locale, for example enUS, deDE, or frFR."
    }
  },
  "additionalProperties": false,
  "required": [
    "id",
    "connections"
  ]
}
```

### switch_unlock_job

Unlock Job.

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "minLength": 1
    },
    "check": {
      "type": "boolean",
      "description": "true checks unlock permission without unlocking; false or omitted attempts to unlock."
    },
    "lang": {
      "type": "string",
      "description": "Switch locale, for example enUS, deDE, or frFR."
    }
  },
  "additionalProperties": false,
  "required": [
    "id"
  ]
}
```

### switch_rush_job

Rush Job.

```json
{
  "type": "object",
  "properties": {
    "processingId": {
      "type": "string",
      "minLength": 1
    },
    "lang": {
      "type": "string",
      "description": "Switch locale, for example enUS, deDE, or frFR."
    }
  },
  "additionalProperties": false,
  "required": [
    "processingId"
  ]
}
```

### switch_unrush_job

Unrush Job.

```json
{
  "type": "object",
  "properties": {
    "processingId": {
      "type": "string",
      "minLength": 1
    },
    "lang": {
      "type": "string",
      "description": "Switch locale, for example enUS, deDE, or frFR."
    }
  },
  "additionalProperties": false,
  "required": [
    "processingId"
  ]
}
```

### switch_add_job_filter

Add Job Filter.

```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string"
    },
    "query": {
      "type": "string",
      "description": "Switch filter expression encoded as a JSON string."
    },
    "visibility": {
      "type": "boolean",
      "description": "Whether the saved job filter is visible to the user."
    },
    "lang": {
      "type": "string",
      "description": "Switch locale, for example enUS, deDE, or frFR."
    }
  },
  "additionalProperties": false,
  "required": [
    "name",
    "query"
  ]
}
```

### switch_delete_job_filter

Delete Job Filter. Omitting ids deletes ALL filters for the current user.

```json
{
  "type": "object",
  "properties": {
    "ids": {
      "type": "string",
      "description": "Comma-separated identifiers. Omit only when the operation should affect or return all applicable items."
    },
    "lang": {
      "type": "string",
      "description": "Switch locale, for example enUS, deDE, or frFR."
    }
  },
  "additionalProperties": false
}
```

### switch_edit_job_filter

Edit Job Filter.

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "minLength": 1
    },
    "name": {
      "type": "string"
    },
    "query": {
      "type": "string",
      "description": "Switch filter expression encoded as a JSON string."
    },
    "visibility": {
      "type": "boolean",
      "description": "Whether the saved job filter is visible to the user."
    },
    "lang": {
      "type": "string",
      "description": "Switch locale, for example enUS, deDE, or frFR."
    }
  },
  "additionalProperties": false,
  "required": [
    "id"
  ]
}
```

### switch_get_job_filter

Get Job Filter.

```json
{
  "type": "object",
  "properties": {
    "ids": {
      "type": "string",
      "description": "Comma-separated identifiers. Omit only when the operation should affect or return all applicable items."
    },
    "fields": {
      "type": "string",
      "description": "Comma-separated response field names; omitted means all available fields."
    },
    "lang": {
      "type": "string",
      "description": "Switch locale, for example enUS, deDE, or frFR."
    },
    "includePredefined": {
      "type": "boolean"
    }
  },
  "additionalProperties": false
}
```

### switch_share_job_filter

Share Job Filter.

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "minLength": 1
    },
    "users": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "groups": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "lang": {
      "type": "string",
      "description": "Switch locale, for example enUS, deDE, or frFR."
    }
  },
  "additionalProperties": false,
  "required": [
    "id"
  ]
}
```

### switch_unshare_job_filter

Unshare Job Filter.

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "minLength": 1
    },
    "users": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "groups": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "lang": {
      "type": "string",
      "description": "Switch locale, for example enUS, deDE, or frFR."
    }
  },
  "additionalProperties": false,
  "required": [
    "id"
  ]
}
```

### switch_get_jobs

Get Jobs.

```json
{
  "type": "object",
  "properties": {
    "fields": {
      "type": "string",
      "description": "Comma-separated response field names; omitted means all available fields."
    },
    "filter": {
      "type": "string",
      "description": "Saved filter ID or raw JSON filter string. Pass unescaped text; the client URL-encodes it once."
    },
    "sort": {
      "type": "string",
      "description": "Comma-separated sort keys; prefix a key with - for descending order."
    },
    "limit": {
      "type": "number"
    },
    "lastUpdated": {
      "type": "string",
      "description": "ISO timestamp; retrieve only newer job updates."
    },
    "data": {
      "type": "boolean",
      "description": "false tests for matching jobs without retrieving the job list."
    },
    "lang": {
      "type": "string",
      "description": "Switch locale, for example enUS, deDE, or frFR."
    }
  },
  "additionalProperties": false
}
```

### switch_dashboard_graphql

dashboard Graph QL.

```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "minLength": 1
    },
    "variables": {
      "type": "object",
      "additionalProperties": true
    },
    "operationName": {
      "type": "string"
    }
  },
  "additionalProperties": false,
  "required": [
    "query"
  ]
}
```

### switch_add_message_filter

Add Message Filter.

```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string"
    },
    "query": {
      "type": "string",
      "description": "Switch filter expression encoded as a JSON string."
    },
    "lang": {
      "type": "string",
      "description": "Switch locale, for example enUS, deDE, or frFR."
    }
  },
  "additionalProperties": false,
  "required": [
    "name",
    "query"
  ]
}
```

### switch_delete_message_filter

Delete Message Filter. Omitting ids deletes ALL filters for the current user.

```json
{
  "type": "object",
  "properties": {
    "ids": {
      "type": "string",
      "description": "Comma-separated identifiers. Omit only when the operation should affect or return all applicable items."
    },
    "lang": {
      "type": "string",
      "description": "Switch locale, for example enUS, deDE, or frFR."
    }
  },
  "additionalProperties": false
}
```

### switch_edit_message_filter

Edit Message Filter.

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "minLength": 1
    },
    "name": {
      "type": "string"
    },
    "query": {
      "type": "string",
      "description": "Switch filter expression encoded as a JSON string."
    },
    "lang": {
      "type": "string",
      "description": "Switch locale, for example enUS, deDE, or frFR."
    }
  },
  "additionalProperties": false,
  "required": [
    "id"
  ]
}
```

### switch_get_message_filter

Get Message Filter.

```json
{
  "type": "object",
  "properties": {
    "ids": {
      "type": "string",
      "description": "Comma-separated identifiers. Omit only when the operation should affect or return all applicable items."
    },
    "fields": {
      "type": "string",
      "description": "Comma-separated response field names; omitted means all available fields."
    },
    "lang": {
      "type": "string",
      "description": "Switch locale, for example enUS, deDE, or frFR."
    }
  },
  "additionalProperties": false
}
```

### switch_get_messages_list

Get Messages List.

```json
{
  "type": "object",
  "properties": {
    "period": {
      "type": "string",
      "description": "Relative time window such as 2d or 2h."
    },
    "timestamp": {
      "type": "string",
      "description": "ISO timestamp or a comma-separated start/end interval; either bound may be omitted."
    },
    "flow": {
      "oneOf": [
        {
          "type": "string"
        },
        {
          "type": "array",
          "items": {
            "type": "string"
          },
          "minItems": 1
        }
      ]
    },
    "type": {
      "oneOf": [
        {
          "type": "string"
        },
        {
          "type": "array",
          "items": {
            "type": "string"
          },
          "minItems": 1
        }
      ]
    },
    "module": {
      "oneOf": [
        {
          "type": "string"
        },
        {
          "type": "array",
          "items": {
            "type": "string"
          },
          "minItems": 1
        }
      ]
    },
    "element": {
      "oneOf": [
        {
          "type": "string"
        },
        {
          "type": "array",
          "items": {
            "type": "string"
          },
          "minItems": 1
        }
      ]
    },
    "prefix": {
      "oneOf": [
        {
          "type": "string"
        },
        {
          "type": "array",
          "items": {
            "type": "string"
          },
          "minItems": 1
        }
      ]
    },
    "job": {
      "oneOf": [
        {
          "type": "string"
        },
        {
          "type": "array",
          "items": {
            "type": "string"
          },
          "minItems": 1
        }
      ]
    },
    "message": {
      "oneOf": [
        {
          "type": "string"
        },
        {
          "type": "array",
          "items": {
            "type": "string"
          },
          "minItems": 1
        }
      ]
    },
    "filter": {
      "type": "string",
      "description": "Saved filter ID or raw JSON filter string. Pass unescaped text; the client URL-encodes it once."
    },
    "limit": {
      "type": "number"
    },
    "sort": {
      "type": "string",
      "description": "Comma-separated sort keys; prefix a key with - for descending order."
    },
    "range": {
      "type": "string",
      "description": "Result index interval, such as 40,60; this is not a message ID interval."
    },
    "id": {
      "type": "string",
      "minLength": 1
    },
    "lang": {
      "type": "string",
      "description": "Switch locale, for example enUS, deDE, or frFR."
    }
  },
  "additionalProperties": false
}
```

### switch_post_clear_messages

Post Clear Messages. Clears the entire Switch message log.

```json
{
  "type": "object",
  "properties": {
    "lang": {
      "type": "string",
      "description": "Switch locale, for example enUS, deDE, or frFR."
    }
  },
  "additionalProperties": false
}
```

### switch_ping

Ping.

```json
{
  "type": "object",
  "properties": {
    "refresh": {
      "type": "boolean",
      "description": "true refreshes the Switch session; false only checks its status."
    }
  },
  "additionalProperties": false
}
```

### switch_get_submitpoints

Get Submitpoints.

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "minLength": 1
    },
    "fields": {
      "type": "string",
      "description": "Comma-separated response field names; omitted means all available fields."
    },
    "lang": {
      "type": "string",
      "description": "Switch locale, for example enUS, deDE, or frFR."
    }
  },
  "additionalProperties": false
}
```

### switch_switch_helper_default_app

Switch Helper Default App.

```json
{
  "type": "object",
  "properties": {
    "extension": {
      "type": "string"
    }
  },
  "additionalProperties": false,
  "required": [
    "extension"
  ]
}
```

### switch_switch_helper_ping

Switch Helper Ping.

```json
{
  "type": "object",
  "properties": {},
  "additionalProperties": false
}
```

### switch_switch_helper_cancel_edit_job

Switch Helper Cancel Edit Job.

```json
{
  "type": "object",
  "properties": {
    "jobId": {
      "type": "string",
      "minLength": 1
    }
  },
  "additionalProperties": false,
  "required": [
    "jobId"
  ]
}
```

### switch_switch_helper_delete_select_job

Switch Helper Delete Select Job.

```json
{
  "type": "object",
  "properties": {
    "submitId": {
      "type": "number",
      "description": "Switch Helper selection ID, reused across selection, submission, and progress calls."
    },
    "path": {
      "type": "string"
    }
  },
  "additionalProperties": false,
  "required": [
    "submitId",
    "path"
  ]
}
```

### switch_switch_helper_edit_job

Switch Helper Edit Job.

```json
{
  "type": "object",
  "properties": {
    "jobId": {
      "type": "string"
    },
    "jobName": {
      "type": "string"
    },
    "swsUrl": {
      "type": "string",
      "description": "Defaults to the configured Switch session."
    },
    "token": {
      "type": "string",
      "description": "Defaults to the configured Switch session."
    },
    "lang": {
      "type": "string",
      "description": "Switch locale, for example enUS, deDE, or frFR."
    }
  },
  "additionalProperties": false,
  "required": [
    "jobId",
    "jobName"
  ]
}
```

### switch_switch_helper_job_in_edit

Switch Helper Job In Edit.

```json
{
  "type": "object",
  "properties": {
    "jobId": {
      "type": "string",
      "minLength": 1
    }
  },
  "additionalProperties": false,
  "required": [
    "jobId"
  ]
}
```

### switch_switch_helper_replace_job

Switch Helper Replace Job.

```json
{
  "type": "object",
  "properties": {
    "jobId": {
      "type": "string"
    },
    "swsUrl": {
      "type": "string",
      "description": "Defaults to the configured Switch session."
    },
    "token": {
      "type": "string",
      "description": "Defaults to the configured Switch session."
    },
    "lang": {
      "type": "string",
      "description": "Switch locale, for example enUS, deDE, or frFR."
    },
    "updated": {
      "type": "string",
      "description": "Existing job updated timestamp for optimistic concurrency. Omit to skip the relevance check."
    }
  },
  "additionalProperties": false,
  "required": [
    "jobId"
  ]
}
```

### switch_switch_helper_select_job

Switch Helper Select Job. Opens the native file chooser on the Helper machine.

```json
{
  "type": "object",
  "properties": {
    "jobFolder": {
      "type": "boolean"
    },
    "acceptFileTypes": {
      "type": "string",
      "description": "Comma-separated extensions accepted by the Helper file chooser."
    },
    "submitId": {
      "type": "number",
      "description": "Switch Helper selection ID, reused across selection, submission, and progress calls."
    }
  },
  "additionalProperties": false
}
```

### switch_switch_helper_submit_job

Switch Helper Submit Job.

```json
{
  "type": "object",
  "properties": {
    "submitId": {
      "type": "number",
      "description": "Switch Helper selection ID, reused across selection, submission, and progress calls."
    },
    "swsUrl": {
      "type": "string",
      "description": "Defaults to the configured Switch session."
    },
    "token": {
      "type": "string",
      "description": "Defaults to the configured Switch session."
    },
    "flowId": {
      "type": "string"
    },
    "objectId": {
      "type": "string"
    },
    "jobName": {
      "type": "string"
    },
    "metadata": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "value": {
            "type": "string"
          }
        },
        "additionalProperties": false,
        "required": [
          "id",
          "name",
          "value"
        ]
      },
      "description": "Switch metadata entries with id, name, and string value."
    },
    "lang": {
      "type": "string",
      "description": "Switch locale, for example enUS, deDE, or frFR."
    }
  },
  "additionalProperties": false,
  "required": [
    "submitId",
    "flowId",
    "objectId"
  ]
}
```

### switch_switch_helper_submit_progress

Switch Helper Submit Progress.

```json
{
  "type": "object",
  "properties": {
    "submitId": {
      "type": "number",
      "description": "Switch Helper selection ID, reused across selection, submission, and progress calls."
    }
  },
  "additionalProperties": false,
  "required": [
    "submitId"
  ]
}
```

### switch_get_thumbnails

Get Thumbnails.

```json
{
  "type": "object",
  "properties": {
    "jobIds": {
      "type": "string",
      "description": "Comma-separated job IDs. Choose this or jobProcessingIds, never both.",
      "minLength": 1
    },
    "jobProcessingIds": {
      "type": "string",
      "description": "Comma-separated processing IDs. Choose this or jobIds, never both.",
      "minLength": 1
    },
    "lang": {
      "type": "string",
      "description": "Switch locale, for example enUS, deDE, or frFR."
    }
  },
  "additionalProperties": false,
  "oneOf": [
    {
      "required": [
        "jobIds"
      ],
      "not": {
        "required": [
          "jobProcessingIds"
        ]
      }
    },
    {
      "required": [
        "jobProcessingIds"
      ],
      "not": {
        "required": [
          "jobIds"
        ]
      }
    }
  ]
}
```

### switch_get_groups

Get Groups.

```json
{
  "type": "object",
  "properties": {
    "lang": {
      "type": "string",
      "description": "Switch locale, for example enUS, deDE, or frFR."
    }
  },
  "additionalProperties": false
}
```
