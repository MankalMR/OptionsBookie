import { Project, SyntaxKind, SourceFile } from 'ts-morph';

const project = new Project();
project.addSourceFilesAtPaths('src/**/*.ts');
project.addSourceFilesAtPaths('src/**/*.tsx');

let filesModified = 0;

project.getSourceFiles().forEach((sourceFile: SourceFile) => {
    let modified = false;

    // Find all CallExpressions
    const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);

    callExpressions.forEach(callExpr => {
        const expression = callExpr.getExpression();
        const text = expression.getText();

        if (text === 'console.log' || text === 'console.info') {
            expression.replaceWithText('logger.info');
            modified = true;
        } else if (text === 'console.warn') {
            expression.replaceWithText('logger.warn');
            modified = true;
        } else if (text === 'console.error') {
            expression.replaceWithText('logger.error');
            modified = true;
        }
    });

    if (modified) {
        // Add import { logger } from '@/lib/logger'; if not present
        const hasLoggerImport = sourceFile.getImportDeclarations().some(imp =>
            imp.getModuleSpecifierValue() === '@/lib/logger' || imp.getModuleSpecifierValue() === '../lib/logger'
        );

        if (!hasLoggerImport && sourceFile.getFilePath().indexOf('src/lib/logger.ts') === -1) {
            sourceFile.addImportDeclaration({
                namedImports: ['logger'],
                moduleSpecifier: '@/lib/logger'
            });
        }

        sourceFile.saveSync();
        filesModified++;
        console.log(`Updated ${sourceFile.getFilePath()}`);
    }
});

console.log(`\nSuccessfully refactored ${filesModified} files.`);
