import type { ToolDef } from '../../../src/types';
import { z } from 'zod';

const ZOOMIN_API = 'https://servicenow-be-prod.servicenow.com/search';

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  publicationTitle: string;
  updatedOn: string;
  shortlabels?: {
    Products?: string;
    Versions?: string;
  };
}

interface SearchResponse {
  SearchResults: SearchResult[];
}

// Format a single search result
function formatResult(result: SearchResult, index: number): string {
  const date = new Date(result.updatedOn).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  let output = `${index + 1}. **${result.title}**\n`;
  output += `   ${result.snippet}\n`;
  output += `   📄 ${result.publicationTitle}`;
  if (result.shortlabels?.Versions) {
    output += ` (${result.shortlabels.Versions})`;
  }
  output += `\n   🔗 ${result.link}\n`;
  output += `   📅 Updated: ${date}\n`;

  return output;
}

// Search ServiceNow documentation
async function searchDocs(query: string, limit: number = 10, version?: string): Promise<string> {
  try {
    let url = `${ZOOMIN_API}?q=${encodeURIComponent(query)}&publication=latest`;

    if (version) {
      url += `&version=${encodeURIComponent(version)}`;
    }

    const response = await fetch(url);
    if (!response.ok) {
      return `Error: Search failed with status ${response.status}`;
    }

    const data: SearchResponse = await response.json();
    const results = data.SearchResults?.slice(0, limit) || [];

    if (results.length === 0) {
      return `No results found for "${query}". Try different search terms.`;
    }

    let output = `🔍 **Search Results for "${query}"**\n`;
    output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    results.forEach((result, index) => {
      output += formatResult(result, index);
    });

    output += `\n*${results.length} result(s) found*`;

    return output;
  } catch (error) {
    console.error('ServiceNow docs search error:', error);
    return 'Error: Failed to search ServiceNow documentation';
  }
}

// Fetch full article content (simplified - returns metadata and attempts to extract main content)
async function getArticle(url: string): Promise<string> {
  try {
    // First fetch the page to get metadata
    const response = await fetch(url);
    if (!response.ok) {
      return `Error: Failed to fetch article (status ${response.status})`;
    }

    const html = await response.text();

    // Extract title from meta tags or og:title
    const titleMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]*)"/i) ||
                       html.match(/<title>([^<]*)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : 'ServiceNow Documentation';

    // Try to extract main content (simplified - full rendering would need browser)
    const bodyMatch = html.match(/<article[^>]*class="[^"]*topic[^"]*"[^>]*>([\s\S]*?)<\/article>/i) ||
                      html.match(/<div[^>]*id="main-content"[^>]*>([\s\S]*?)<\/div>/i);

    let content = '';
    if (bodyMatch) {
      // Strip HTML tags for plain text
      content = bodyMatch[1].replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                           .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                           .replace(/<[^>]+>/g, ' ')
                           .replace(/\s+/g, ' ')
                           .trim();

      // Limit content length
      if (content.length > 2000) {
        content = content.substring(0, 2000) + '...';
      }
    }

    let output = `📄 **${title}**\n`;
    output += `🔗 ${url}\n\n`;

    if (content) {
      output += `${content}\n\n`;
      output += `_Note: Full content may require browser rendering. Use agent-browser for complete article extraction._`;
    } else {
      output += `_Content is dynamically rendered. Use agent-browser or visit the URL directly for full content._`;
    }

    return output;
  } catch (error) {
    console.error('ServiceNow article fetch error:', error);
    return 'Error: Failed to fetch article';
  }
}

// List available documentation versions
async function listVersions(): Promise<string> {
  // Common ServiceNow versions
  const versions = [
    { name: 'Washington DC', code: 'washingtondc', status: 'Latest' },
    { name: 'Zurich', code: 'zurich', status: 'Previous' },
    { name: 'Yokohama', code: 'yokohama', status: 'Older' },
    { name: 'Xanadu', code: 'xanadu', status: 'Legacy' },
  ];

  let output = `📚 **ServiceNow Documentation Versions**\n`;
  output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  versions.forEach((v, i) => {
    const status = v.status === 'Latest' ? '✅' : v.status === 'Previous' ? '📗' : '📙';
    output += `${status} ${v.name} (${v.code})\n`;
  });

  output += `\n_Search results default to latest version unless specified._`;

  return output;
}

// Tool definitions
export const servicenow_search: ToolDef = {
  name: 'servicenow_search',
  description: 'Search ServiceNow documentation for API references, scripting guides, and platform features',
  schema: z.object({
    query: z.string().describe('Search terms (e.g., GlideRecord, business rule)'),
    limit: z.number().default(10).describe('Maximum results to return'),
    version: z.string().optional().describe('Filter by version (e.g., Washington DC, Zurich)'),
  }),
  execute: async (args: unknown) => {
    const { query, limit, version } = args as { query: string; limit?: number; version?: string };
    return searchDocs(query, limit, version);
  },
};

export const servicenow_get_article: ToolDef = {
  name: 'servicenow_get_article',
  description: 'Fetch the full content of a ServiceNow documentation article',
  schema: z.object({
    url: z.string().describe('The article URL from search results'),
  }),
  execute: async (args: unknown) => {
    const { url } = args as { url: string };
    return getArticle(url);
  },
};

export const servicenow_list_versions: ToolDef = {
  name: 'servicenow_list_versions',
  description: 'List available ServiceNow documentation versions',
  schema: z.object({}),
  execute: async () => listVersions(),
};

export const tools = [servicenow_search, servicenow_get_article, servicenow_list_versions];
