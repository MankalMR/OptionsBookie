with open('src/components/SymbolGroupedView.tsx', 'r') as f:
    content = f.read()

# Add TickerMultiSelect import
import_stmt = "import TickerMultiSelect from './TickerMultiSelect';\n"
content = content.replace("import Tooltip from './ui/tooltip';", "import Tooltip from './ui/tooltip';\n" + import_stmt)

# Update props
old_props = """interface SymbolGroupedViewProps {
  transactions: OptionsTransaction[];
  onDelete: (id: string) => void;
  onDeleteChain: (chainId: string) => void;
  onEdit: (transaction: OptionsTransaction) => void;
  chains: import('@/types/options').TradeChain[];
  portfolios: import('@/types/options').Portfolio[];
  showPortfolioColumn: boolean;
}"""

new_props = """interface SymbolGroupedViewProps {
  transactions: OptionsTransaction[];
  onDelete: (id: string) => void;
  onDeleteChain: (chainId: string) => void;
  onEdit: (transaction: OptionsTransaction) => void;
  chains: import('@/types/options').TradeChain[];
  portfolios: import('@/types/options').Portfolio[];
  showPortfolioColumn: boolean;
  availableTickers?: string[];
  selectedTickers?: string[];
  onTickerChange?: (tickers: string[]) => void;
}"""
content = content.replace(old_props, new_props)

# Update component signature
old_sig = """export default function SymbolGroupedView({
  transactions,
  onDelete,
  onDeleteChain,
  onEdit,
  chains,
  portfolios,
  showPortfolioColumn
}: SymbolGroupedViewProps) {"""

new_sig = """export default function SymbolGroupedView({
  transactions,
  onDelete,
  onDeleteChain,
  onEdit,
  chains,
  portfolios,
  showPortfolioColumn,
  availableTickers = [],
  selectedTickers = [],
  onTickerChange
}: SymbolGroupedViewProps) {"""
content = content.replace(old_sig, new_sig)

# Update rendering
old_render = """      {/* Header with controls */}
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Trades by Symbol</h3>
              <Tooltip content="Expand or collapse all symbol groups">"""

new_render = """      {/* Header with controls */}
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <h3 className="text-lg font-semibold">Trades by Symbol</h3>
                {availableTickers.length > 0 && onTickerChange && (
                  <TickerMultiSelect
                    availableTickers={availableTickers}
                    selectedTickers={selectedTickers}
                    onTickerChange={onTickerChange}
                    className="w-48"
                  />
                )}
              </div>
              <Tooltip content="Expand or collapse all symbol groups">"""
content = content.replace(old_render, new_render)

with open('src/components/SymbolGroupedView.tsx', 'w') as f:
    f.write(content)
