import {ReadDatastore, DocumentChange, Query} from 'idai-components-2/datastore';
import {Action, Document} from 'idai-components-2/core';
import {MainTypeDocumentsManager} from './main-type-documents-manager';
import {ViewManager} from './view-manager';
import {SettingsService} from '../../../core/settings/settings-service';
import {IdaiFieldDocument} from 'idai-components-2/idai-field-model';
import {ChangeHistoryUtil} from '../../../core/model/change-history-util';
import {IdaiFieldReadDatastore} from "../../../core/datastore/idai-field-read-datastore";

/**
 * @author Thomas Kleinke
 * @author Sebastian Cuy
 * @author Daniel de Oliveira
 */
export class DocumentsManager {

    public projectDocument: Document;
    private selectedDocument: Document|undefined;
    private documents: Array<Document>;
    private newDocumentsFromRemote: Array<Document> = [];


    constructor(
        private datastore: IdaiFieldReadDatastore,
        private settingsService: SettingsService,
        private viewManager: ViewManager,
        private operationTypeDocumentsManager: MainTypeDocumentsManager
    ) {

        datastore.documentChangesNotifications().subscribe(documentChange => {
            if (this.selectedDocument) this.handleChange(documentChange);
        });
    }


    public populateProjectDocument() {

        return this.datastore.get(this.settingsService.getSelectedProject() as any)
            .then(document => this.projectDocument = document)
            .catch(() => {console.log("cannot find project document");
                return Promise.reject(undefined)});
    }


    public getDocuments() {

        return this.documents;
    }


    public getSelectedDocument() {

        return this.selectedDocument;
    }


    public setQueryString(q: string): Promise<boolean> {

        this.viewManager.setQueryString(q);

        let result = true;
        if (!this.viewManager.isSelectedDocumentMatchedByQueryString(this.selectedDocument)) {
            result = false;
            this.deselect();
        }

        return this.populateDocumentList()
            .then(() => Promise.resolve(result));
    }


    public setQueryTypes(types: string[]): boolean {

        this.viewManager.setFilterTypes(types);

        let result = true;
        if (!this.viewManager.isSelectedDocumentTypeInTypeFilters(this.selectedDocument)) {
            result = false;
            this.deselect();
        }

        this.populateDocumentList();
        return result;
    }


    private removeFromListOfNewDocumentsFromRemote(document: Document) { // TODO make generic static method

        let index = this.newDocumentsFromRemote.indexOf(document);
        if (index > -1) this.newDocumentsFromRemote.splice(index, 1);
    }


    public deselect() {

        this.selectedDocument = undefined;
        this.removeEmptyDocuments();
    }


    public setSelectedById(resourceId: string) {

        return this.datastore.get(resourceId).then(
            document => {
                return this.setSelected(document);
            }
        );
    }


    public setSelected(documentToSelect: Document): Promise<any|undefined> {

        if (!this.viewManager.isInOverview() &&
                documentToSelect == this.operationTypeDocumentsManager.getSelectedDocument()) {
            return Promise.resolve(undefined);
        }

        if (documentToSelect == this.selectedDocument) return Promise.resolve(undefined);

        this.selectedDocument = documentToSelect;

        this.removeEmptyDocuments();
        if (documentToSelect && documentToSelect.resource && !documentToSelect.resource.id &&
            documentToSelect.resource.type != this.viewManager.getViewType()) {

            this.documents.unshift(documentToSelect);
        }

        if (this.isNewDocumentFromRemote(documentToSelect)) {
            this.removeFromListOfNewDocumentsFromRemote(documentToSelect);
        }

        const res1 = this.operationTypeDocumentsManager.
            selectLinkedOperationTypeDocumentForSelectedDocument(this.selectedDocument);
        const res2 = this.invalidateQuerySettingsIfNecessary();

        let promise = Promise.resolve();
        if (res1 || res2) promise = this.populateDocumentList();

        return promise;
    }


    private handleChange(documentChange: DocumentChange) {

        if (!documentChange || !documentChange.document) return;

        if (documentChange.type == 'deleted') {
            console.debug('unhandled deleted document');
            return;
        }

        const changedDocument: Document = documentChange.document;

        if (!this.documents || !DocumentsManager.isRemoteChange(changedDocument,
                this.settingsService.getUsername())) return;
        if (DocumentsManager.isExistingDoc(changedDocument, this.documents)) return;

        if (changedDocument.resource.type == this.viewManager.getViewType()) {
            return this.operationTypeDocumentsManager.populate();
        }

        let oldDocuments = this.documents;
        this.populateDocumentList().then(() => {
            for (let doc of this.documents) {
                if (oldDocuments.indexOf(doc) == -1 &&
                    DocumentsManager.isRemoteChange(doc, this.settingsService.getUsername())) {
                    this.newDocumentsFromRemote.push(doc);
                }
            }
        });
    }


    /**
     * Populates the document list with all documents from
     * the datastore which match a <code>query</code>
     */
    public populateDocumentList() {

        this.newDocumentsFromRemote = [];
        this.documents = [];

        let isRecordedInTarget;
        if (this.viewManager.isInOverview()) {
            isRecordedInTarget = this.projectDocument;
        } else {
            if (!this.operationTypeDocumentsManager.getSelectedDocument()) {
                return Promise.resolve();
            }
            isRecordedInTarget = this.operationTypeDocumentsManager.getSelectedDocument();
        }
        if (!isRecordedInTarget) return Promise.reject("no isRecordedInTarget in populate doc list");
        if (!isRecordedInTarget.resource.id) return Promise.reject("no id in populate doc list");

        return this.fetchDocuments(DocumentsManager.makeDocsQuery(
            {q: this.viewManager.getQueryString(), types: this.viewManager.getQueryTypes()},
                isRecordedInTarget.resource.id))
            .then(documents => this.documents = documents)
            .then(() => this.removeEmptyDocuments());
    }


    private removeEmptyDocuments() {

        if (!this.documents) return;

        for (let document of this.documents) {
            if (!document.resource.id) this.remove(document);
        }
    }


    public remove(document: Document) {

        this.documents.splice(this.documents.indexOf(document), 1);
    }


    public isNewDocumentFromRemote(document: Document): boolean {

        if (!document) return false;

        return this.newDocumentsFromRemote.indexOf(document) > -1;
    }


    /**
     * @returns {boolean} true if list needs to be reloaded afterwards
     */
    public invalidateQuerySettingsIfNecessary(): boolean {

        let result = false;
        if (!this.viewManager.isSelectedDocumentMatchedByQueryString(
                this.selectedDocument)) {
            this.viewManager.setQueryString('');
            result = true;
        }
        if (!this.viewManager.isSelectedDocumentTypeInTypeFilters(
                this.selectedDocument)) {
            this.viewManager.setFilterTypes([]);
            result = true;
        }
        return result;
    }


    private fetchDocuments(query: Query): Promise<any> {

        return this.datastore.find(query as any)
            .catch(errWithParams => DocumentsManager.handleFindErr(errWithParams, query));
    }


    private static isRemoteChange(changedDocument: Document, username: string): boolean {

        const latestAction: Action = ChangeHistoryUtil.getLastModified(changedDocument);
        return latestAction && latestAction.user != username;
    }


    private static handleFindErr(errWithParams: Array<string>, query: Query) {

        console.error('Error with find. Query:', query);
        if (errWithParams.length == 2) console.error('Error with find. Cause:', errWithParams[1]);
    }


    private static isExistingDoc(changedDocument: Document, documents: Array<Document>): boolean {

        for (let doc of documents) {
            if (!doc.resource || !changedDocument.resource) continue;
            if (!doc.resource.id || !changedDocument.resource.id) continue;
            if (doc.resource.id == changedDocument.resource.id) return true;
        }

        return false;
    }


    private static makeDocsQuery(query: Query, mainTypeDocumentResourceId: string): Query {

        const clonedQuery = JSON.parse(JSON.stringify(query));
        clonedQuery.constraints = { 'resource.relations.isRecordedIn': mainTypeDocumentResourceId };
        return clonedQuery;
    }
}