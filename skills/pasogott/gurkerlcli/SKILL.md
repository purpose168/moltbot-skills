---
name: gurkerlcli
version: 0.1.0
description: Austrian online grocery shopping via gurkerl.at. Use when user asks about "groceries", "Einkauf", "Lebensmittel bestellen", "Gurkerl", shopping cart, or wants to search/order food online in Austria.
tools: [bash]
---

# 🥒 gurkerlcli - Austrian Grocery Shopping

Command-line interface for [gurkerl.at](https://gurkerl.at) online grocery shopping (Austria only).

## Installation

```bash
# Via Homebrew
brew tap pasogott/tap
brew install gurkerlcli

# Or via pipx
pipx install gurkerlcli
```

## Authentication

**Login required before use:**

```bash
gurkerlcli auth login      # Opens browser for login
gurkerlcli auth whoami     # Check login status
gurkerlcli auth logout     # Clear session
```

Session is stored securely in macOS Keychain.

## Commands

### 🔍 Search Products

```bash
gurkerlcli search "bio milch"
gurkerlcli search "äpfel" --limit 10
gurkerlcli search "brot" --json          # JSON output for scripting
```

### 🛒 Shopping Cart

```bash
gurkerlcli cart list                     # View cart contents
gurkerlcli cart add <product_id>         # Add product
gurkerlcli cart add <product_id> --quantity 3
gurkerlcli cart remove <product_id>      # Remove product
gurkerlcli cart clear                    # Empty cart
```

### 📝 Shopping Lists

```bash
gurkerlcli lists list                    # Show all lists
gurkerlcli lists show <list_id>          # Show list details
gurkerlcli lists create "Wocheneinkauf"  # Create new list
gurkerlcli lists delete <list_id>        # Delete list
```

### 📦 Order History

```bash
gurkerlcli orders list                   # View past orders
```

## Example Workflows

### Check What's in the Cart

```bash
gurkerlcli cart list
```

Output:
```
🛒 Shopping Cart
┌─────────────────────────────────┬──────────────┬───────────────┬──────────┐
│ Product                         │          Qty │         Price │ Subtotal │
├─────────────────────────────────┼──────────────┼───────────────┼──────────┤
│ 🥛 nöm BIO-Vollmilch 3,5%       │     2x 1.0 l │ €1.89 → €1.70 │    €3.40 │
│ 🧀 Bergbaron                    │     1x 150 g │         €3.99 │    €3.99 │
├─────────────────────────────────┼──────────────┼───────────────┼──────────┤
│                                 │              │        Total: │    €7.39 │
└─────────────────────────────────┴──────────────┴───────────────┴──────────┘

⚠️  Minimum order: €39.00 (€31.61 remaining)
```

### Search and Add to Cart

```bash
# Find product
gurkerlcli search "hafermilch" --json

# Add to cart (use product ID from search results)
gurkerlcli cart add 123456 --quantity 2
```

### Quick Reorder from List

```bash
# Check shopping lists
gurkerlcli lists list

# View specific list
gurkerlcli lists show 12345
```

## Tips

- **Minimum order:** €39.00 for delivery
- **Delivery slots:** Check gurkerl.at website for available times
- **Sale items:** Prices with arrows (€1.89 → €1.70) indicate discounts
- **JSON output:** Use `--json` flag for scripting/automation

## Limitations

- ⏳ Checkout not yet implemented (use website)
- 🇦🇹 Austria only (Vienna, Graz, Linz areas)
- 🔐 Requires active gurkerl.at account

## Links

- [gurkerl.at](https://gurkerl.at)
- [GitHub Repository](https://github.com/pasogott/gurkerlcli)
