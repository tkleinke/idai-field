import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Params, Router} from '@angular/router';
import {NgbModal} from '@ng-bootstrap/ng-bootstrap';
import {Document} from 'idai-components-2';
import {DoceditActiveTabService} from '../docedit/docedit-active-tab-service';
import {RoutingService} from '../routing-service';
import {DoceditComponent} from '../docedit/docedit.component';
import {IdaiField3DDocument} from '../../core/model/idai-field-3d-document';
import {IdaiField3DDocumentReadDatastore} from '../../core/datastore/idai-field-3d-document-read-datastore';
import {isEmpty} from 'tsfun';


@Component({
    moduleId: module.id,
    templateUrl: './view-3d.html'
})
/**
 * @author Thomas Kleinke
 */
export class View3DComponent implements OnInit {

    private document: IdaiField3DDocument;

    private activeTab: string;
    private comingFrom: Array<any>|undefined = undefined;

    public jumpToRelationTarget = (documentToJumpTo: Document) => this.routingService.jumpToRelationTarget(
        documentToJumpTo, 'media', true);


    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private modalService: NgbModal,
        private doceditActiveTabService: DoceditActiveTabService,
        private routingService: RoutingService,
        private datastore: IdaiField3DDocumentReadDatastore
    ) {
        this.route.queryParams.subscribe(queryParams => {
            if (queryParams['from']) this.comingFrom = queryParams['from'].split('/');
        });
    }


    async ngOnInit() {

        await this.fetchDocument();
    }


    public async deselect() {

        if (this.comingFrom) {
            await this.router.navigate(this.comingFrom);
        } else {
            await this.router.navigate(['media']);
        }
    }


    public async startEdit(tabName: string = 'fields') {

        this.doceditActiveTabService.setActiveTab(tabName);

        const doceditModalRef
            = this.modalService.open(DoceditComponent, { size: 'lg', backdrop: 'static' });
        const doceditModalComponent = doceditModalRef.componentInstance;
        doceditModalComponent.setDocument(this.document);

        try {
            const result = await doceditModalRef.result;
            if (result.document) this.document = result.document;
            this.setNextDocumentViewActiveTab();
        } catch (closeReason) {
            if (closeReason === 'deleted') await this.deselect();
        }
    }


    public hasRelations() {

        if (!this.document) return false;

        const relations: any = this.document.resource.relations;
        if (isEmpty(relations)) return false;

        return Object.keys(relations).filter(name => relations[name].length > 0).length > 0;
    }


    private async fetchDocument() {

        await this.getRouteParams(async (id: string, menu: string, tab?: string) => {

            try {
                this.document = await this.datastore.get(id);
            } catch(e) {
                console.error('Fatal error: Could not load document for id ', id);
            }

            if (menu === 'edit') {
                await this.startEdit(tab);
            } else if (tab) {
                this.activeTab = tab;
            }
        });
    }


    private setNextDocumentViewActiveTab() {

        const nextActiveTab = this.doceditActiveTabService.getActiveTab();
        if (['relations', 'fields'].indexOf(nextActiveTab) != -1) {
            this.activeTab = nextActiveTab;
        }
    }


    private async getRouteParams(callback: Function) {

        await this.route.params.forEach((params: Params) => {
            callback(params['id'], params['menu'], params['tab']);
        });
    }
}
