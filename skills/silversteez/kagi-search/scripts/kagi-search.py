#!/usr/bin/env python3
"""
Kagi Search CLI - Web search using Kagi Search API

Usage:
    kagi-search "search query" [options]
    kagi-search --help
"""

import argparse
import json
import os
import sys
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

API_BASE = "https://kagi.com/api/v0/search"


def get_api_key() -> str:
    api_key = os.environ.get("KAGI_API_KEY")
    if not api_key:
        raise EnvironmentError("KAGI_API_KEY environment variable not set")
    return api_key


def search(query: str, limit: int = 10, offset: int = 0, json_output: bool = False, 
           include_related: bool = True) -> dict:
    """
    Perform a search using the Kagi Search API.
    
    Args:
        query: Search query string
        limit: Number of results to return (default: 10)
        offset: Offset for pagination (default: 0)
        json_output: Whether to return raw JSON response
        include_related: Whether to include related searches
        
    Returns:
        dict: Search results
    """
    api_key = get_api_key()
    
    # Build query params for GET request
    params = {
        "q": query,
        "limit": limit,
        "offset": offset,
        "backend": "fast",
        "related": str(include_related).lower(),
    }
    
    url = f"{API_BASE}?{urlencode(params)}"
    
    headers = {
        "Authorization": f"Bot {api_key}",
    }
    
    try:
        request = Request(url, headers=headers, method="GET")
        with urlopen(request, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as e:
        error_body = e.read().decode("utf-8") if e.fp else ""
        raise RuntimeError(f"HTTP Error {e.code}: {e.reason}\n{error_body}")
    except URLError as e:
        raise RuntimeError(f"URL Error: {e.reason}")


def format_results(results: dict, query: str) -> str:
    """Format search results for display."""
    output = []
    data = results.get("data", [])
    
    # Query info
    output.append(f"[Query: {query}]")
    
    # Results count - count items that have 'url' field (actual results, not metadata)
    results_list = [r for r in data if isinstance(r, dict) and r.get('url')]
    output.append(f"[Results: {len(results_list)}]")
    
    # API balance
    meta = results.get("meta", {})
    if "api_balance" in meta:
        output.append(f"[API Balance: ${meta['api_balance']:.3f}]")
    if "ms" in meta:
        output.append(f"[Time: {meta['ms']}ms]")
    
    output.append("-" * 40)
    
    # Results
    for i, result in enumerate(results_list, 1):
        output.append(f"=== {result.get('title', 'No Title')} ===")
        output.append(result.get('url', 'No URL'))
        snippet = result.get('snippet', '')
        if snippet:
            output.append(snippet)
        if result.get('published'):
            output.append(f"[{result['published']}]")
        output.append("---")
    
    # Related searches - find item with 'list' key
    for item in data:
        if isinstance(item, dict) and item.get('list'):
            related = ", ".join(item['list'][:10])
            output.append(f"Related: {related}")
            break
    
    return "\n".join(output)


def main():
    parser = argparse.ArgumentParser(
        description="Web search using Kagi Search API",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument(
        "query",
        nargs="*",
        help="Search query (use quotes for multi-word searches)"
    )
    parser.add_argument(
        "-n", "--limit",
        type=int,
        default=10,
        help="Number of results to return (default: 10)"
    )
    parser.add_argument(
        "-s", "--offset",
        type=int,
        default=0,
        help="Offset for pagination (default: 0)"
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output raw JSON response"
    )
    parser.add_argument(
        "--no-related",
        action="store_true",
        help="Hide related searches"
    )
    
    args = parser.parse_args()
    
    if not args.query:
        parser.print_help()
        sys.exit(1)
    
    query = " ".join(args.query)
    
    try:
        results = search(
            query=query,
            limit=args.limit,
            offset=args.offset,
            include_related=not args.no_related
        )
        
        if args.json:
            print(json.dumps(results, indent=2))
        else:
            print(format_results(results, query))
            
    except EnvironmentError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    except RuntimeError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
