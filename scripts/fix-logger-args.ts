import { Project, SyntaxKind } from 'ts-morph';

const project = new Project();
project.addSourceFilesAtPaths('src/**/*.ts');
project.addSourceFilesAtPaths('src/**/*.tsx');

let modifiedCount = 0;

project.getSourceFiles().forEach(sourceFile => {
    let modified = false;

    // Traverse in reverse to avoid invalidating tree offsets during replacement
    const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).reverse();

    callExpressions.forEach(callExpr => {
        // Safe check for forgotten node
        if (callExpr.wasForgotten()) return;

        const expression = callExpr.getExpression();
        const text = expression.getText();

        if (text === 'logger.info' || text === 'logger.warn' || text === 'logger.error') {
            const args = callExpr.getArguments();

            // We only care if the first argument is a string (literal or template) and there are subsequent arguments
            if (args.length >= 2) {
                const firstArgKind = args[0].getKind();
                if (
                    firstArgKind === SyntaxKind.StringLiteral ||
                    firstArgKind === SyntaxKind.TemplateExpression ||
                    firstArgKind === SyntaxKind.NoSubstitutionTemplateLiteral
                ) {
                    const msgArgText = args[0].getText();

                    // Collect the rest of the arguments into an object
                    const properties = args.slice(1).map((arg, index) => {
                        const argText = arg.getText();
                        // If it's a simple variable, shorthand it { error }
                        if (arg.getKind() === SyntaxKind.Identifier) {
                            return `${argText}`;
                        }
                        // Handle "error" explicitly if it contains error
                        if (argText.includes('error') || argText.includes('err')) {
                            return `err: ${argText}`;
                        }
                        return `data${index}: ${argText}`;
                    });

                    const objStr = `{ ${properties.join(', ')} }`;

                    // Replace the entire call expression text
                    callExpr.replaceWithText(`${text}(${objStr}, ${msgArgText})`);

                    modified = true;
                }
            }
        }
    });

    if (modified) {
        sourceFile.saveSync();
        modifiedCount++;
    }
});

console.log(`Successfully formatted arguments in ${modifiedCount} files for Pino compatibility.`);
