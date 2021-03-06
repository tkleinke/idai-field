import {Document} from 'idai-components-2';
import {Reader} from './reader';
import {Parser} from './parser';
import {ImportStrategy} from './import-strategy';
import {RelationsStrategy} from './relations-strategy';
import {RollbackStrategy} from './rollback-strategy';
import {ImportErrors} from './import-errors';


export interface ImportReport {

    errors: string[][],
    warnings: string[][],
    importedResourcesIds: string[]
}


/**
 * @author Thomas Kleinke
 * @author Daniel de Oliveira
 * @author Sebastian Cuy
 * @author Jan G. Wieners
 */
export module Import {

    /**
     * The importer uses the reader and parser, to get documents, which
     * are updated in the datastore if everything is ok.
     *
     * Returns a promise which resolves to an importReport object with detailed information about the import,
     * containing the number of resources imported successfully as well as information on errors that occurred,
     * if any.
     */
    export function go(reader: Reader,
              parser: Parser,
              importStrategy: ImportStrategy,
              relationsStrategy: RelationsStrategy,
              rollbackStrategy: RollbackStrategy): Promise<ImportReport> {

        return new Promise<ImportReport>(async resolve => {

            const importReport = {
                errors: [],
                warnings: [],
                importedResourcesIds: []
            };

            try {
                const [docsToUpdate, warnings] = await parseFileContent(
                    parser, await reader.go());
                importReport.warnings = warnings as never[];

                await update(docsToUpdate, importReport, importStrategy);

            } catch (msgWithParams) {

                importReport.errors.push(msgWithParams as never);
            }
            resolve(await finishImport(importReport, relationsStrategy, rollbackStrategy));
        });
    }


    async function finishImport(
        importReport: ImportReport,
        relationsStrategy: RelationsStrategy,
        rollbackStrategy: RollbackStrategy): Promise<ImportReport> {

        if (importReport.errors.length === 0) {

            try {

                await relationsStrategy.completeInverseRelations(importReport.importedResourcesIds);

            } catch (msgWithParams) {

                importReport.errors.push(msgWithParams);
                try {
                    await relationsStrategy.resetInverseRelations(importReport.importedResourcesIds)
                } catch (e) {
                    importReport.errors.push(msgWithParams);
                }
            }
        }

        if (importReport.errors.length !== 0) {

            try {
                await rollbackStrategy.rollback(importReport.importedResourcesIds);
            } catch (err) {
                console.error("rollback error", err);
                importReport.errors.push([ImportErrors.ROLLBACK_ERROR]);
            }
        }
        return importReport;
    }


    async function parseFileContent(
        parser: Parser,
        fileContent: string): Promise<[Document[],string[][]]> {

        const docsToUpdate: Document[] = [];
        await parser
            .parse(fileContent)
            .forEach((resultDocument: Document) => docsToUpdate.push(resultDocument));

        return [docsToUpdate, parser.getWarnings()];
    }


    async function update(
        docsToUpdate: Document[],
        importReport: ImportReport,
        importStrategy: ImportStrategy): Promise<void> {

        for (let docToUpdate of docsToUpdate) {
            if (importReport.errors.length !== 0) return;

            try {
                const importedDoc = await importStrategy.importDoc(docToUpdate);
                if (importedDoc) importReport.importedResourcesIds.push(importedDoc.resource.id);

            } catch (msgWithParams) {
                importReport.errors.push(msgWithParams);
            }
        }
    }
}