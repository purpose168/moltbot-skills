---
name: servicenow-docs
description: Search and fetch ServiceNow documentation from docs.servicenow.com using the Zoomin API. Covers API references, scripting guides, and platform documentation.
metadata: {"clawdbot":{"emoji":"📘","requires":{}}}
---

# ServiceNow Documentation Skill

Search and retrieve documentation from docs.servicenow.com using the Zoomin API.

## Usage

When asked about ServiceNow documentation, API references, scripting, or platform features, use this skill.

## Tools

### servicenow_search
Search the ServiceNow documentation database.

**Args:**
- `query` (string, required) - Search terms (e.g., "GlideRecord", "GlideQuery", "business rule")
- `limit` (number, default: 10) - Maximum results to return
- `version` (string, optional) - Filter by version (e.g., "Washington DC", "Zurich")

**Example:**
```json
{"query": "GlideRecord insert", "limit": 5}
```

### servicenow_get_article
Fetch the full content of a documentation article.

**Args:**
- `url` (string, required) - The article URL from search results

**Example:**
```json
{"url": "https://servicenow-be-prod.servicenow.com/bundle/washingtondc-api-reference/page/app-store/dev_portal/API_reference/GlideRecord/concept/c_GlideRecordAPI.html"}
```

### servicenow_list_versions
List available documentation versions/releases.

**Args:** None required

## APIs Used

- **Zoomin Search API**: `https://servicenow-be-prod.servicenow.com/search`
- Content indexed from docs.servicenow.com
