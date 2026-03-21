with open('src/app/demo/page.tsx', 'r') as f:
    content = f.read()

# I see SymbolGroupedView doesn't have the props in demo/page.tsx
old_symbol = """                                        <SymbolGroupedView
                                            transactions={filteredTransactions}
                                            onDelete={handleDeleteTransaction}
                                            onDeleteChain={handleDeleteChain}
                                            onEdit={handleEditTransaction}
                                            chains={chains}
                                            portfolios={portfolios}
                                            showPortfolioColumn={!selectedPortfolioId}
                                        />"""

new_symbol = """                                        <SymbolGroupedView
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
