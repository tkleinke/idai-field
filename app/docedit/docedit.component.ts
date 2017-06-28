import {Component, TemplateRef, ViewChild} from '@angular/core';
import {DocumentEditChangeMonitor} from 'idai-components-2/documents';
import {Messages} from 'idai-components-2/messages';
import {DatastoreErrors} from 'idai-components-2/datastore';
import {ConfigLoader, ProjectConfiguration} from 'idai-components-2/configuration';
import {PersistenceManager, Validator} from 'idai-components-2/persist';
import {IdaiFieldDocument} from 'idai-components-2/idai-field-model';
import {M} from '../m';
import {NgbActiveModal, NgbModal, NgbModalRef} from '@ng-bootstrap/ng-bootstrap';
import {ConflictDeletedModalComponent} from './conflict-deleted-modal.component';
import {ConflictModalComponent} from './conflict-modal.component';
import {IdaiFieldDatastore} from '../datastore/idai-field-datastore';
import {SettingsService} from '../settings/settings-service';
import {ImageTypeUtility} from '../util/image-type-utility';
import {Imagestore} from '../imagestore/imagestore';

@Component({
    selector: 'detail-modal',
    moduleId: module.id,
    templateUrl: './docedit.html'
})

/**
 * Uses the document edit forms of idai-components-2 and adds styling
 * and navigation items like save and back buttons and modals
 * including the relevant functionality like validation,
 * persistence handling, conflict resolution etc.
 *
 * @author Daniel de Oliveira
 * @author Thomas Kleinke
 */
export class DoceditComponent {

    /**
     * The original unmodified version of the document
     */
    public document: IdaiFieldDocument;

    /**
     * Holds a cloned version of the <code>document</code> field,
     * on which changes can be made which can be either saved or discarded later.
     */
    private clonedDocument: IdaiFieldDocument;

    public recordingContext: String;

    public activeTab: string;

    @ViewChild('modalTemplate') public modalTemplate: TemplateRef<any>;
    public dialog: NgbModalRef;

    // used in template
    public showBackButton: boolean = true;

    private projectConfiguration: ProjectConfiguration;

    private projectImageTypes: any = {};

    /**
     * These are the revisions (of the cloned document as long as not saved)
     * that are conflict resolved. They will be be removed from document
     * as soon as it gets saved.
     */
    private inspectedRevisionsIds: string[];

    constructor(
        public activeModal: NgbActiveModal,
        private messages: Messages,
        private persistenceManager: PersistenceManager,
        private validator: Validator,
        private documentEditChangeMonitor: DocumentEditChangeMonitor,
        configLoader: ConfigLoader,
        private settingsService: SettingsService,
        private modalService: NgbModal,
        private datastore: IdaiFieldDatastore,
        private imagestore: Imagestore,
        private imageTypeUtility: ImageTypeUtility
    ) {
        this.imageTypeUtility.getProjectImageTypes().then(
            projectImageTypes => this.projectImageTypes = projectImageTypes
        );

        configLoader.getProjectConfiguration().then(projectConfiguration => {
            this.projectConfiguration = projectConfiguration;
        });
    }

    /**
     * @param document
     */
    public setDocument(document: IdaiFieldDocument) {
        if (!document) return;

        this.document = document;
        this.inspectedRevisionsIds = [];
        this.clonedDocument = DoceditComponent.cloneDocument(this.document);

        this.persistenceManager.setOldVersions([this.document]);
    }

    public setActiveTab(activeTabName: string) {
        this.activeTab = activeTabName;
    }

    /**
     * @param viaSaveButton if true, it is assumed the call for save came directly
     *   via a user interaction.
     */
    public save(viaSaveButton: boolean = false) {

        this.validator.validate(<IdaiFieldDocument> this.clonedDocument)
            .then(
                () => this.persistenceManager.persist(this.clonedDocument, this.settingsService.getUsername())
                    .then(
                        () => this.handleSaveSuccess(this.clonedDocument, viaSaveButton),
                        errorWithParams => this.handleSaveError(errorWithParams)
                    )
            )
            .catch(msgWithParams => this.messages.add(msgWithParams))
    }

    public showModal() {
        this.dialog = this.modalService.open(this.modalTemplate);
    }

    public openDeleteModal(modal) {

        this.modalService.open(modal).result.then(decision => {
            if (decision == 'delete') this.deleteDoc();
        });
    }

    public relDefs() {

        if (!this.projectConfiguration) return undefined;
        return this.projectConfiguration.getRelationDefinitions(
            this.document.resource.type, 'editable');
    }

    public cancel() {
        if (this.documentEditChangeMonitor.isChanged()) {
            this.showModal();
        } else {
            this.activeModal.dismiss('cancel');
        }
    }

    private setRecordingContextOf(doc:IdaiFieldDocument) {
        if (this.recordingContext) {
            doc.resource.relations['isRecordedIn'] = ['abc'];
        }
    }

    private handleSaveSuccess(clonedDocument, viaSaveButton) {
        this.removeInspectedRevisions(clonedDocument.resource.id)
            .then(
                doc => {
                    clonedDocument = doc;
                    this.documentEditChangeMonitor.reset();

                    this.activeModal.close({
                        document: clonedDocument,
                        viaSaveButton: viaSaveButton
                    });

                    this.messages.add([M.DOCEDIT_SAVE_SUCCESS])
                }
            ).catch(msgWithParams => {
                this.messages.add(msgWithParams);
            })
    }

    private handleSaveError(errorWithParams) {

        if (errorWithParams[0] == DatastoreErrors.SAVE_CONFLICT) {
            this.handleSaveConflict();
        } else if (errorWithParams[0] == DatastoreErrors.DOCUMENT_DOES_NOT_EXIST_ERROR) {
            this.handleDeletedConflict();
        } else {
            console.error(errorWithParams);
            return Promise.reject([M.DOCEDIT_SAVE_ERROR]);
        }
        return Promise.resolve(undefined);
    }

    /**
     * @param resourceId
     * @return {Promise<IdaiFieldDocument>} latest revision
     */
    private removeInspectedRevisions(resourceId): Promise<IdaiFieldDocument> {
        
        let promises = [];
        for (let revisionId of this.inspectedRevisionsIds) {
            promises.push(this.datastore.removeRevision(
                resourceId,
                revisionId));
        }
        this.inspectedRevisionsIds = [];

        return Promise.all(promises).then(()=>
            this.datastore.getLatestRevision(
                resourceId
            ))
    }

    private handleDeletedConflict() {

        this.modalService.open(
            ConflictDeletedModalComponent, {size: 'lg', windowClass: 'conflict-deleted-modal'}
        ).result.then(() => {
            this.makeClonedDocAppearNew();
        }).catch(() => {});
    }

    private makeClonedDocAppearNew() {
        // make the doc appear 'new' ...
        delete this.clonedDocument.resource.id; // ... for persistenceManager
        delete this.clonedDocument['_id'];      // ... for pouchdbdatastore
        delete this.clonedDocument['_rev'];
    }

    private handleSaveConflict() {

        this.modalService.open(
            ConflictModalComponent, {size: 'lg', windowClass: 'conflict-modal'}
        ).result.then(decision => {
            if (decision == 'overwrite') this.overwriteLatestRevision();
            else this.reloadLatestRevision();
        }).catch(() => {});
    }

    private overwriteLatestRevision() {

        this.datastore.getLatestRevision(this.clonedDocument.resource.id).then(latestRevision => {
            this.clonedDocument['_rev'] = latestRevision['_rev'];
            this.save(true);
        }).catch(() => this.messages.add([M.APP_GENERIC_SAVE_ERROR]));
    }

    private reloadLatestRevision() {

        this.datastore.getLatestRevision(this.clonedDocument.resource.id).then(latestRevision => {
            this.clonedDocument = <IdaiFieldDocument> latestRevision;
        }).catch(() => this.messages.add([M.APP_GENERIC_SAVE_ERROR]));
    }

    private deleteDoc() {

        this.removeImageTypeWithImageStore(this.document)
            .then(() => this.removeWithPersistenceManager(this.document))
            .then(() => {
                this.activeModal.dismiss('deleted');
                this.messages.add([M.DOCEDIT_DELETE_SUCCESS]);
            })
            .catch(err => {
                this.messages.add(err);
            });
    }

    private removeImageTypeWithImageStore(document) {
        return this.imageTypeUtility.isImageType(document.resource.type)
            .then(isImageType => {
                if (isImageType) {
                    return this.imagestore.remove(document.resource.identifier);
                } else {
                    return Promise.resolve();
                }
            })
    }

    private removeWithPersistenceManager(document) {

        return this.persistenceManager.remove(document)
            .catch(removeError => {
                if (removeError == DatastoreErrors.DOCUMENT_DOES_NOT_EXIST_ERROR) {
                    return Promise.resolve();
                } else {
                    return Promise.reject([M.DOCEDIT_DELETE_ERROR]);
                }
            });
    }

    private static cloneDocument(document: IdaiFieldDocument): IdaiFieldDocument {

        const clonedDoc = Object.assign({}, document);
        clonedDoc.resource = Object.assign({}, document.resource);

        return clonedDoc;
    }
}