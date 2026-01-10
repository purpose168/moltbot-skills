solo-cli - SOLO.ro accounting platform CLI

Usage:
  solo-cli [command] [args]

Commands:
  summary [year]  Show account summary (year, revenues, expenses, taxes)
  revenues        List revenue invoices (aliases: revenue, rev)
  expenses        List expenses (aliases: expense, exp)
  queue           List expense queue / pending documents (alias: q)
  efactura        List e-Factura documents (aliases: einvoice, ei)
  company         Show company profile
  tui             Start interactive TUI (default when no command)

Options:
  help, -h        Show this help message
  version, -v     Show version

Config:
  ~/.config/solo-cli/config.json

Examples:
  solo-cli                    # Start TUI
  solo-cli summary            # Show current year summary
  solo-cli summary 2025       # Show 2025 summary
  solo-cli rev                # List invoices
  solo-cli expenses | grep -i "food"