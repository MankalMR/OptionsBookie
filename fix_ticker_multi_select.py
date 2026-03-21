with open('src/components/TickerMultiSelect.tsx', 'r') as f:
    content = f.read()

# Make the Card dropdown wider and look better
old_card = '        <Card className="absolute top-full left-0 right-0 mt-1 z-50 shadow-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 max-h-80 overflow-y-auto">'
new_card = '        <Card className="absolute top-full left-0 w-64 mt-1 z-50 shadow-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 max-h-80 overflow-y-auto">'

content = content.replace(old_card, new_card)

# Let's fix the header buttons to look like the image (Select All / Clear All)
old_header = """            <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10 pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="text-xs h-6 px-2"
              >
                Select All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="text-xs h-6 px-2"
              >
                Clear All
              </Button>
            </div>"""

new_header = """            <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10 pt-1 px-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="text-xs h-6 px-2 text-foreground font-medium"
              >
                Select All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="text-xs h-6 px-2 text-foreground font-medium"
              >
                Clear All
              </Button>
            </div>"""

content = content.replace(old_header, new_header)


# Let's fix the label input padding to match
old_label = """                    <label
                      key={ticker}
                      className="flex items-center justify-between p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleTickerToggle(ticker)}
                          className="rounded border-input text-primary focus:ring-ring"
                        />
                        <span className="text-sm font-medium">{ticker}</span>
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-primary" />}
                    </label>"""

new_label = """                    <label
                      key={ticker}
                      className="flex items-center space-x-3 px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleTickerToggle(ticker)}
                        className="rounded border-input h-4 w-4 text-primary focus:ring-ring shrink-0"
                      />
                      <span className="text-sm font-medium flex-1">{ticker}</span>
                    </label>"""
content = content.replace(old_label, new_label)

with open('src/components/TickerMultiSelect.tsx', 'w') as f:
    f.write(content)
