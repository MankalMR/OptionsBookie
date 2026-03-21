with open('src/app/demo/page.tsx', 'r') as f:
    content = f.read()

# Remove TickerMultiSelect from CardHeader
old_header = """                                            {/* Filters */}
                                            {!isMobile && (
                                                <div className="flex items-center space-x-2">
                                                    <TickerMultiSelect
                                                        availableTickers={availableTickers}
                                                        selectedTickers={selectedTickers}
                                                        onTickerChange={handleTickerChange}
                                                        className="w-48"
                                                    />
                                                    <StatusMultiSelect
                                                        selectedStatuses={selectedStatuses}
                                                        onStatusChange={handleStatusChange}
                                                        className="w-48"
                                                    />
                                                </div>
                                            )}"""

new_header = """                                            {/* Filters */}
                                            {!isMobile && (
                                                <div className="flex items-center space-x-2">
                                                    <StatusMultiSelect
                                                        selectedStatuses={selectedStatuses}
                                                        onStatusChange={handleStatusChange}
                                                        className="w-48"
                                                    />
                                                </div>
                                            )}"""

content = content.replace(old_header, new_header)

# Remove TickerMultiSelect import
content = content.replace("import TickerMultiSelect from '@/components/TickerMultiSelect';\n", "")

# Add props to SymbolGroupedView
old_symbol = """                                            <SymbolGroupedView
                                                transactions={filteredTransactions}
                                                onDelete={handleDeleteTransaction}
                                                onDeleteChain={handleDeleteChain}
                                                onEdit={handleEditTransaction}
                                                chains={chains}
                                                portfolios={portfolios}
                                                showPortfolioColumn={!selectedPortfolioId}
                                            />"""

new_symbol = """                                            <SymbolGroupedView
                                                transactions={filteredTransactions}
                                                onDelete={handleDeleteTransaction}
                                                onDeleteChain={handleDeleteChain}
                                                onEdit={handleEditTransaction}
                                                chains={chains}
                                                portfolios={portfolios}
                                                showPortfolioColumn={!selectedPortfolioId}
                                                availableTickers={availableTickers}
                                                selectedTickers={selectedTickers}
                                                onTickerChange={handleTickerChange}
                                            />"""

content = content.replace(old_symbol, new_symbol)

with open('src/app/demo/page.tsx', 'w') as f:
    f.write(content)
